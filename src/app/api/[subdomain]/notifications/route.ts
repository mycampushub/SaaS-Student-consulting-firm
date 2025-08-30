import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const notificationSchema = z.object({
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR", "TASK", "REMINDER", "SYSTEM"]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  recipientId: z.string(),
  recipientType: z.enum(["USER", "STUDENT", "LEAD"]),
  channel: z.enum(["IN_APP", "EMAIL", "SMS", "WHATSAPP", "PUSH"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  scheduledFor: z.date().optional(),
  data: z.any().optional()
})

const updateNotificationSchema = notificationSchema.partial().extend({
  status: z.enum(["PENDING", "SENT", "DELIVERED", "READ", "DISMISSED", "FAILED"]).optional(),
  readAt: z.date().optional(),
  deliveredAt: z.date().optional()
})

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
    const status = searchParams.get("status")
    const recipientId = searchParams.get("recipientId")
    const recipientType = searchParams.get("recipientType")
    const channel = searchParams.get("channel")
    const priority = searchParams.get("priority")
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where: any = {
      agencyId: agency.id,
      ...(type && { type: type }),
      ...(status && { status: status }),
      ...(recipientId && { recipientId: recipientId }),
      ...(recipientType && { recipientType: recipientType }),
      ...(channel && { channel: channel }),
      ...(priority && { priority: priority }),
      ...(unreadOnly && { readAt: null })
    }

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          },
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          }
        },
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: {
          ...where,
          readAt: null
        }
      })
    ])

    // Parse JSON data field
    const processedNotifications = notifications.map(notification => ({
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : null
    }))

    return NextResponse.json({
      notifications: processedNotifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
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
    const validatedData = notificationSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Validate recipient exists and belongs to agency
    const recipient = await getRecipient(validatedData.recipientType, validatedData.recipientId, agency.id)
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
    }

    // Create notification
    const notification = await db.notification.create({
      data: {
        agencyId: agency.id,
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        recipientId: validatedData.recipientId,
        recipientType: validatedData.recipientType,
        channel: validatedData.channel || "IN_APP",
        priority: validatedData.priority || "MEDIUM",
        scheduledFor: validatedData.scheduledFor,
        status: validatedData.scheduledFor ? "SCHEDULED" : "PENDING",
        data: validatedData.data ? JSON.stringify(validatedData.data) : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    // If not scheduled, process immediately
    if (!validatedData.scheduledFor) {
      await processNotification(notification, agency.id)
    }

    // Parse JSON data for response
    const processedNotification = {
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : null
    }

    return NextResponse.json(processedNotification)
  } catch (error) {
    console.error("Error creating notification:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get recipient
async function getRecipient(recipientType: string, recipientId: string, agencyId: string) {
  switch (recipientType) {
    case "USER":
      return await db.user.findFirst({
        where: { id: recipientId, agencyId: agencyId }
      })
    case "STUDENT":
      return await db.student.findFirst({
        where: { id: recipientId, agencyId: agencyId }
      })
    case "LEAD":
      return await db.lead.findFirst({
        where: { id: recipientId, agencyId: agencyId }
      })
    default:
      return null
  }
}

// Helper function to process notification
async function processNotification(notification: any, agencyId: string) {
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
        // In-app notifications are already created, just mark as delivered
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
    
    // Mark as failed
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

// Helper function to send email notification
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

  // Create email message
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

  // In a real implementation, you would send the actual email here
  // For now, we'll just mark it as sent
  await db.emailMessage.update({
    where: { id: emailMessage.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })

  // Update notification status
  await db.notification.update({
    where: { id: notification.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })
}

// Helper function to send SMS notification
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

  // Create SMS message
  const smsMessage = await db.smsMessage.create({
    data: {
      agencyId,
      to: recipientPhone,
      message: notification.message,
      status: "SCHEDULED",
      notificationId: notification.id
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

  // Update notification status
  await db.notification.update({
    where: { id: notification.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })
}

// Helper function to send WhatsApp notification
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

  // Create WhatsApp message
  const whatsappMessage = await db.whatsappMessage.create({
    data: {
      agencyId,
      to: recipientPhone,
      message: notification.message,
      status: "SCHEDULED",
      notificationId: notification.id
    }
  })

  // In a real implementation, you would send the actual WhatsApp message here
  // For now, we'll just mark it as sent
  await db.whatsappMessage.update({
    where: { id: whatsappMessage.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })

  // Update notification status
  await db.notification.update({
    where: { id: notification.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })
}

// Helper function to send push notification
async function sendPushNotification(notification: any, agencyId: string) {
  // In a real implementation, you would integrate with a push notification service
  // For now, we'll just mark it as sent
  
  await db.notification.update({
    where: { id: notification.id },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  })
}