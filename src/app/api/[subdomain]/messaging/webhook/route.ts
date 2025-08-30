import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const webhookSchema = z.object({
  channel: z.enum(["SMS", "WHATSAPP", "EMAIL"]),
  from: z.string(),
  fromType: z.enum(["STUDENT", "LEAD", "USER"]),
  to: z.string(),
  message: z.string(),
  timestamp: z.date().optional(),
  externalId: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  metadata: z.any().optional()
})

export async function POST(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = webhookSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Validate sender exists and belongs to agency
    const sender = await getRecipient(validatedData.fromType, validatedData.from, agency.id)
    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 })
    }

    // Get or create conversation
    let conversation = await db.conversation.findFirst({
      where: {
        agencyId: agency.id,
        participantId: validatedData.from,
        participantType: validatedData.fromType,
        channel: validatedData.channel
      }
    })

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          agencyId: agency.id,
          participantId: validatedData.from,
          participantType: validatedData.fromType,
          channel: validatedData.channel,
          subject: `Incoming message from ${sender.name || sender.email}`,
          lastMessageAt: new Date(),
          status: "ACTIVE"
        }
      })
    }

    // Create inbound message
    const messageData = await db.message.create({
      data: {
        agencyId: agency.id,
        conversationId: conversation.id,
        to: validatedData.to,
        toType: "USER", // Assuming messages are sent to the agency/system
        from: validatedData.from,
        fromType: validatedData.fromType,
        message: validatedData.message,
        channel: validatedData.channel,
        direction: "INBOUND",
        status: "RECEIVED",
        receivedAt: validatedData.timestamp || new Date(),
        externalId: validatedData.externalId,
        metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null
      }
    })

    // Process attachments if any
    if (validatedData.attachments && validatedData.attachments.length > 0) {
      for (const attachment of validatedData.attachments) {
        await db.messageAttachment.create({
          data: {
            messageId: messageData.id,
            fileName: attachment.fileName,
            fileSize: attachment.fileSize,
            fileType: attachment.fileType,
            fileUrl: attachment.fileUrl,
            thumbnailUrl: attachment.thumbnailUrl
          }
        })
      }
    }

    // Update conversation last message time
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date()
      }
    })

    // Create corresponding message record in the specific channel table
    switch (validatedData.channel) {
      case "SMS":
        await db.smsMessage.create({
          data: {
            agencyId: agency.id,
            to: validatedData.to,
            from: sender.phone || "",
            message: validatedData.message,
            status: "RECEIVED",
            receivedAt: validatedData.timestamp || new Date(),
            externalId: validatedData.externalId,
            messageId: messageData.id
          }
        })
        break
      case "WHATSAPP":
        await db.whatsappMessage.create({
          data: {
            agencyId: agency.id,
            to: validatedData.to,
            from: sender.phone || "",
            message: validatedData.message,
            status: "RECEIVED",
            receivedAt: validatedData.timestamp || new Date(),
            externalId: validatedData.externalId,
            messageId: messageData.id
          }
        })
        break
      case "EMAIL":
        await db.emailMessage.create({
          data: {
            agencyId: agency.id,
            to: validatedData.to,
            from: sender.email || "",
            subject: validatedData.metadata?.subject || "Incoming Message",
            body: validatedData.message,
            status: "RECEIVED",
            receivedAt: validatedData.timestamp || new Date(),
            externalId: validatedData.externalId,
            messageId: messageData.id
          }
        })
        break
    }

    // Send notification to relevant users
    await sendIncomingMessageNotification(messageData, conversation, agency.id)

    // Process auto-replies if configured
    await processAutoReply(messageData, conversation, agency.id)

    // Get the complete message with relations
    const completeMessage = await db.message.findUnique({
      where: { id: messageData.id },
      include: {
        conversation: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true
              }
            },
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        attachments: true
      }
    })

    // Parse JSON fields
    const processedMessage = {
      ...completeMessage,
      metadata: completeMessage?.metadata ? JSON.parse(completeMessage.metadata) : null,
      attachments: completeMessage?.attachments || []
    }

    return NextResponse.json({
      success: true,
      message: processedMessage,
      conversationId: conversation.id
    })
  } catch (error) {
    console.error("Error processing webhook:", error)
    
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
    case "STUDENT":
      const student = await db.student.findFirst({
        where: { id: recipientId, agencyId: agencyId }
      })
      return student ? { ...student, name: `${student.firstName} ${student.lastName}` } : null
    case "LEAD":
      const lead = await db.lead.findFirst({
        where: { id: recipientId, agencyId: agencyId }
      })
      return lead ? { ...lead, name: `${lead.firstName} ${lead.lastName}` } : null
    case "USER":
      const user = await db.user.findFirst({
        where: { id: recipientId, agencyId: agencyId }
      })
      return user ? { ...user, name: user.name } : null
    default:
      return null
  }
}

