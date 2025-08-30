import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const workflowTriggerSchema = z.object({
  workflowId: z.string(),
  entityType: z.enum(["LEAD", "STUDENT", "APPLICATION", "TASK", "APPOINTMENT"]),
  entityId: z.string(),
  eventData: z.any().optional()
})

const timeBasedTriggerSchema = z.object({
  workflowId: z.string(),
  triggerType: z.enum(["TIME_DELAY", "SCHEDULED", "RECURRING", "DEADLINE"]),
  schedule: z.object({
    delay: z.number().optional(), // in minutes
    time: z.string().optional(), // HH:MM format
    date: z.string().optional(), // ISO date string
    recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
    timezone: z.string().default("UTC")
  }),
  conditions: z.array(z.any()).optional(),
  context: z.any().optional()
})

export async function POST(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    
    // Check if this is an immediate trigger or time-based trigger
    if (body.triggerType) {
      const validatedData = timeBasedTriggerSchema.parse(body)
      return await handleTimeBasedTrigger(subdomain, validatedData)
    } else {
      const validatedData = workflowTriggerSchema.parse(body)
      return await handleImmediateTrigger(subdomain, validatedData)
    }
  } catch (error) {
    console.error("Error in workflow automation:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handleImmediateTrigger(subdomain: string, data: any) {
  const agency = await db.agency.findUnique({
    where: { subdomain }
  })

  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 })
  }

  // Get the workflow
  const workflow = await db.workflow.findFirst({
    where: {
      id: data.workflowId,
      agencyId: agency.id,
      isActive: true
    }
  })

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found or inactive" }, { status: 404 })
  }

  // Get the entity
  const entity = await getEntity(data.entityType, data.entityId, agency.id)
  if (!entity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 })
  }

  // Check if workflow triggers match the event
  const triggers = JSON.parse(workflow.triggers)
  const matchingTrigger = triggers.find((trigger: any) => 
    trigger.entityType === data.entityType && 
    trigger.eventType === data.eventData?.eventType
  )

  if (!matchingTrigger) {
    return NextResponse.json({ error: "No matching trigger found" }, { status: 400 })
  }

  // Execute workflow
  const executionResult = await executeWorkflow(workflow, entity, data.eventData)

  return NextResponse.json({
    success: true,
    workflowId: workflow.id,
    workflowName: workflow.name,
    executionResult,
    executedAt: new Date().toISOString()
  })
}

async function handleTimeBasedTrigger(subdomain: string, data: any) {
  const agency = await db.agency.findUnique({
    where: { subdomain }
  })

  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 })
  }

  // Get the workflow
  const workflow = await db.workflow.findFirst({
    where: {
      id: data.workflowId,
      agencyId: agency.id,
      isActive: true
    }
  })

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found or inactive" }, { status: 404 })
  }

  // Schedule the time-based trigger
  const scheduledTrigger = await scheduleTimeBasedTrigger(workflow, data)

  return NextResponse.json({
    success: true,
    workflowId: workflow.id,
    workflowName: workflow.name,
    scheduledTrigger,
    scheduledAt: new Date().toISOString()
  })
}

async function executeWorkflow(workflow: any, entity: any, eventData?: any) {
  const nodes = JSON.parse(workflow.nodes)
  const edges = JSON.parse(workflow.edges)
  
  const results = {
    executedNodes: [],
    createdTasks: [],
    sentNotifications: [],
    updatedEntities: [],
    errors: []
  }

  try {
    // Find starting nodes (nodes with no incoming edges)
    const startNodes = nodes.filter((node: any) => 
      !edges.some((edge: any) => edge.target === node.id)
    )

    // Execute each starting node
    for (const node of startNodes) {
      const nodeResult = await executeNode(node, entity, eventData, workflow.agencyId)
      results.executedNodes.push(nodeResult)
      
      if (nodeResult.success) {
        results.createdTasks.push(...nodeResult.createdTasks)
        results.sentNotifications.push(...nodeResult.sentNotifications)
        results.updatedEntities.push(...nodeResult.updatedEntities)
      } else {
        results.errors.push(nodeResult.error)
      }
    }

    // Update workflow execution count
    await db.workflow.update({
      where: { id: workflow.id },
      data: {
        executionCount: workflow.executionCount + 1,
        lastExecutedAt: new Date()
      }
    })

    return results
  } catch (error) {
    console.error("Error executing workflow:", error)
    return {
      ...results,
      errors: [...results.errors, error.message]
    }
  }
}

