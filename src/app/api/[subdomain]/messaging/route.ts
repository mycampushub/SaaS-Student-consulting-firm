import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const messageSchema = z.object({
  to: z.string().min(1, "Recipient is required"),
  toType: z.enum(["STUDENT", "LEAD", "USER"]),
  message: z.string().min(1, "Message is required"),
  channel: z.enum(["SMS", "WHATSAPP", "EMAIL"]),
  direction: z.enum(["INBOUND", "OUTBOUND"]).optional(),
  subject: z.string().optional(),
  templateId: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  metadata: z.any().optional()
})

const conversationSchema = z.object({
  participantId: z.string().min(1, "Participant ID is required"),
  participantType: z.enum(["STUDENT", "LEAD", "USER"]),
  channel: z.enum(["SMS", "WHATSAPP", "EMAIL"]),
  subject: z.string().optional(),
  tags: z.array(z.string()).optional()
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
    const conversationId = searchParams.get("conversationId")
    const to = searchParams.get("to")
    const toType = searchParams.get("toType")
    const channel = searchParams.get("channel")
    const direction = searchParams.get("direction")
    const status = searchParams.get("status")
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where: any = {
      agencyId: agency.id,
      ...(conversationId && { conversationId: conversationId }),
      ...(to && { to: to }),
      ...(toType && { toType: toType }),
      ...(channel && { channel: channel }),
      ...(direction && { direction: direction }),
      ...(status && { status: status }),
      ...(unreadOnly && { readAt: null })
    }

    const [messages, total, unreadCount] = await Promise.all([
      db.message.findMany({
        where,
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
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.message.count({ where }),
      db.message.count({
        where: {
          ...where,
          direction: "INBOUND",
          readAt: null
        }
      })
    ])

    // Parse JSON fields
    const processedMessages = messages.map(message => ({
      ...message,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
      attachments: message.attachments || []
    }))

    return NextResponse.json({
      messages: processedMessages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    })
  } catch (error) {
    console.error("Error fetching messages:", error)
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
    const { action } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    if (action === "send") {
      const validatedData = messageSchema.parse(body)
      return await handleSendMessage(validatedData, agency.id)
    } else if (action === "start_conversation") {
      const validatedData = conversationSchema.parse(body)
      return await handleStartConversation(validatedData, agency.id)
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error processing messaging request:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handleSendMessage(data: any, agencyId: string) {
  const { to, toType, message, channel, direction = "OUTBOUND", subject, templateId, attachments, metadata } = data

  // Validate recipient exists and belongs to agency
  const recipient = await getRecipient(toType, to, agencyId)
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
  }

  // Get or create conversation
  let conversation = await db.conversation.findFirst({
    where: {
      agencyId,
      participantId: to,
      participantType: toType,
      channel
    }
  })

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        agencyId,
        participantId: to,
        participantType: toType,
        channel,
        subject: subject || `Conversation with ${recipient.name || recipient.email}`,
        lastMessageAt: new Date(),
        status: "ACTIVE"
      }
    })
  }

  // Create message
  const messageData = await db.message.create({
    data: {
      agencyId,
      conversationId: conversation.id,
      to,
      toType,
      from: "SYSTEM", // This would be the actual user in a real implementation
      fromType: "USER",
      message,
      channel,
      direction,
      subject,
      status: "PENDING",
      metadata: metadata ? JSON.stringify(metadata) : null
    }
  })

  // Process attachments if any
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
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

  // Send message based on channel
  let sentMessage = null
  try {
    switch (channel) {
      case "SMS":
        sentMessage = await sendSmsMessage(messageData, recipient, agencyId)
        break
      case "WHATSAPP":
        sentMessage = await sendWhatsAppMessage(messageData, recipient, agencyId)
        break
      case "EMAIL":
        sentMessage = await sendEmailMessage(messageData, recipient, agencyId)
        break
      default:
        throw new Error("Unsupported channel")
    }

    // Update message status
    await db.message.update({
      where: { id: messageData.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        externalId: sentMessage.externalId
      }
    })

    // Update conversation last message time
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date()
      }
    })

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

    return NextResponse.json(processedMessage)
  } catch (error) {
    console.error("Error sending message:", error)
    
    // Update message status to failed
    await db.message.update({
      where: { id: messageData.id },
      data: {
        status: "FAILED",
        metadata: JSON.stringify({
          ...(metadata || {}),
          error: error.message
        })
      }
    })

    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}

async function handleStartConversation(data: any, agencyId: string) {
  const { participantId, participantType, channel, subject, tags } = data

  // Validate participant exists and belongs to agency
  const participant = await getRecipient(participantType, participantId, agencyId)
  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 })
  }

  // Check if conversation already exists
  const existingConversation = await db.conversation.findFirst({
    where: {
      agencyId,
      participantId,
      participantType,
      channel
    }
  })

  if (existingConversation) {
    return NextResponse.json({ error: "Conversation already exists" }, { status: 400 })
  }

  // Create conversation
  const conversation = await db.conversation.create({
    data: {
      agencyId,
      participantId,
      participantType,
      channel,
      subject: subject || `Conversation with ${participant.name || participant.email}`,
      tags: tags ? JSON.stringify(tags) : null,
      status: "ACTIVE"
    },
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
  })

  // Parse JSON fields
  const processedConversation = {
    ...conversation,
    tags: conversation.tags ? JSON.parse(conversation.tags) : []
  }

  return NextResponse.json(processedConversation)
}

// Helper functions
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

async function sendSmsMessage(messageData: any, recipient: any, agencyId: string) {
  // Create SMS message record
  const smsMessage = await db.smsMessage.create({
    data: {
      agencyId,
      to: recipient.phone || "",
      message: messageData.message,
      status: "SCHEDULED",
      messageId: messageData.id
    }
  })

  // In a real implementation, you would integrate with an SMS service like Twilio
  // For now, we'll simulate sending
  const externalId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Update SMS message status
  await db.smsMessage.update({
    where: { id: smsMessage.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      externalId
    }
  })

  return { externalId }
}

async function sendWhatsAppMessage(messageData: any, recipient: any, agencyId: string) {
  // Create WhatsApp message record
  const whatsappMessage = await db.whatsappMessage.create({
    data: {
      agencyId,
      to: recipient.phone || "",
      message: messageData.message,
      status: "SCHEDULED",
      messageId: messageData.id
    }
  })

  // In a real implementation, you would integrate with WhatsApp Business API
  // For now, we'll simulate sending
  const externalId = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Update WhatsApp message status
  await db.whatsappMessage.update({
    where: { id: whatsappMessage.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      externalId
    }
  })

  return { externalId }
}

async function sendEmailMessage(messageData: any, recipient: any, agencyId: string) {
  // Create email message record
  const emailMessage = await db.emailMessage.create({
    data: {
      agencyId,
      to: recipient.email || "",
      subject: messageData.subject || "New Message",
      body: messageData.message,
      status: "SCHEDULED",
      messageId: messageData.id
    }
  })

  // In a real implementation, you would integrate with an email service
  // For now, we'll simulate sending
  const externalId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Update email message status
  await db.emailMessage.update({
    where: { id: emailMessage.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      externalId
    }
  })

  return { externalId }
}