// Helper function to send incoming message notification
async function sendIncomingMessageNotification(messageData: any, conversation: any, agencyId: string) {
  // Get users who should be notified
  const notifyUsers = await db.user.findMany({
    where: {
      agencyId: agencyId,
      role: {
        in: ["ADMIN", "CONSULTANT", "MANAGER"]
      },
      status: "ACTIVE"
    }
  })

  for (const user of notifyUsers) {
    await db.notification.create({
      data: {
        agencyId,
        type: "INFO",
        title: "New Message Received",
        message: `New ${messageData.channel} message from ${conversation.participantType === "STUDENT" ? 
          conversation.student?.firstName + " " + conversation.student?.lastName :
          conversation.participantType === "LEAD" ?
          conversation.lead?.firstName + " " + conversation.lead?.lastName :
          conversation.user?.name
        }`,
        recipientId: user.id,
        recipientType: "USER",
        channel: "IN_APP",
        status: "PENDING",
        priority: "MEDIUM",
        data: JSON.stringify({
          messageId: messageData.id,
          conversationId: conversation.id,
          channel: messageData.channel,
          participantType: conversation.participantType,
          participantId: conversation.participantId
        })
      }
    })
  }
}

// Helper function to process auto-replies
async function processAutoReply(messageData: any, conversation: any, agencyId: string) {
  try {
    // Check if auto-reply is enabled for this conversation type
    const autoReplySettings = await db.autoReplySettings.findFirst({
      where: {
        agencyId: agencyId,
        channel: messageData.channel,
        participantType: conversation.participantType,
        isActive: true
      }
    })

    if (!autoReplySettings) {
      return
    }

    // Check if message matches auto-reply conditions
    const shouldReply = await checkAutoReplyConditions(messageData, autoReplySettings)
    if (!shouldReply) {
      return
    }

    // Get auto-reply template
    const template = await db.messageTemplate.findFirst({
      where: {
        agencyId: agencyId,
        id: autoReplySettings.templateId,
        isActive: true
      }
    })

    if (!template) {
      return
    }

    // Personalize template
    const personalizedMessage = personalizeTemplate(template.message, {
      firstName: conversation.student?.firstName || conversation.lead?.firstName || conversation.user?.name || "",
      lastName: conversation.student?.lastName || conversation.lead?.lastName || "",
      message: messageData.message,
      timestamp: messageData.receivedAt || new Date()
    })

    // Send auto-reply
    await db.message.create({
      data: {
        agencyId,
        conversationId: conversation.id,
        to: conversation.participantId,
        toType: conversation.participantType,
        from: "SYSTEM",
        fromType: "USER",
        message: personalizedMessage,
        channel: messageData.channel,
        direction: "OUTBOUND",
        status: "PENDING",
        metadata: JSON.stringify({
          autoReply: true,
          originalMessageId: messageData.id,
          templateId: template.id
        })
      }
    })

    // Update conversation last message time
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date()
      }
    })
  } catch (error) {
    console.error("Error processing auto-reply:", error)
  }
}

// Helper function to check auto-reply conditions
async function checkAutoReplyConditions(messageData: any, settings: any): Promise<boolean> {
  try {
    const conditions = JSON.parse(settings.conditions || "[]")
    
    for (const condition of conditions) {
      const { field, operator, value } = condition
      
      switch (field) {
        case "messageContains":
          if (operator === "contains" && !messageData.message.toLowerCase().includes(value.toLowerCase())) {
            return false
          }
          if (operator === "not_contains" && messageData.message.toLowerCase().includes(value.toLowerCase())) {
            return false
          }
          break
        case "timeOfDay":
          const hour = new Date().getHours()
          if (operator === "between") {
            const [start, end] = value.split("-").map(Number)
            if (hour < start || hour > end) {
              return false
            }
          }
          break
        case "dayOfWeek":
          const dayOfWeek = new Date().getDay()
          if (operator === "in" && !value.includes(dayOfWeek.toString())) {
            return false
          }
          break
        case "messageLength":
          const length = messageData.message.length
          if (operator === "greater_than" && length <= value) {
            return false
          }
          if (operator === "less_than" && length >= value) {
            return false
          }
          break
      }
    }
    
    return true
  } catch (error) {
    console.error("Error checking auto-reply conditions:", error)
    return false
  }
}

// Helper function to personalize template
function personalizeTemplate(template: string, variables: any): string {
  let personalized = template

  Object.keys(variables).forEach(key => {
    const value = variables[key]
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