async function executeNode(node: any, entity: any, eventData: any, agencyId: string) {
  const result = {
    nodeId: node.id,
    nodeName: node.data?.label || "Unknown",
    success: false,
    createdTasks: [],
    sentNotifications: [],
    updatedEntities: [],
    error: null
  }

  try {
    switch (node.type) {
      case "task":
        const taskResult = await createTaskFromNode(node, entity, agencyId)
        result.createdTasks.push(taskResult)
        break

      case "notification":
        const notificationResult = await createNotificationFromNode(node, entity, agencyId)
        result.sentNotifications.push(notificationResult)
        break

      case "email":
        const emailResult = await sendEmailFromNode(node, entity, agencyId)
        result.sentNotifications.push(emailResult)
        break

      case "sms":
        const smsResult = await sendSmsFromNode(node, entity, agencyId)
        result.sentNotifications.push(smsResult)
        break

      case "update_entity":
        const updateResult = await updateEntityFromNode(node, entity, agencyId)
        result.updatedEntities.push(updateResult)
        break

      case "delay":
        // Handle delay node (would need to be scheduled)
        console.log("Delay node executed - would schedule next steps")
        break

      case "condition":
        // Handle condition node
        const conditionResult = await evaluateConditionNode(node, entity, eventData)
        if (conditionResult.passed) {
          // Execute true path nodes
          const truePathNodes = getConnectedNodes(node.id, "true")
          for (const connectedNode of truePathNodes) {
            const connectedResult = await executeNode(connectedNode, entity, eventData, agencyId)
            result.createdTasks.push(...connectedResult.createdTasks)
            result.sentNotifications.push(...connectedResult.sentNotifications)
            result.updatedEntities.push(...connectedResult.updatedEntities)
          }
        }
        break

      default:
        throw new Error(`Unknown node type: ${node.type}`)
    }

    result.success = true
  } catch (error) {
    console.error(`Error executing node ${node.id}:`, error)
    result.error = error.message
  }

  return result
}

async function createTaskFromNode(node: any, entity: any, agencyId: string) {
  const taskData = node.data?.config || {}
  
  const task = await db.task.create({
    data: {
      agencyId,
      title: taskData.title || "Automated Task",
      description: taskData.description || "Created by workflow automation",
      type: taskData.type || "GENERAL",
      category: taskData.category || "AUTOMATION",
      
      // Assignment
      assignedTo: taskData.assignedTo || getEntityAssignee(entity),
      
      // Context
      studentId: entity.id.includes("student") ? entity.id : undefined,
      leadId: entity.id.includes("lead") ? entity.id : undefined,
      applicationId: entity.id.includes("application") ? entity.id : undefined,
      
      // Scheduling
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : getDefaultDueDate(taskData.priority),
      
      // Status and priority
      status: "PENDING",
      priority: taskData.priority || "MEDIUM",
      
      // Metadata
      metadata: JSON.stringify({
        workflowGenerated: true,
        nodeId: node.id,
        entityType: entity.__type,
        entityId: entity.id
      })
    }
  })

  return task
}

async function createNotificationFromNode(node: any, entity: any, agencyId: string) {
  const notificationData = node.data?.config || {}
  
  const notification = await db.notification.create({
    data: {
      agencyId,
      type: notificationData.type || "INFO",
      title: notificationData.title || "Workflow Notification",
      message: notificationData.message || "Automated notification from workflow",
      
      // Recipient
      recipientId: notificationData.recipientId || getEntityAssignee(entity),
      recipientType: "USER",
      
      // Channel
      channel: notificationData.channel || "IN_APP",
      
      // Status
      status: "PENDING",
      priority: notificationData.priority || "MEDIUM",
      
      // Content
      data: JSON.stringify({
        workflowGenerated: true,
        nodeId: node.id,
        entityType: entity.__type,
        entityId: entity.id,
        customData: notificationData.customData
      })
    }
  })

  return notification
}

