import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const pipelineEntrySchema = z.object({
  pipelineId: z.string(),
  entityId: z.string(),
  entityType: z.enum(["STUDENT", "LEAD", "APPLICATION"]),
  currentStage: z.string(),
  data: z.any().optional()
})

const moveEntrySchema = z.object({
  stageId: z.string(),
  reason: z.string().optional(),
  data: z.any().optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const pipelineId = searchParams.get("pipelineId")
    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")
    const currentStage = searchParams.get("currentStage")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where = {
      agencyId: agency.id,
      ...(pipelineId && { pipelineId: pipelineId }),
      ...(entityType && { entityType: entityType }),
      ...(entityId && { entityId: entityId }),
      ...(currentStage && { currentStage: currentStage })
    }

    const [entries, total] = await Promise.all([
      db.pipelineEntry.findMany({
        where,
        include: {
          pipeline: true,
          student: true,
          lead: true,
          application: true
        },
        orderBy: { enteredAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.pipelineEntry.count({ where })
    ])

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching pipeline entries:", error)
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
    const validatedData = pipelineEntrySchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Validate pipeline exists and belongs to agency
    const pipeline = await db.pipeline.findFirst({
      where: {
        id: validatedData.pipelineId,
        agencyId: agency.id
      }
    })

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    // Validate entity exists and belongs to agency
    const entity = await getEntity(validatedData.entityType, validatedData.entityId, agency.id)
    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 })
    }

    // Check if entity is already in this pipeline
    const existingEntry = await db.pipelineEntry.findFirst({
      where: {
        pipelineId: validatedData.pipelineId,
        entityId: validatedData.entityId,
        entityType: validatedData.entityType
      }
    })

    if (existingEntry) {
      return NextResponse.json({ error: "Entity is already in this pipeline" }, { status: 400 })
    }

    // Validate stage exists in pipeline
    const stages = JSON.parse(pipeline.stages)
    const stage = stages.find((s: any) => s.id === validatedData.currentStage)
    if (!stage) {
      return NextResponse.json({ error: "Stage not found in pipeline" }, { status: 400 })
    }

    // Create pipeline entry
    const entry = await db.pipelineEntry.create({
      data: {
        agencyId: agency.id,
        pipelineId: validatedData.pipelineId,
        entityId: validatedData.entityId,
        entityType: validatedData.entityType,
        currentStage: validatedData.currentStage,
        progress: 0.0,
        data: validatedData.data ? JSON.stringify(validatedData.data) : null
      },
      include: {
        pipeline: true,
        student: true,
        lead: true,
        application: true
      }
    })

    // Execute stage automation
    await executeStageAutomation(pipeline, stage, entity, entry, agency.id)

    return NextResponse.json(entry)
  } catch (error) {
    console.error("Error creating pipeline entry:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get entity
async function getEntity(entityType: string, entityId: string, agencyId: string) {
  switch (entityType) {
    case "STUDENT":
      return await db.student.findFirst({
        where: { id: entityId, agencyId: agencyId }
      })
    case "LEAD":
      return await db.lead.findFirst({
        where: { id: entityId, agencyId: agencyId }
      })
    case "APPLICATION":
      return await db.application.findFirst({
        where: { id: entityId, agencyId: agencyId }
      })
    default:
      return null
  }
}

// Helper function to execute stage automation
async function executeStageAutomation(pipeline: any, stage: any, entity: any, entry: any, agencyId: string) {
  if (!stage.automation) return

  const automation = stage.automation
  
  try {
    // Create tasks based on automation rules
    if (automation.tasks) {
      for (const taskConfig of automation.tasks) {
        await db.task.create({
          data: {
            agencyId,
            title: taskConfig.title || `Pipeline Task: ${stage.name}`,
            description: taskConfig.description || `Automated task for ${stage.name} stage`,
            type: taskConfig.type || "GENERAL",
            category: taskConfig.category || "PIPELINE",
            
            // Assignment
            assignedTo: taskConfig.assignedTo || getEntityAssignee(entity),
            
            // Context
            studentId: entity.id.includes("student") ? entity.id : undefined,
            leadId: entity.id.includes("lead") ? entity.id : undefined,
            applicationId: entity.id.includes("application") ? entity.id : undefined,
            
            // Scheduling
            dueDate: taskConfig.dueDate ? new Date(taskConfig.dueDate) : calculateStageDueDate(stage),
            
            // Status and priority
            status: "PENDING",
            priority: taskConfig.priority || "MEDIUM",
            
            // Metadata
            metadata: JSON.stringify({
              pipelineGenerated: true,
              pipelineId: pipeline.id,
              pipelineEntryId: entry.id,
              stageId: stage.id,
              stageName: stage.name,
              entityType: entity.__type,
              entityId: entity.id
            })
          }
        })
      }
    }

    // Send notifications based on automation rules
    if (automation.notifications) {
      for (const notificationConfig of automation.notifications) {
        await db.notification.create({
          data: {
            agencyId,
            type: notificationConfig.type || "INFO",
            title: notificationConfig.title || `Pipeline Update: ${stage.name}`,
            message: notificationConfig.message || `Entity has moved to ${stage.name} stage`,
            
            // Recipient
            recipientId: notificationConfig.recipientId || getEntityAssignee(entity),
            recipientType: "USER",
            
            // Channel
            channel: notificationConfig.channel || "IN_APP",
            
            // Status
            status: "PENDING",
            priority: notificationConfig.priority || "MEDIUM",
            
            // Content
            data: JSON.stringify({
              pipelineGenerated: true,
              pipelineId: pipeline.id,
              pipelineEntryId: entry.id,
              stageId: stage.id,
              stageName: stage.name,
              entityType: entity.__type,
              entityId: entity.id
            })
          }
        })
      }
    }

    // Send emails based on automation rules
    if (automation.emails) {
      for (const emailConfig of automation.emails) {
        const emailMessage = await db.emailMessage.create({
          data: {
            agencyId,
            to: getEmailFromEntity(entity),
            subject: personalizeTemplate(emailConfig.subject, entity, stage),
            body: personalizeTemplate(emailConfig.body, entity, stage),
            status: "SCHEDULED",
            
            // References
            studentId: entity.id.includes("student") ? entity.id : undefined,
            leadId: entity.id.includes("lead") ? entity.id : undefined
          }
        })

        // In a real implementation, you would send the actual email here
        await db.emailMessage.update({
          where: { id: emailMessage.id },
          data: {
            status: "SENT",
            sentAt: new Date()
          }
        })
      }
    }

    // Send SMS based on automation rules
    if (automation.sms) {
      for (const smsConfig of automation.sms) {
        const smsMessage = await db.smsMessage.create({
          data: {
            agencyId,
            to: getPhoneFromEntity(entity),
            message: personalizeTemplate(smsConfig.message, entity, stage),
            status: "SCHEDULED",
            
            // References
            studentId: entity.id.includes("student") ? entity.id : undefined,
            leadId: entity.id.includes("lead") ? entity.id : undefined
          }
        })

        // In a real implementation, you would send the actual SMS here
        await db.smsMessage.update({
          where: { id: smsMessage.id },
          data: {
            status: "SENT",
            sentAt: new Date()
          }
        })
      }
    }

    // Update entity based on automation rules
    if (automation.entityUpdates) {
      for (const update of automation.entityUpdates) {
        await updateEntityStage(entity, update, agencyId)
      }
    }

  } catch (error) {
    console.error("Error executing stage automation:", error)
  }
}

// Helper functions
function getEntityAssignee(entity: any): string | undefined {
  return entity.assignedTo || entity.consultantId
}

function getEmailFromEntity(entity: any): string {
  return entity.email || ""
}

function getPhoneFromEntity(entity: any): string {
  return entity.phone || ""
}

function calculateStageDueDate(stage: any): Date {
  const now = new Date()
  const duration = stage.duration || 7 // Default 7 days
  return new Date(now.getTime() + duration * 24 * 60 * 60 * 1000)
}

function personalizeTemplate(template: string, entity: any, stage?: any): string {
  let personalized = template
    .replace(/\{\{firstName\}\}/g, entity.firstName || "")
    .replace(/\{\{lastName\}\}/g, entity.lastName || "")
    .replace(/\{\{email\}\}/g, entity.email || "")
    .replace(/\{\{phone\}\}/g, entity.phone || "")
    .replace(/\{\{status\}\}/g, entity.status || "")
  
  if (stage) {
    personalized = personalized
      .replace(/\{\{stageName\}\}/g, stage.name || "")
      .replace(/\{\{stageDescription\}\}/g, stage.description || "")
  }
  
  return personalized
}

async function updateEntityStage(entity: any, update: any, agencyId: string) {
  switch (entity.__type) {
    case "STUDENT":
      await db.student.update({
        where: { id: entity.id, agencyId: agencyId },
        data: update
      })
      break
    case "LEAD":
      await db.lead.update({
        where: { id: entity.id, agencyId: agencyId },
        data: update
      })
      break
    case "APPLICATION":
      await db.application.update({
        where: { id: entity.id, agencyId: agencyId },
        data: update
      })
      break
  }
}