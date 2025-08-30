import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const milestoneInstanceSchema = z.object({
  milestoneId: z.string(),
  entityId: z.string(),
  entityType: z.enum(["STUDENT", "LEAD", "APPLICATION"]),
  inputs: z.any().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get("entityId")
    const entityType = searchParams.get("entityType")
    const milestoneId = searchParams.get("milestoneId")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "50")

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if automated milestones are enabled
    if (!agency.featureSettings?.automatedMilestones) {
      return NextResponse.json({ 
        error: "Automated milestones are not enabled for this agency" 
      }, { status: 403 })
    }

    const where: any = { agencyId: agency.id }
    
    if (entityId) where.entityId = entityId
    if (entityType) where.entityType = entityType
    if (milestoneId) where.milestoneId = milestoneId
    if (status) where.status = status

    const instances = await db.milestoneInstance.findMany({
      where,
      include: {
        milestone: true,
        student: entityType === "STUDENT",
        lead: entityType === "LEAD",
        application: entityType === "APPLICATION"
      },
      orderBy: { createdAt: "desc" },
      take: limit
    })

    // Parse JSON fields
    const processedInstances = instances.map(instance => ({
      ...instance,
      inputs: instance.inputs ? JSON.parse(instance.inputs) : [],
      outputs: instance.outputs ? JSON.parse(instance.outputs) : [],
      completionData: instance.completionData ? JSON.parse(instance.completionData) : []
    }))

    return NextResponse.json({ instances: processedInstances })
  } catch (error) {
    console.error("Error fetching milestone instances:", error)
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
    const validatedData = milestoneInstanceSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if automated milestones are enabled
    if (!agency.featureSettings?.automatedMilestones) {
      return NextResponse.json({ 
        error: "Automated milestones are not enabled for this agency" 
      }, { status: 403 })
    }

    // Verify milestone exists and belongs to agency
    const milestone = await db.milestone.findFirst({
      where: {
        id: validatedData.milestoneId,
        agencyId: agency.id
      }
    })

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 })
    }

    // Check if instance already exists for this entity and milestone
    const existingInstance = await db.milestoneInstance.findFirst({
      where: {
        agencyId: agency.id,
        milestoneId: validatedData.milestoneId,
        entityId: validatedData.entityId,
        entityType: validatedData.entityType,
        status: { in: ["PENDING", "IN_PROGRESS"] }
      }
    })

    if (existingInstance) {
      return NextResponse.json({ 
        error: "Active milestone instance already exists for this entity" 
      }, { status: 400 })
    }

    // Calculate due date based on SLA
    let dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
    if (!dueDate && milestone.slaDays) {
      dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + milestone.slaDays)
    }

    // Create milestone instance
    const instance = await db.milestoneInstance.create({
      data: {
        agencyId: agency.id,
        milestoneId: validatedData.milestoneId,
        entityId: validatedData.entityId,
        entityType: validatedData.entityType,
        inputs: validatedData.inputs ? JSON.stringify(validatedData.inputs) : null,
        dueDate,
        notes: validatedData.notes,
        slaDeadline: dueDate
      },
      include: {
        milestone: true,
        student: validatedData.entityType === "STUDENT",
        lead: validatedData.entityType === "LEAD",
        application: validatedData.entityType === "APPLICATION"
      }
    })

    // Trigger automated actions
    await triggerMilestoneActions(agency.id, instance, milestone)

    // Parse JSON fields for response
    const processedInstance = {
      ...instance,
      inputs: instance.inputs ? JSON.parse(instance.inputs) : [],
      outputs: instance.outputs ? JSON.parse(instance.outputs) : [],
      completionData: instance.completionData ? JSON.parse(instance.completionData) : []
    }

    return NextResponse.json(processedInstance)
  } catch (error) {
    console.error("Error creating milestone instance:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const { instanceId, action, data } = body

    if (!instanceId || !action) {
      return NextResponse.json({ 
        error: "Instance ID and action are required" 
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

    const instance = await db.milestoneInstance.findFirst({
      where: {
        id: instanceId,
        agencyId: agency.id
      },
      include: {
        milestone: true
      }
    })

    if (!instance) {
      return NextResponse.json({ error: "Milestone instance not found" }, { status: 404 })
    }

    switch (action) {
      case "UPDATE_PROGRESS":
        return await updateInstanceProgress(instance, data)
      case "COMPLETE":
        return await completeInstance(instance, data)
      case "CANCEL":
        return await cancelInstance(instance, data)
      case "EXTEND_DEADLINE":
        return await extendDeadline(instance, data)
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error updating milestone instance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper functions
async function triggerMilestoneActions(agencyId: string, instance: any, milestone: any) {
  try {
    const autoActions = milestone.autoActions ? JSON.parse(milestone.autoActions) : []
    const reminders = milestone.reminders ? JSON.parse(milestone.reminders) : []

    // Trigger auto-actions
    for (const action of autoActions) {
      await executeAutoAction(agencyId, instance, action)
    }

    // Schedule reminders
    for (const reminder of reminders) {
      await scheduleReminder(agencyId, instance, reminder)
    }

    console.log(`Triggered actions for milestone instance ${instance.id}`)
  } catch (error) {
    console.error("Error triggering milestone actions:", error)
  }
}

async function executeAutoAction(agencyId: string, instance: any, action: any) {
  switch (action.type) {
    case "SEND_NOTIFICATION":
      // Send notification logic
      console.log(`Sending notification for milestone ${instance.id}`)
      break
    case "CREATE_TASK":
      // Create task logic
      console.log(`Creating task for milestone ${instance.id}`)
      break
    case "SEND_EMAIL":
      // Send email logic
      console.log(`Sending email for milestone ${instance.id}`)
      break
    case "SEND_SMS":
      // Send SMS logic
      console.log(`Sending SMS for milestone ${instance.id}`)
      break
    case "UPDATE_JOURNEY":
      // Update journey stage
      console.log(`Updating journey for milestone ${instance.id}`)
      break
    default:
      console.log(`Unknown auto-action type: ${action.type}`)
  }
}

async function scheduleReminder(agencyId: string, instance: any, reminder: any) {
  // Schedule reminder logic
  console.log(`Scheduling reminder for milestone ${instance.id}`)
}

async function updateInstanceProgress(instance: any, data: any) {
  const { progress, inputs, userId } = data

  const updatedInstance = await db.milestoneInstance.update({
    where: { id: instance.id },
    data: {
      progress: progress || instance.progress,
      inputs: inputs ? JSON.stringify(inputs) : instance.inputs,
      status: progress >= 1.0 ? "COMPLETED" : "IN_PROGRESS"
    },
    include: {
      milestone: true,
      student: instance.entityType === "STUDENT",
      lead: instance.entityType === "LEAD",
      application: instance.entityType === "APPLICATION"
    }
  })

  return NextResponse.json({ success: true, instance: updatedInstance })
}

async function completeInstance(instance: any, data: any) {
  const { outputs, completedBy, completionData } = data

  const updatedInstance = await db.milestoneInstance.update({
    where: { id: instance.id },
    data: {
      status: "COMPLETED",
      progress: 1.0,
      completedAt: new Date(),
      completedBy: completedBy || "system",
      outputs: outputs ? JSON.stringify(outputs) : null,
      completionData: completionData ? JSON.stringify(completionData) : null
    },
    include: {
      milestone: true,
      student: instance.entityType === "STUDENT",
      lead: instance.entityType === "LEAD",
      application: instance.entityType === "APPLICATION"
    }
  })

  // Trigger completion actions
  await triggerCompletionActions(instance.agencyId, updatedInstance, instance.milestone)

  return NextResponse.json({ success: true, instance: updatedInstance })
}

async function cancelInstance(instance: any, data: any) {
  const { reason, userId } = data

  const updatedInstance = await db.milestoneInstance.update({
    where: { id: instance.id },
    data: {
      status: "CANCELLED",
      notes: reason
    },
    include: {
      milestone: true,
      student: instance.entityType === "STUDENT",
      lead: instance.entityType === "LEAD",
      application: instance.entityType === "APPLICATION"
    }
  })

  return NextResponse.json({ success: true, instance: updatedInstance })
}

async function extendDeadline(instance: any, data: any) {
  const { newDeadline, reason, userId } = data

  const updatedInstance = await db.milestoneInstance.update({
    where: { id: instance.id },
    data: {
      dueDate: new Date(newDeadline),
      slaDeadline: new Date(newDeadline),
      slaBreached: false,
      notes: reason
    },
    include: {
      milestone: true,
      student: instance.entityType === "STUDENT",
      lead: instance.entityType === "LEAD",
      application: instance.entityType === "APPLICATION"
    }
  })

  return NextResponse.json({ success: true, instance: updatedInstance })
}

async function triggerCompletionActions(agencyId: string, instance: any, milestone: any) {
  try {
    const autoActions = milestone.autoActions ? JSON.parse(milestone.autoActions) : []
    
    // Filter for completion actions
    const completionActions = autoActions.filter((action: any) => 
      action.trigger === "COMPLETION"
    )

    for (const action of completionActions) {
      await executeAutoAction(agencyId, instance, action)
    }

    console.log(`Triggered completion actions for milestone instance ${instance.id}`)
  } catch (error) {
    console.error("Error triggering completion actions:", error)
  }
}