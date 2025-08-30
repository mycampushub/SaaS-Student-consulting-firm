import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get("entityId")
    const entityType = searchParams.get("entityType")
    const pipelineId = searchParams.get("pipelineId")

    if (!entityId || !entityType) {
      return NextResponse.json({ 
        error: "Entity ID and type are required" 
      }, { status: 400 })
    }

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if visual progress tracker is enabled
    if (!agency.featureSettings?.visualProgressTracker) {
      return NextResponse.json({ 
        error: "Visual progress tracker is not enabled for this agency" 
      }, { status: 403 })
    }

    // Get pipeline entry
    const where: any = { 
      agencyId: agency.id,
      entityId,
      entityType 
    }

    if (pipelineId) {
      where.pipelineId = pipelineId
    }

    const pipelineEntry = await db.pipelineEntry.findFirst({
      where,
      include: {
        pipeline: true,
        student: entityType === "STUDENT",
        lead: entityType === "LEAD",
        application: entityType === "APPLICATION"
      }
    })

    if (!pipelineEntry) {
      return NextResponse.json({ error: "Pipeline entry not found" }, { status: 404 })
    }

    // Get journey events for this entry
    const events = await db.journeyEvent.findMany({
      where: {
        agencyId: agency.id,
        pipelineEntryId: pipelineEntry.id
      },
      orderBy: { createdAt: "desc" },
      take: 20
    })

    // Parse pipeline stages
    const stages = pipelineEntry.pipeline.stages ? JSON.parse(pipelineEntry.pipeline.stages) : []
    
    // Calculate progress and SLA information
    const progressData = calculateProgressData(pipelineEntry, stages, events)

    // Get recent activity
    const recentActivity = events.slice(0, 10).map(event => ({
      id: event.id,
      type: event.eventType,
      name: event.eventName,
      description: event.description,
      timestamp: event.createdAt,
      stage: event.toStage || event.fromStage,
      triggeredBy: event.triggeredBy,
      triggeredByType: event.triggeredByType
    }))

    return NextResponse.json({
      pipelineEntry: {
        id: pipelineEntry.id,
        currentStage: pipelineEntry.currentStage,
        previousStage: pipelineEntry.previousStage,
        stageStatus: pipelineEntry.stageStatus,
        progress: pipelineEntry.progress,
        percentageComplete: pipelineEntry.percentageComplete,
        enteredAt: pipelineEntry.enteredAt,
        estimatedCompletion: pipelineEntry.estimatedCompletion,
        slaDeadline: pipelineEntry.slaDeadline,
        slaBreached: pipelineEntry.slaBreached,
        notes: pipelineEntry.notes
      },
      pipeline: {
        id: pipelineEntry.pipeline.id,
        name: pipelineEntry.pipeline.name,
        description: pipelineEntry.pipeline.description,
        type: pipelineEntry.pipeline.type,
        enableSLA: pipelineEntry.pipeline.enableSLA,
        enableAutoActions: pipelineEntry.pipeline.enableAutoActions
      },
      stages: progressData.stages,
      progress: progressData.overallProgress,
      sla: progressData.sla,
      nextSteps: progressData.nextSteps,
      recentActivity,
      entity: pipelineEntry.student || pipelineEntry.lead || pipelineEntry.application
    })
  } catch (error) {
    console.error("Error fetching progress tracker:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const { entityId, entityType, pipelineId, action, data } = body

    if (!entityId || !entityType || !action) {
      return NextResponse.json({ 
        error: "Entity ID, type, and action are required" 
      }, { status: 400 })
    }

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if visual progress tracker is enabled
    if (!agency.featureSettings?.visualProgressTracker) {
      return NextResponse.json({ 
        error: "Visual progress tracker is not enabled for this agency" 
      }, { status: 403 })
    }

    switch (action) {
      case "MOVE_STAGE":
        return await moveStage(agency.id, entityId, entityType, data)
      case "UPDATE_PROGRESS":
        return await updateProgress(agency.id, entityId, entityType, data)
      case "ADD_NOTE":
        return await addNote(agency.id, entityId, entityType, data)
      case "MANUAL_OVERRIDE":
        return await manualOverride(agency.id, entityId, entityType, data)
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in progress tracker action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper functions
function calculateProgressData(pipelineEntry: any, stages: any[], events: any[]) {
  const currentStageIndex = stages.findIndex(s => s.id === pipelineEntry.currentStage)
  const totalStages = stages.length
  
  // Calculate overall progress
  let overallProgress = 0
  if (totalStages > 0) {
    overallProgress = ((currentStageIndex + 1) / totalStages) * 100
  }

  // Calculate stage-specific progress
  const processedStages = stages.map((stage, index) => {
    const isCompleted = index < currentStageIndex
    const isCurrent = index === currentStageIndex
    const isUpcoming = index > currentStageIndex
    
    // Calculate SLA for this stage
    const stageSLA = {
      deadline: null,
      daysRemaining: null,
      isOverdue: false,
      progress: isCompleted ? 100 : (isCurrent ? pipelineEntry.percentageComplete : 0)
    }

    if (isCurrent && pipelineEntry.slaDeadline) {
      const now = new Date()
      const deadline = new Date(pipelineEntry.slaDeadline)
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      stageSLA.deadline = pipelineEntry.slaDeadline
      stageSLA.daysRemaining = daysRemaining
      stageSLA.isOverdue = daysRemaining < 0
    }

    return {
      ...stage,
      status: isCompleted ? "COMPLETED" : (isCurrent ? pipelineEntry.stageStatus : "NOT_STARTED"),
      progress: stageSLA.progress,
      sla: stageSLA,
      isActive: isCurrent
    }
  })

  // Calculate SLA information
  const sla = {
    deadline: pipelineEntry.slaDeadline,
    isBreached: pipelineEntry.slaBreached,
    daysRemaining: pipelineEntry.slaDeadline ? 
      Math.ceil((new Date(pipelineEntry.slaDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
      null,
    totalDays: stages.reduce((sum, stage) => sum + (stage.duration || 0), 0)
  }

  // Determine next steps
  const nextSteps = []
  if (currentStageIndex < totalStages - 1) {
    const nextStage = stages[currentStageIndex + 1]
    nextSteps.push({
      stage: nextStage.name,
      description: nextStage.description,
      requirements: nextStage.requirements || [],
      estimatedDuration: nextStage.duration || 0
    })
  }

  return {
    overallProgress,
    stages: processedStages,
    sla,
    nextSteps
  }
}

async function moveStage(agencyId: string, entityId: string, entityType: string, data: any) {
  const { toStage, reason, userId } = data

  const pipelineEntry = await db.pipelineEntry.findFirst({
    where: {
      agencyId,
      entityId,
      entityType
    },
    include: {
      pipeline: true
    }
  })

  if (!pipelineEntry) {
    return NextResponse.json({ error: "Pipeline entry not found" }, { status: 404 })
  }

  // Update pipeline entry
  const updatedEntry = await db.pipelineEntry.update({
    where: { id: pipelineEntry.id },
    data: {
      currentStage: toStage,
      previousStage: pipelineEntry.currentStage,
      stageStatus: "IN_PROGRESS",
      movedBy: userId,
      moveReason: reason,
      movedAt: new Date()
    },
    include: {
      pipeline: true
    }
  })

  // Create journey event
  await db.journeyEvent.create({
    data: {
      agencyId,
      pipelineId: pipelineEntry.pipelineId,
      pipelineEntryId: pipelineEntry.id,
      eventType: "STAGE_CHANGED",
      eventName: "Stage Changed",
      description: reason || `Moved from ${pipelineEntry.currentStage} to ${toStage}`,
      fromStage: pipelineEntry.currentStage,
      toStage: toStage,
      entityId,
      entityType,
      triggeredBy: userId,
      triggeredByType: "USER"
    }
  })

  return NextResponse.json({ success: true, pipelineEntry: updatedEntry })
}

async function updateProgress(agencyId: string, entityId: string, entityType: string, data: any) {
  const { progress, percentageComplete } = data

  const pipelineEntry = await db.pipelineEntry.findFirst({
    where: {
      agencyId,
      entityId,
      entityType
    }
  })

  if (!pipelineEntry) {
    return NextResponse.json({ error: "Pipeline entry not found" }, { status: 404 })
  }

  const updatedEntry = await db.pipelineEntry.update({
    where: { id: pipelineEntry.id },
    data: {
      progress: progress || pipelineEntry.progress,
      percentageComplete: percentageComplete || pipelineEntry.percentageComplete
    }
  })

  return NextResponse.json({ success: true, pipelineEntry: updatedEntry })
}

async function addNote(agencyId: string, entityId: string, entityType: string, data: any) {
  const { note, userId } = data

  const pipelineEntry = await db.pipelineEntry.findFirst({
    where: {
      agencyId,
      entityId,
      entityType
    }
  })

  if (!pipelineEntry) {
    return NextResponse.json({ error: "Pipeline entry not found" }, { status: 404 })
  }

  const updatedEntry = await db.pipelineEntry.update({
    where: { id: pipelineEntry.id },
    data: {
      notes: note
    }
  })

  // Create journey event
  await db.journeyEvent.create({
    data: {
      agencyId,
      pipelineId: pipelineEntry.pipelineId,
      pipelineEntryId: pipelineEntry.id,
      eventType: "MANUAL_OVERRIDE",
      eventName: "Note Added",
      description: `Note added: ${note}`,
      entityId,
      entityType,
      triggeredBy: userId,
      triggeredByType: "USER"
    }
  })

  return NextResponse.json({ success: true, pipelineEntry: updatedEntry })
}

async function manualOverride(agencyId: string, entityId: string, entityType: string, data: any) {
  const { action, reason, userId, overrideData } = data

  const pipelineEntry = await db.pipelineEntry.findFirst({
    where: {
      agencyId,
      entityId,
      entityType
    }
  })

  if (!pipelineEntry) {
    return NextResponse.json({ error: "Pipeline entry not found" }, { status: 404 })
  }

  // Update pipeline entry based on override action
  const updateData: any = {}
  
  switch (action) {
    case "FAST_FORWARD":
      const stages = JSON.parse(pipelineEntry.pipeline.stages)
      const finalStage = stages[stages.length - 1]
      updateData.currentStage = finalStage.id
      updateData.stageStatus = "COMPLETED"
      updateData.percentageComplete = 100
      updateData.progress = 1.0
      break
    case "ROLLBACK":
      updateData.currentStage = overrideData.toStage
      updateData.stageStatus = "IN_PROGRESS"
      updateData.percentageComplete = overrideData.percentageComplete || 0
      break
    case "EXTEND_SLA":
      updateData.slaDeadline = overrideData.newDeadline
      updateData.slaBreached = false
      break
  }

  const updatedEntry = await db.pipelineEntry.update({
    where: { id: pipelineEntry.id },
    data: updateData
  })

  // Create journey event
  await db.journeyEvent.create({
    data: {
      agencyId,
      pipelineId: pipelineEntry.pipelineId,
      pipelineEntryId: pipelineEntry.id,
      eventType: "MANUAL_OVERRIDE",
      eventName: "Manual Override",
      description: `${action}: ${reason}`,
      entityId,
      entityType,
      triggeredBy: userId,
      triggeredByType: "USER",
      eventData: JSON.stringify({ action, overrideData })
    }
  })

  return NextResponse.json({ success: true, pipelineEntry: updatedEntry })
}