async function sendEmailFromNode(node: any, entity: any, agencyId: string) {
  const emailData = node.data?.config || {}
  
  // Create email message record
  const emailMessage = await db.emailMessage.create({
    data: {
      agencyId,
      to: getEmailFromEntity(entity),
      subject: personalizeTemplate(emailData.subject, entity),
      body: personalizeTemplate(emailData.body, entity),
      status: "SCHEDULED",
      
      // References
      studentId: entity.id.includes("student") ? entity.id : undefined,
      leadId: entity.id.includes("lead") ? entity.id : undefined
    }
  })

  // In a real implementation, you would send the actual email here
  // For now, we'll just mark it as sent
  await db.emailMessage.update({
    where: { id: emailMessage.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })

  return emailMessage
}

async function sendSmsFromNode(node: any, entity: any, agencyId: string) {
  const smsData = node.data?.config || {}
  
  // Create SMS message record
  const smsMessage = await db.smsMessage.create({
    data: {
      agencyId,
      to: getPhoneFromEntity(entity),
      message: personalizeTemplate(smsData.message, entity),
      status: "SCHEDULED",
      
      // References
      studentId: entity.id.includes("student") ? entity.id : undefined,
      leadId: entity.id.includes("lead") ? entity.id : undefined
    }
  })

  // In a real implementation, you would send the actual SMS here
  // For now, we'll just mark it as sent
  await db.smsMessage.update({
    where: { id: smsMessage.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })

  return smsMessage
}

async function updateEntityFromNode(node: any, entity: any, agencyId: string) {
  const updateData = node.data?.config?.updates || {}
  
  let updatedEntity = null
  
  switch (entity.__type) {
    case "LEAD":
      updatedEntity = await db.lead.update({
        where: { id: entity.id },
        data: updateData
      })
      break
      
    case "STUDENT":
      updatedEntity = await db.student.update({
        where: { id: entity.id },
        data: updateData
      })
      break
      
    case "APPLICATION":
      updatedEntity = await db.application.update({
        where: { id: entity.id },
        data: updateData
      })
      break
  }
  
  return updatedEntity
}

async function evaluateConditionNode(node: any, entity: any, eventData: any) {
  const conditions = node.data?.config?.conditions || []
  
  // Simple condition evaluation (would be more complex in real implementation)
  let passed = true
  
  for (const condition of conditions) {
    const { field, operator, value } = condition
    const fieldValue = getFieldValue(entity, field)
    
    if (!evaluateOperator(fieldValue, operator, value)) {
      passed = false
      break
    }
  }
  
  return { passed }
}

async function scheduleTimeBasedTrigger(workflow: any, data: any) {
  // In a real implementation, you would store this in a scheduled jobs table
  // For now, we'll just return the scheduling information
  
  let scheduledTime = null
  
  switch (data.triggerType) {
    case "TIME_DELAY":
      scheduledTime = new Date(Date.now() + (data.schedule.delay * 60 * 1000))
      break
      
    case "SCHEDULED":
      if (data.schedule.date && data.schedule.time) {
        const [hours, minutes] = data.schedule.time.split(':')
        const scheduledDate = new Date(data.schedule.date)
        scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        scheduledTime = scheduledDate
      }
      break
      
    case "RECURRING":
      // Calculate next occurrence based on recurrence
      scheduledTime = calculateNextRecurrence(data.schedule)
      break
      
    case "DEADLINE":
      if (data.schedule.date && data.schedule.time) {
        const [hours, minutes] = data.schedule.time.split(':')
        const deadlineDate = new Date(data.schedule.date)
        deadlineDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        scheduledTime = deadlineDate
      }
      break
  }
  
  return {
    id: `scheduled_${Date.now()}`,
    workflowId: workflow.id,
    triggerType: data.triggerType,
    scheduledTime,
    status: "SCHEDULED"
  }
}

// Helper functions
async function getEntity(entityType: string, entityId: string, agencyId: string) {
  switch (entityType) {
    case "LEAD":
      return await db.lead.findFirst({
        where: { id: entityId, agencyId }
      })
    case "STUDENT":
      return await db.student.findFirst({
        where: { id: entityId, agencyId }
      })
    case "APPLICATION":
      return await db.application.findFirst({
        where: { id: entityId, agencyId }
      })
    case "TASK":
      return await db.task.findFirst({
        where: { id: entityId, agencyId }
      })
    case "APPOINTMENT":
      return await db.appointment.findFirst({
        where: { id: entityId, agencyId }
      })
    default:
      return null
  }
}

function getEntityAssignee(entity: any): string | undefined {
  return entity.assignedTo || entity.consultantId
}

function getEmailFromEntity(entity: any): string {
  return entity.email || ""
}

function getPhoneFromEntity(entity: any): string {
  return entity.phone || ""
}

function getDefaultDueDate(priority: string): Date {
  const now = new Date()
  const hours = {
    "LOW": 72,
    "MEDIUM": 24,
    "HIGH": 8,
    "URGENT": 2
  }
  
  return new Date(now.getTime() + (hours[priority as keyof typeof hours] || 24) * 60 * 60 * 1000)
}

function personalizeTemplate(template: string, entity: any): string {
  // Simple template personalization
  return template
    .replace(/\{\{firstName\}\}/g, entity.firstName || "")
    .replace(/\{\{lastName\}\}/g, entity.lastName || "")
    .replace(/\{\{email\}\}/g, entity.email || "")
    .replace(/\{\{phone\}\}/g, entity.phone || "")
    .replace(/\{\{status\}\}/g, entity.status || "")
}

function getFieldValue(entity: any, field: string): any {
  return entity[field]
}

function evaluateOperator(fieldValue: any, operator: string, value: any): boolean {
  switch (operator) {
    case "equals": return fieldValue === value
    case "not_equals": return fieldValue !== value
    case "contains": return fieldValue?.toString().includes(value)
    case "greater_than": return fieldValue > value
    case "less_than": return fieldValue < value
    default: return false
  }
}

function getConnectedNodes(nodeId: string, path: string): any[] {
  // This would find nodes connected via edges
  // Simplified for this example
  return []
}

function calculateNextRecurrence(schedule: any): Date {
  // Simplified recurrence calculation
  const now = new Date()
  switch (schedule.recurrence) {
    case "DAILY":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    case "WEEKLY":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    case "MONTHLY":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    default:
      return now
  }
}