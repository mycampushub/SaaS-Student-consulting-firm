import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const triggerSchema = z.object({
  name: z.string().min(1, "Trigger name is required"),
  description: z.string().optional(),
  type: z.enum(["EVENT_BASED", "TIME_BASED", "CONDITION_BASED", "WEBHOOK"]),
  eventType: z.enum([
    "LEAD_CREATED", "LEAD_UPDATED", "LEAD_DELETED",
    "STUDENT_CREATED", "STUDENT_UPDATED", "STUDENT_DELETED",
    "APPLICATION_CREATED", "APPLICATION_UPDATED", "APPLICATION_DELETED",
    "DOCUMENT_UPLOADED", "DOCUMENT_VERIFIED",
    "APPOINTMENT_CREATED", "APPOINTMENT_UPDATED", "APPOINTMENT_CANCELLED",
    "MESSAGE_RECEIVED", "MESSAGE_SENT",
    "CAMPAIGN_ENROLLED", "CAMPAIGN_COMPLETED",
    "TASK_CREATED", "TASK_COMPLETED", "TASK_OVERDUE",
    "PIPELINE_STAGE_CHANGED",
    "CUSTOM"
  ]),
  conditions: z.array(z.any()).optional(),
  actions: z.array(z.any()).min(1, "At least one action is required"),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  schedule: z.any().optional(),
  metadata: z.any().optional()
})

