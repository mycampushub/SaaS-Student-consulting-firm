import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const moveEntrySchema = z.object({
  stageId: z.string(),
  reason: z.string().optional(),
  data: z.any().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = moveEntrySchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Get the pipeline entry
    const entry = await db.pipelineEntry.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      },
      include: {
        pipeline: true,
        student: true,
        lead: true,
        application: true
      }
    })

    if (!entry) {
      return NextResponse.json({ error: "Pipeline entry not found" }, { status: 404 })
    }

    // Get the pipeline stages
    const stages = JSON.parse(entry.pipeline.stages)
    
    // Find current stage and new stage
    const currentStage = stages.find((s: any) => s.id === entry.currentStage)
    const newStage = stages.find((s: any) => s.id === validatedData.stageId)

    if (!newStage) {
      return NextResponse.json({ error: "Target stage not found in pipeline" }, { status: 404 })
    }

    // Calculate progress
    const currentStageIndex = stages.findIndex((s: any) => s.id === entry.currentStage)
    const newStageIndex = stages.findIndex((s: any) => s.id === validatedData.stageId)
    const progress = newStageIndex / (stages.length - 1)

    // Update pipeline entry
    const updatedEntry = await db.pipelineEntry.update({
      where: { id: params.id },
      data: {
        previousStage: entry.currentStage,
        currentStage: validatedData.stageId,
        progress: Math.min(1.0, Math.max(0.0, progress)),
        data: validatedData.data ? JSON.stringify(validatedData.data) : entry.data,
        movedAt: new Date()
      },
      include: {
        pipeline: true,
        student: true,
        lead: true,
        application: true
      }
    })

    // Get the entity for automation
    const entity = entry.student || entry.lead || entry.application
    const entityType = entry.student ? "STUDENT" : entry.lead ? "LEAD" : "APPLICATION"

    // Execute stage automation
    await executeStageAutomation(
      entry.pipeline, 
      newStage, 
      { ...entity, __type: entityType }, 
      updatedEntry, 
      agency.id
    )

    // Create activity log
    await db.activityLog.create({
      data: {
        agencyId: agency.id,
        action: "PIPELINE_STAGE_CHANGED",
        entityType: "PIPELINE_ENTRY",
        entityId: params.id,
        changes: JSON.stringify({
          fromStage: currentStage?.name,
          toStage: newStage.name,
          reason: validatedData.reason,
          progress: progress
        })
      }
    })

    // Send notifications about stage change
    await sendStageChangeNotifications(entry, newStage, agency.id)

    return NextResponse.json({
      success: true,
      entry: updatedEntry,
      movement: {
        fromStage: currentStage?.name,
        toStage: newStage.name,
        reason: validatedData.reason,
        progress: progress,
        movedAt: updatedEntry.movedAt
      }
    })
  } catch (error) {
    console.error("Error moving pipeline entry:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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

// Helper function to send stage change notifications
async function sendStageChangeNotifications(entry: any, newStage: any, agencyId: string) {
  // Notify assigned consultant
  if (entry.student?.assignedTo || entry.lead?.assignedTo || entry.application?.assignedTo) {
    const assigneeId = entry.student?.assignedTo || entry.lead?.assignedTo || entry.application?.assignedTo
    
    await db.notification.create({
      data: {
        agencyId,
        type: "INFO",
        title: "Pipeline Stage Updated",
        message: `${getEntityName(entry)} has moved to ${newStage.name} stage`,
        recipientId: assigneeId,
        recipientType: "USER",
        channel: "IN_APP",
        status: "PENDING",
        priority: "MEDIUM",
        data: JSON.stringify({
          pipelineEntryId: entry.id,
          newStage: newStage.name,
          entityType: entry.student ? "STUDENT" : entry.lead ? "LEAD" : "APPLICATION",
          entityId: entry.student?.id || entry.lead?.id || entry.application?.id
        })
      }
    })
  }

  // Notify the student/lead if they have an account
  const userEmail = entry.student?.email || entry.lead?.email
  if (userEmail) {
    await db.notification.create({
      data: {
        agencyId,
        type: "SUCCESS",
        title: "Your Application Progress",
        message: `Great news! Your application has progressed to the ${newStage.name} stage`,
        recipientId: entry.student?.id || entry.lead?.id,
        recipientType: entry.student ? "STUDENT" : "LEAD",
        channel: "IN_APP",
        status: "PENDING",
        priority: "MEDIUM",
        data: JSON.stringify({
          pipelineEntryId: entry.id,
          newStage: newStage.name,
          progress: entry.progress
        })
      }
    })
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

function getEntityName(entry: any): string {
  if (entry.student) {
    return `${entry.student.firstName} ${entry.student.lastName}`
  } else if (entry.lead) {
    return `${entry.lead.firstName} ${entry.lead.lastName}`
  } else if (entry.application) {
    return `Application ${entry.application.id}`
  }
  return "Unknown"
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