import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const conversationUpdateSchema = z.object({
  subject: z.string().optional(),
  status: z.enum(["ACTIVE", "CLOSED", "ARCHIVED"]).optional(),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional()
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
    const participantId = searchParams.get("participantId")
    const participantType = searchParams.get("participantType")
    const channel = searchParams.get("channel")
    const status = searchParams.get("status")
    const assignedTo = searchParams.get("assignedTo")
    const tags = searchParams.get("tags")?.split(",")
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const search = searchParams.get("search")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where: any = {
      agencyId: agency.id,
      ...(participantId && { participantId: participantId }),
      ...(participantType && { participantType: participantType }),
      ...(channel && { channel: channel }),
      ...(status && { status: status }),
      ...(assignedTo && { assignedTo: assignedTo })
    }

    // Handle tags filter
    if (tags && tags.length > 0) {
      where.tags = {
        contains: JSON.stringify(tags)
      }
    }

    // Handle search
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { participantId: { contains: search, mode: "insensitive" } }
      ]
    }

    const [conversations, total] = await Promise.all([
      db.conversation.findMany({
        where,
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
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              attachments: true
            }
          },
          _count: {
            select: {
              messages: true
            }
          }
        },
        orderBy: { lastMessageAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.conversation.count({ where })
    ])

    // Get unread message counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await db.message.count({
          where: {
            conversationId: conversation.id,
            direction: "INBOUND",
            readAt: null
          }
        })

        return {
          ...conversation,
          unreadCount,
          tags: conversation.tags ? JSON.parse(conversation.tags) : []
        }
      })
    )

    // Filter by unread count if requested
    let filteredConversations = conversationsWithUnread
    if (unreadOnly) {
      filteredConversations = conversationsWithUnread.filter(c => c.unreadCount > 0)
    }

    return NextResponse.json({
      conversations: filteredConversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const { conversationIds, action } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
      return NextResponse.json({ error: "Conversation IDs are required" }, { status: 400 })
    }

    // Verify all conversations exist and belong to agency
    const existingConversations = await db.conversation.findMany({
      where: {
        id: { in: conversationIds },
        agencyId: agency.id
      }
    })

    if (existingConversations.length !== conversationIds.length) {
      return NextResponse.json({ error: "Some conversations not found" }, { status: 404 })
    }

    if (action === "mark_read") {
      return await handleMarkRead(conversationIds, agency.id)
    } else if (action === "assign") {
      const validatedData = conversationUpdateSchema.parse(body)
      return await handleAssign(conversationIds, validatedData.assignedTo, agency.id)
    } else if (action === "update") {
      const validatedData = conversationUpdateSchema.parse(body)
      return await handleUpdate(conversationIds, validatedData, agency.id)
    } else if (action === "close") {
      return await handleClose(conversationIds, agency.id)
    } else if (action === "archive") {
      return await handleArchive(conversationIds, agency.id)
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error updating conversations:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handleMarkRead(conversationIds: string[], agencyId: string) {
  // Mark all inbound messages in these conversations as read
  const result = await db.message.updateMany({
    where: {
      conversationId: { in: conversationIds },
      direction: "INBOUND",
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  })

  return NextResponse.json({
    success: true,
    message: `${result.count} messages marked as read`,
    processedCount: result.count
  })
}

async function handleAssign(conversationIds: string[], assignedTo: string, agencyId: string) {
  // Validate assigned user exists and belongs to agency
  const assignedUser = await db.user.findFirst({
    where: { id: assignedTo, agencyId: agencyId }
  })

  if (!assignedUser) {
    return NextResponse.json({ error: "Assigned user not found" }, { status: 404 })
  }

  // Update conversations
  const result = await db.conversation.updateMany({
    where: {
      id: { in: conversationIds },
      agencyId: agencyId
    },
    data: {
      assignedTo: assignedTo
    }
  })

  // Send assignment notifications
  await sendAssignmentNotifications(conversationIds, assignedUser, agencyId)

  return NextResponse.json({
    success: true,
    message: `${result.count} conversations assigned to ${assignedUser.name}`,
    processedCount: result.count
  })
}

async function handleUpdate(conversationIds: string[], data: any, agencyId: string) {
  const updateData: any = {}

  if (data.subject !== undefined) {
    updateData.subject = data.subject
  }
  if (data.status !== undefined) {
    updateData.status = data.status
  }
  if (data.tags !== undefined) {
    updateData.tags = JSON.stringify(data.tags)
  }
  if (data.assignedTo !== undefined) {
    updateData.assignedTo = data.assignedTo
  }
  if (data.priority !== undefined) {
    updateData.priority = data.priority
  }

  // Update conversations
  const result = await db.conversation.updateMany({
    where: {
      id: { in: conversationIds },
      agencyId: agencyId
    },
    data: updateData
  })

  return NextResponse.json({
    success: true,
    message: `${result.count} conversations updated`,
    processedCount: result.count
  })
}

async function handleClose(conversationIds: string[], agencyId: string) {
  // Update conversations
  const result = await db.conversation.updateMany({
    where: {
      id: { in: conversationIds },
      agencyId: agencyId
    },
    data: {
      status: "CLOSED"
    }
  })

  // Send closure notifications
  await sendClosureNotifications(conversationIds, agencyId)

  return NextResponse.json({
    success: true,
    message: `${result.count} conversations closed`,
    processedCount: result.count
  })
}

async function handleArchive(conversationIds: string[], agencyId: string) {
  // Update conversations
  const result = await db.conversation.updateMany({
    where: {
      id: { in: conversationIds },
      agencyId: agencyId
    },
    data: {
      status: "ARCHIVED"
    }
  })

  return NextResponse.json({
    success: true,
    message: `${result.count} conversations archived`,
    processedCount: result.count
  })
}

// Helper function to send assignment notifications
async function sendAssignmentNotifications(conversationIds: string[], assignedUser: any, agencyId: string) {
  // Get conversations with details
  const conversations = await db.conversation.findMany({
    where: {
      id: { in: conversationIds },
      agencyId: agencyId
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })

  for (const conversation of conversations) {
    const participantName = conversation.student 
      ? `${conversation.student.firstName} ${conversation.student.lastName}`
      : conversation.lead
      ? `${conversation.lead.firstName} ${conversation.lead.lastName}`
      : conversation.user?.name || "Unknown"

    await db.notification.create({
      data: {
        agencyId,
        type: "INFO",
        title: "Conversation Assigned",
        message: `You have been assigned to the conversation with ${participantName}`,
        recipientId: assignedUser.id,
        recipientType: "USER",
        channel: "IN_APP",
        status: "PENDING",
        priority: "MEDIUM",
        data: JSON.stringify({
          conversationId: conversation.id,
          participantName,
          channel: conversation.channel
        })
      }
    })
  }
}

// Helper function to send closure notifications
async function sendClosureNotifications(conversationIds: string[], agencyId: string) {
  // Get conversations with assigned users
  const conversations = await db.conversation.findMany({
    where: {
      id: { in: conversationIds },
      agencyId: agencyId,
      assignedTo: { not: null }
    },
    include: {
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })

  for (const conversation of conversations) {
    const participantName = conversation.student 
      ? `${conversation.student.firstName} ${conversation.student.lastName}`
      : conversation.lead
      ? `${conversation.lead.firstName} ${conversation.lead.lastName}`
      : conversation.user?.name || "Unknown"

    await db.notification.create({
      data: {
        agencyId,
        type: "INFO",
        title: "Conversation Closed",
        message: `The conversation with ${participantName} has been closed`,
        recipientId: conversation.assignedUser!.id,
        recipientType: "USER",
        channel: "IN_APP",
        status: "PENDING",
        priority: "LOW",
        data: JSON.stringify({
          conversationId: conversation.id,
          participantName,
          channel: conversation.channel
        })
      }
    })
  }
}