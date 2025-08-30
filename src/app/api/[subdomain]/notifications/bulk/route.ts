import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const bulkActionSchema = z.object({
  action: z.enum(["mark_read", "mark_unread", "mark_delivered", "dismiss", "delete"]),
  notificationIds: z.array(z.string()).min(1, "At least one notification ID is required")
})

const bulkSendSchema = z.object({
  recipients: z.array(z.object({
    id: z.string(),
    type: z.enum(["USER", "STUDENT", "LEAD"])
  })).min(1, "At least one recipient is required"),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR", "TASK", "REMINDER", "SYSTEM"]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  channel: z.enum(["IN_APP", "EMAIL", "SMS", "WHATSAPP", "PUSH"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  scheduledFor: z.date().optional(),
  data: z.any().optional()
})

export async function POST(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const { action } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    if (action === "send") {
      const validatedData = bulkSendSchema.parse(body)
      return await handleBulkSend(validatedData, agency.id)
    } else {
      const validatedData = bulkActionSchema.parse(body)
      return await handleBulkAction(validatedData, agency.id)
    }
  } catch (error) {
    console.error("Error processing bulk notification action:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handleBulkAction(data: any, agencyId: string) {
  const { action, notificationIds } = data

  // Verify all notifications exist and belong to agency
  const existingNotifications = await db.notification.findMany({
    where: {
      id: { in: notificationIds },
      agencyId: agencyId
    }
  })

  if (existingNotifications.length !== notificationIds.length) {
    return NextResponse.json({ error: "Some notifications not found" }, { status: 404 })
  }

  let updateData: any = {}

  switch (action) {
    case "mark_read":
      updateData = {
        status: "READ",
        readAt: new Date()
      }
      break
    case "mark_unread":
      updateData = {
        status: "DELIVERED",
        readAt: null
      }
      break
    case "mark_delivered":
      updateData = {
        status: "DELIVERED",
        deliveredAt: new Date()
      }
      break
    case "dismiss":
      updateData = {
        status: "DISMISSED",
        readAt: new Date()
      }
      break
    case "delete":
      // Handle delete separately
      await db.notification.deleteMany({
        where: {
          id: { in: notificationIds },
          agencyId: agencyId
        }
      })
      return NextResponse.json({
        success: true,
        message: `${notificationIds.length} notifications deleted`,
        processedCount: notificationIds.length
      })
  }

  // Update notifications
  const result = await db.notification.updateMany({
    where: {
      id: { in: notificationIds },
      agencyId: agencyId
    },
    data: updateData
  })

  return NextResponse.json({
    success: true,
    message: `${result.count} notifications ${action}ed`,
    processedCount: result.count
  })
}

async function handleBulkSend(data: any, agencyId: string) {
  const { recipients, type, title, message, channel, priority, scheduledFor, data: notificationData } = data

  // Validate all recipients exist and belong to agency
  const recipientIds = recipients.map((r: any) => r.id)
  const recipientTypes = recipients.map((r: any) => r.type)

  // Create notifications for each recipient
  const notifications = []
  const errors = []

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i]
    
    try {
      // Validate recipient exists
      const recipientExists = await validateRecipient(recipient.type, recipient.id, agencyId)
      if (!recipientExists) {
        errors.push(`Recipient ${recipient.id} (${recipient.type}) not found`)
        continue
      }

      const notification = await db.notification.create({
        data: {
          agencyId,
          type,
          title,
          message,
          recipientId: recipient.id,
          recipientType: recipient.type,
          channel: channel || "IN_APP",
          priority: priority || "MEDIUM",
          scheduledFor,
          status: scheduledFor ? "SCHEDULED" : "PENDING",
          data: notificationData ? JSON.stringify(notificationData) : null
        }
      })

      // If not scheduled, process immediately
      if (!scheduledFor) {
        await processSingleNotification(notification, agencyId)
      }

      notifications.push(notification)
    } catch (error) {
      console.error(`Error creating notification for recipient ${recipient.id}:`, error)
      errors.push(`Failed to create notification for recipient ${recipient.id}`)
    }
  }

  return NextResponse.json({
    success: true,
    message: `Created ${notifications.length} notifications`,
    processedCount: notifications.length,
    totalCount: recipients.length,
    errors: errors.length > 0 ? errors : undefined
  })
}

async function validateRecipient(recipientType: string, recipientId: string, agencyId: string): Promise<boolean> {
  switch (recipientType) {
    case "USER":
      const user = await db.user.findFirst({
        where: { id: recipientId, agencyId: agencyId }
      })
      return !!user
    case "STUDENT":
      const student = await db.student.findFirst({
        where: { id: recipientId, agencyId: agencyId }
      })
      return !!student
    case "LEAD":
      const lead = await db.lead.findFirst({
        where: { id: recipientId, agencyId: agencyId }
      })
      return !!lead
    default:
      return false
  }
}