const updateTriggerSchema = triggerSchema.partial()

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const type = searchParams.get("type")
    const eventType = searchParams.get("eventType")
    const isActive = searchParams.get("isActive")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where: any = {
      agencyId: agency.id,
      ...(type && { type: type }),
      ...(eventType && { eventType: eventType }),
      ...(isActive !== null && { isActive: isActive === "true" })
    }

    const [triggers, total] = await Promise.all([
      db.automationTrigger.findMany({
        where,
        include: {
          executions: {
            orderBy: { executedAt: "desc" },
            take: 5
          }
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit
      }),
      db.automationTrigger.count({ where })
    ])

    // Parse JSON fields
    const processedTriggers = triggers.map(trigger => ({
      ...trigger,
      conditions: trigger.conditions ? JSON.parse(trigger.conditions) : [],
      actions: trigger.actions ? JSON.parse(trigger.actions) : [],
      schedule: trigger.schedule ? JSON.parse(trigger.schedule) : null,
      metadata: trigger.metadata ? JSON.parse(trigger.metadata) : null
    }))

    return NextResponse.json({
      triggers: processedTriggers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching triggers:", error)
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
    const validatedData = triggerSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Create trigger
    const trigger = await db.automationTrigger.create({
      data: {
        agencyId: agency.id,
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        eventType: validatedData.eventType,
        conditions: JSON.stringify(validatedData.conditions || []),
        actions: JSON.stringify(validatedData.actions),
        isActive: validatedData.isActive ?? true,
        priority: validatedData.priority || 50,
        schedule: validatedData.schedule ? JSON.stringify(validatedData.schedule) : null,
        metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null
      },
      include: {
        executions: {
          orderBy: { executedAt: "desc" },
          take: 5
        }
      }
    })

    // Parse JSON fields for response
    const processedTrigger = {
      ...trigger,
      conditions: trigger.conditions ? JSON.parse(trigger.conditions) : [],
      actions: trigger.actions ? JSON.parse(trigger.actions) : [],
      schedule: trigger.schedule ? JSON.parse(trigger.schedule) : null,
      metadata: trigger.metadata ? JSON.parse(trigger.metadata) : null
    }

    // If trigger is time-based and active, schedule it
    if (validatedData.type === "TIME_BASED" && validatedData.isActive) {
      await scheduleTimeBasedTrigger(trigger, agency.id)
    }

    return NextResponse.json(processedTrigger)
  } catch (error) {
    console.error("Error creating trigger:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to schedule time-based trigger
async function scheduleTimeBasedTrigger(trigger: any, agencyId: string) {
  try {
    const schedule = JSON.parse(trigger.schedule)
    
    if (schedule.type === "CRON") {
      // In a real implementation, you would integrate with a job scheduler
      // For now, we'll create a scheduled execution record
      await db.scheduledExecution.create({
        data: {
          agencyId: agencyId,
          triggerId: trigger.id,
          scheduledFor: calculateNextCronExecution(schedule.cronExpression),
          status: "SCHEDULED",
          data: JSON.stringify({
            type: "CRON",
            cronExpression: schedule.cronExpression
          })
        }
      })
    } else if (schedule.type === "INTERVAL") {
      const nextExecution = calculateNextIntervalExecution(schedule.interval, schedule.unit)
      
      await db.scheduledExecution.create({
        data: {
          agencyId: agencyId,
          triggerId: trigger.id,
          scheduledFor: nextExecution,
          status: "SCHEDULED",
          data: JSON.stringify({
            type: "INTERVAL",
            interval: schedule.interval,
            unit: schedule.unit
          })
        }
      })
    }
  } catch (error) {
    console.error("Error scheduling time-based trigger:", error)
  }
}

// Helper function to calculate next cron execution
function calculateNextCronExecution(cronExpression: string): Date {
  // In a real implementation, you would use a cron parser library
  // For now, we'll return a simple execution time
  const now = new Date()
  const nextExecution = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Next day
  return nextExecution
}

// Helper function to calculate next interval execution
function calculateNextIntervalExecution(interval: number, unit: string): Date {
  const now = new Date()
  const nextExecution = new Date(now)

  switch (unit) {
    case "MINUTES":
      nextExecution.setMinutes(nextExecution.getMinutes() + interval)
      break
    case "HOURS":
      nextExecution.setHours(nextExecution.getHours() + interval)
      break
    case "DAYS":
      nextExecution.setDate(nextExecution.getDate() + interval)
      break
    case "WEEKS":
      nextExecution.setDate(nextExecution.getDate() + (interval * 7))
      break
    case "MONTHS":
      nextExecution.setMonth(nextExecution.getMonth() + interval)
      break
  }

  return nextExecution
}

// Export function to handle trigger events (can be called from other API routes)
export async function handleTriggerEvent(
  eventType: string,
  entityId: string,
  entityType: string,
  data: any,
  agencyId: string
) {
  try {
    // Find active triggers for this event type
    const triggers = await db.automationTrigger.findMany({
      where: {
        agencyId: agencyId,
        eventType: eventType,
        isActive: true,
        type: {
          in: ["EVENT_BASED", "CONDITION_BASED"]
        }
      }
    })

    for (const trigger of triggers) {
      const conditions = JSON.parse(trigger.conditions || "[]")
      const actions = JSON.parse(trigger.actions)

      // Check if conditions are met
      const conditionsMet = await evaluateTriggerConditions(conditions, entityId, entityType, data, agencyId)
      
      if (conditionsMet) {
        // Execute trigger actions
        await executeTriggerActions(trigger, actions, entityId, entityType, data, agencyId)
      }
    }
  } catch (error) {
    console.error("Error handling trigger event:", error)
  }
}

// Helper function to evaluate trigger conditions
async function evaluateTriggerConditions(
  conditions: any[],
  entityId: string,
  entityType: string,
  data: any,
  agencyId: string
): Promise<boolean> {
  try {
    // Get the entity data
    let entity = null
    switch (entityType) {
      case "LEAD":
        entity = await db.lead.findFirst({
          where: { id: entityId, agencyId: agencyId }
        })
        break
      case "STUDENT":
        entity = await db.student.findFirst({
          where: { id: entityId, agencyId: agencyId }
        })
        break
      case "APPLICATION":
        entity = await db.application.findFirst({
          where: { id: entityId, agencyId: agencyId }
        })
        break
      case "DOCUMENT":
        entity = await db.document.findFirst({
          where: { id: entityId, agencyId: agencyId }
        })
        break
      case "APPOINTMENT":
        entity = await db.appointment.findFirst({
          where: { id: entityId, agencyId: agencyId }
        })
        break
      case "TASK":
        entity = await db.task.findFirst({
          where: { id: entityId, agencyId: agencyId }
        })
        break
    }

    if (!entity) {
      return false
    }

    // Evaluate each condition
    for (const condition of conditions) {
      const { field, operator, value } = condition
      
      let fieldValue = null
      
      // Get field value from entity or data
      if (field.startsWith("data.")) {
        fieldValue = data[field.substring(5)]
      } else {
        fieldValue = entity[field]
      }

      if (!evaluateConditionOperator(fieldValue, operator, value)) {
        return false
      }
    }

    return true
  } catch (error) {
    console.error("Error evaluating trigger conditions:", error)
    return false
  }
}

// Helper function to evaluate condition operator
function evaluateConditionOperator(fieldValue: any, operator: string, value: any): boolean {
  switch (operator) {
    case "equals":
      return fieldValue === value
    case "not_equals":
      return fieldValue !== value
    case "contains":
      return fieldValue && fieldValue.toString().includes(value)
    case "not_contains":
      return !fieldValue || !fieldValue.toString().includes(value)
    case "greater_than":
      return fieldValue > value
    case "less_than":
      return fieldValue < value
    case "greater_equal":
      return fieldValue >= value
    case "less_equal":
      return fieldValue <= value
    case "in":
      return Array.isArray(value) && value.includes(fieldValue)
    case "not_in":
      return Array.isArray(value) && !value.includes(fieldValue)
    case "exists":
      return fieldValue !== null && fieldValue !== undefined
    case "not_exists":
      return fieldValue === null || fieldValue === undefined
    default:
      return false
  }
}

// Helper function to execute trigger actions
async function executeTriggerActions(
  trigger: any,
  actions: any[],
  entityId: string,
  entityType: string,
  data: any,
  agencyId: string
) {
  try {
    // Create execution record
    const execution = await db.automationExecution.create({
      data: {
        agencyId: agencyId,
        triggerId: trigger.id,
        entityId,
        entityType,
        status: "RUNNING",
        data: JSON.stringify(data)
      }
    })

    let successCount = 0
    let errorCount = 0

    // Execute each action
    for (const action of actions) {
      try {
        await executeAction(action, entityId, entityType, data, agencyId)
        successCount++
      } catch (error) {
        console.error("Error executing action:", error)
        errorCount++
      }
    }

    // Update execution status
    await db.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: errorCount === 0 ? "COMPLETED" : "PARTIAL",
        successCount,
        errorCount,
        completedAt: new Date()
      }
    })
  } catch (error) {
    console.error("Error executing trigger actions:", error)
  }
}

// Helper function to execute individual action
async function executeAction(
  action: any,
  entityId: string,
  entityType: string,
  data: any,
  agencyId: string
) {
  switch (action.type) {
    case "SEND_NOTIFICATION":
      await executeSendNotificationAction(action, entityId, entityType, data, agencyId)
      break
    case "SEND_EMAIL":
      await executeSendEmailAction(action, entityId, entityType, data, agencyId)
      break
    case "SEND_SMS":
      await executeSendSmsAction(action, entityId, entityType, data, agencyId)
      break
    case "CREATE_TASK":
      await executeCreateTaskAction(action, entityId, entityType, data, agencyId)
      break
    case "UPDATE_ENTITY":
      await executeUpdateEntityAction(action, entityId, entityType, data, agencyId)
      break
    case "ENROLL_IN_CAMPAIGN":
      await executeEnrollInCampaignAction(action, entityId, entityType, data, agencyId)
      break
    case "WEBHOOK":
      await executeWebhookAction(action, entityId, entityType, data, agencyId)
      break
    case "CUSTOM":
      await executeCustomAction(action, entityId, entityType, data, agencyId)
      break
  }
}

// Action execution functions
async function executeSendNotificationAction(action: any, entityId: string, entityType: string, data: any, agencyId: string) {
  const recipient = await getEntityRecipient(entityId, entityType, agencyId)
  if (!recipient) return

  await db.notification.create({
    data: {
      agencyId,
      type: action.notificationType || "INFO",
      title: personalizeTemplate(action.title || "Automated Notification", data),
      message: personalizeTemplate(action.message || "", data),
      recipientId: recipient.id,
      recipientType: recipient.type,
      channel: action.channel || "IN_APP",
      status: "PENDING",
      priority: action.priority || "MEDIUM",
      data: JSON.stringify({
        automated: true,
        triggerType: "AUTOMATION",
        entityId,
        entityType
      })
    }
  })
}

async function executeSendEmailAction(action: any, entityId: string, entityType: string, data: any, agencyId: string) {
  const recipient = await getEntityRecipient(entityId, entityType, agencyId)
  if (!recipient || !recipient.email) return

  await db.emailMessage.create({
    data: {
      agencyId,
      to: recipient.email,
      subject: personalizeTemplate(action.subject || "Automated Email", data),
      body: personalizeTemplate(action.body || "", data),
      status: "SCHEDULED"
    }
  })
}

async function executeSendSmsAction(action: any, entityId: string, entityType: string, data: any, agencyId: string) {
  const recipient = await getEntityRecipient(entityId, entityType, agencyId)
  if (!recipient || !recipient.phone) return

  await db.smsMessage.create({
    data: {
      agencyId,
      to: recipient.phone,
      message: personalizeTemplate(action.message || "", data),
      status: "SCHEDULED"
    }
  })
}

async function executeCreateTaskAction(action: any, entityId: string, entityType: string, data: any, agencyId: string) {
  const recipient = await getEntityRecipient(entityId, entityType, agencyId)
  if (!recipient) return

  await db.task.create({
    data: {
      agencyId,
      title: personalizeTemplate(action.title || "Automated Task", data),
      description: personalizeTemplate(action.description || "", data),
      type: action.taskType || "GENERAL",
      category: "AUTOMATION",
      assignedTo: action.assignedTo || recipient.id,
      dueDate: action.dueDate ? new Date(action.dueDate) : calculateTaskDueDate(action),
      status: "PENDING",
      priority: action.priority || "MEDIUM",
      metadata: JSON.stringify({
        automated: true,
        triggerType: "AUTOMATION",
        entityId,
        entityType
      })
    }
  })
}

async function executeUpdateEntityAction(action: any, entityId: string, entityType: string, data: any, agencyId: string) {
  const updates: any = {}
  
  // Build update data from action
  for (const update of action.updates || []) {
    updates[update.field] = update.value
  }

  // Update the entity
  switch (entityType) {
    case "LEAD":
      await db.lead.update({
        where: { id: entityId, agencyId: agencyId },
        data: updates
      })
      break
    case "STUDENT":
      await db.student.update({
        where: { id: entityId, agencyId: agencyId },
        data: updates
      })
      break
    case "APPLICATION":
      await db.application.update({
        where: { id: entityId, agencyId: agencyId },
        data: updates
      })
      break
  }
}

async function executeEnrollInCampaignAction(action: any, entityId: string, entityType: string, data: any, agencyId: string) {
  // Check if campaign exists and belongs to agency
  const campaign = await db.campaign.findFirst({
    where: { id: action.campaignId, agencyId: agencyId }
  })

  if (!campaign) return

  // Check if already enrolled
  const existingEnrollment = await db.campaignEnrollment.findFirst({
    where: {
      campaignId: action.campaignId,
      studentId: entityType === "STUDENT" ? entityId : null,
      leadId: entityType === "LEAD" ? entityId : null
    }
  })

  if (existingEnrollment) return

  // Create enrollment
  await db.campaignEnrollment.create({
    data: {
      agencyId: agencyId,
      campaignId: action.campaignId,
      studentId: entityType === "STUDENT" ? entityId : null,
      leadId: entityType === "LEAD" ? entityId : null,
      status: "ACTIVE",
      currentStep: 0,
      enrolledAt: new Date()
    }
  })
}

async function executeWebhookAction(action: any, entityId: string, entityType: string, data: any, agencyId: string) {
  // In a real implementation, you would send an HTTP request to the webhook URL
  console.log(`Executing webhook: ${action.url}`, {
    entityId,
    entityType,
    data,
    agencyId
  })
}

async function executeCustomAction(action: any, entityId: string, entityType: string, data: any, agencyId: string) {
  // In a real implementation, you would execute custom logic
  console.log(`Executing custom action: ${action.name}`, {
    entityId,
    entityType,
    data,
    agencyId
  })
}

// Helper function to get entity recipient
async function getEntityRecipient(entityId: string, entityType: string, agencyId: string) {
  switch (entityType) {
    case "LEAD":
      const lead = await db.lead.findFirst({
        where: { id: entityId, agencyId: agencyId }
      })
      return lead ? { id: lead.id, type: "LEAD", email: lead.email, phone: lead.phone } : null
    case "STUDENT":
      const student = await db.student.findFirst({
        where: { id: entityId, agencyId: agencyId }
      })
      return student ? { id: student.id, type: "STUDENT", email: student.email, phone: student.phone } : null
    case "APPLICATION":
      const application = await db.application.findFirst({
        where: { id: entityId, agencyId: agencyId },
        include: { student: true }
      })
      return application?.student ? { 
        id: application.student.id, 
        type: "STUDENT", 
        email: application.student.email, 
        phone: application.student.phone 
      } : null
    default:
      return null
  }
}

// Helper function to personalize template
function personalizeTemplate(template: string, data: any): string {
  let personalized = template
  
  // Replace common placeholders
  Object.keys(data).forEach(key => {
    const value = data[key]
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    
    if (value !== null && value !== undefined) {
      if (value instanceof Date) {
        personalized = personalized.replace(regex, value.toLocaleString())
      } else {
        personalized = personalized.replace(regex, String(value))
      }
    } else {
      personalized = personalized.replace(regex, '')
    }
  })
  
  return personalized
}

// Helper function to calculate task due date
function calculateTaskDueDate(action: any): Date {
  const now = new Date()
  const delay = action.delay || 1
  const unit = action.delayUnit || "DAYS"

  switch (unit) {
    case "MINUTES":
      return new Date(now.getTime() + delay * 60 * 1000)
    case "HOURS":
      return new Date(now.getTime() + delay * 60 * 60 * 1000)
    case "DAYS":
      return new Date(now.getTime() + delay * 24 * 60 * 60 * 1000)
    case "WEEKS":
      return new Date(now.getTime() + delay * 7 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000) // Default 1 day
  }
}