async function processSingleNotification(notification: any, agencyId: string) {
  try {
    switch (notification.channel) {
      case "EMAIL":
        await sendEmailNotification(notification, agencyId)
        break
      case "SMS":
        await sendSmsNotification(notification, agencyId)
        break
      case "WHATSAPP":
        await sendWhatsAppNotification(notification, agencyId)
        break
      case "PUSH":
        await sendPushNotification(notification, agencyId)
        break
      case "IN_APP":
      default:
        await db.notification.update({
          where: { id: notification.id },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date()
          }
        })
        break
    }
  } catch (error) {
    console.error("Error processing notification:", error)
    
    await db.notification.update({
      where: { id: notification.id },
      data: {
        status: "FAILED",
        data: JSON.stringify({
          ...(notification.data ? JSON.parse(notification.data) : {}),
          error: error.message
        })
      }
    })
  }
}

// Helper functions for sending notifications (copied from main route)
async function sendEmailNotification(notification: any, agencyId: string) {
  let recipientEmail = ""
  
  switch (notification.recipientType) {
    case "USER":
      const user = await db.user.findFirst({
        where: { id: notification.recipientId, agencyId: agencyId }
      })
      recipientEmail = user?.email || ""
      break
    case "STUDENT":
      const student = await db.student.findFirst({
        where: { id: notification.recipientId, agencyId: agencyId }
      })
      recipientEmail = student?.email || ""
      break
    case "LEAD":
      const lead = await db.lead.findFirst({
        where: { id: notification.recipientId, agencyId: agencyId }
      })
      recipientEmail = lead?.email || ""
      break
  }

  if (!recipientEmail) {
    throw new Error("Recipient email not found")
  }

  const emailMessage = await db.emailMessage.create({
    data: {
      agencyId,
      to: recipientEmail,
      subject: notification.title,
      body: notification.message,
      status: "SCHEDULED",
      notificationId: notification.id
    }
  })

  await db.emailMessage.update({
    where: { id: emailMessage.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })

  await db.notification.update({
    where: { id: notification.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })
}

async function sendSmsNotification(notification: any, agencyId: string) {
  let recipientPhone = ""
  
  switch (notification.recipientType) {
    case "USER":
      const user = await db.user.findFirst({
        where: { id: notification.recipientId, agencyId: agencyId }
      })
      recipientPhone = user?.phone || ""
      break
    case "STUDENT":
      const student = await db.student.findFirst({
        where: { id: notification.recipientId, agencyId: agencyId }
      })
      recipientPhone = student?.phone || ""
      break
    case "LEAD":
      const lead = await db.lead.findFirst({
        where: { id: notification.recipientId, agencyId: agencyId }
      })
      recipientPhone = lead?.phone || ""
      break
  }

  if (!recipientPhone) {
    throw new Error("Recipient phone not found")
  }

  const smsMessage = await db.smsMessage.create({
    data: {
      agencyId,
      to: recipientPhone,
      message: notification.message,
      status: "SCHEDULED",
      notificationId: notification.id
    }
  })

  await db.smsMessage.update({
    where: { id: smsMessage.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })

  await db.notification.update({
    where: { id: notification.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })
}

async function sendWhatsAppNotification(notification: any, agencyId: string) {
  let recipientPhone = ""
  
  switch (notification.recipientType) {
    case "USER":
      const user = await db.user.findFirst({
        where: { id: notification.recipientId, agencyId: agencyId }
      })
      recipientPhone = user?.phone || ""
      break
    case "STUDENT":
      const student = await db.student.findFirst({
        where: { id: notification.recipientId, agencyId: agencyId }
      })
      recipientPhone = student?.phone || ""
      break
    case "LEAD":
      const lead = await db.lead.findFirst({
        where: { id: notification.recipientId, agencyId: agencyId }
      })
      recipientPhone = lead?.phone || ""
      break
  }

  if (!recipientPhone) {
    throw new Error("Recipient phone not found")
  }

  const whatsappMessage = await db.whatsappMessage.create({
    data: {
      agencyId,
      to: recipientPhone,
      message: notification.message,
      status: "SCHEDULED",
      notificationId: notification.id
    }
  })

  await db.whatsappMessage.update({
    where: { id: whatsappMessage.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })

  await db.notification.update({
    where: { id: notification.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })
}

async function sendPushNotification(notification: any, agencyId: string) {
  await db.notification.update({
    where: { id: notification.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })
}