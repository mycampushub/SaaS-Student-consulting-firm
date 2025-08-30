import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const alertSchema = z.object({
  type: z.enum(["TASK_OVERDUE", "APPOINTMENT_MISSED", "DOCUMENT_EXPIRED", "APPLICATION_DEADLINE", "CAMPAIGN_INACTIVE"]),
  title: z.string().min(1, "Alert title is required"),
  message: z.string().min(1, "Alert message is required"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  entityId: z.string(),
  entityType: z.enum(["TASK", "APPOINTMENT", "DOCUMENT", "APPLICATION", "CAMPAIGN"]),
  recipientId: z.string(),
  recipientType: z.enum(["USER", "STUDENT", "LEAD"]),
  actionRequired: z.boolean().optional(),
  actionUrl: z.string().optional(),
  metadata: z.any().optional()
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
    const severity = searchParams.get("severity")
    const recipientId = searchParams.get("recipientId")
    const recipientType = searchParams.get("recipientType")
    const status = searchParams.get("status")
    const unresolvedOnly = searchParams.get("unresolvedOnly") === "true"

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where: any = {
      agencyId: agency.id,
      ...(type && { type: type }),
      ...(severity && { severity: severity }),
      ...(recipientId && { recipientId: recipientId }),
      ...(recipientType && { recipientType: recipientType }),
      ...(status && { status: status }),
      ...(unresolvedOnly && { resolvedAt: null })
    }

    const [alerts, total] = await Promise.all([
      db.alert.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              dueDate: true,
              assignedTo: true
            }
          },
          appointment: {
            select: {
              id: true,
              title: true,
              startTime: true,
              assignedTo: true
            }
          },
          document: {
            select: {
              id: true,
              name: true,
              type: true,
              expiresAt: true
            }
          },
          application: {
            select: {
              id: true,
              university: {
                select: {
                  name: true
                }
              },
              deadline: true
            }
          },
          campaign: {
            select: {
              id: true,
              name: true,
              endDate: true
            }
          },
          recipientUser: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          recipientStudent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          },
          recipientLead: {
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
          { severity: "desc" },
          { createdAt: "desc" }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      db.alert.count({ where })
    ])

    // Parse JSON fields
    const processedAlerts = alerts.map(alert => ({
      ...alert,
      metadata: alert.metadata ? JSON.parse(alert.metadata) : null
    }))

    return NextResponse.json({
      alerts: processedAlerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching alerts:", error)
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

    if (action === "create") {
      const validatedData = alertSchema.parse(body)
      return await handleCreateAlert(validatedData, agency.id)
    } else if (action === "check_overdue") {
      return await handleCheckOverdueItems(agency.id)
    } else if (action === "check_missed_appointments") {
      return await handleCheckMissedAppointments(agency.id)
    } else if (action === "check_expired_documents") {
      return await handleCheckExpiredDocuments(agency.id)
    } else if (action === "check_application_deadlines") {
      return await handleCheckApplicationDeadlines(agency.id)
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error processing alert request:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to create alert
async function handleCreateAlert(data: any, agencyId: string) {
  // Validate recipient exists and belongs to agency
  const recipient = await getAlertRecipient(data.recipientType, data.recipientId, agencyId)
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
  }

  // Create alert
  const alert = await db.alert.create({
    data: {
      agencyId: agencyId,
      type: data.type,
      title: data.title,
      message: data.message,
      severity: data.severity,
      entityId: data.entityId,
      entityType: data.entityType,
      recipientId: data.recipientId,
      recipientType: data.recipientType,
      actionRequired: data.actionRequired ?? true,
      actionUrl: data.actionUrl,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null
    },
    include: {
      recipientUser: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true
        }
      },
      recipientStudent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      },
      recipientLead: {
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

  // Send notification for the alert
  await sendAlertNotification(alert, agencyId)

  // Parse JSON fields for response
  const processedAlert = {
    ...alert,
    metadata: alert.metadata ? JSON.parse(alert.metadata) : null
  }

  return NextResponse.json(processedAlert)
}

// Helper function to check overdue items
async function handleCheckOverdueItems(agencyId: string) {
  const now = new Date()
  
  // Find overdue tasks
  const overdueTasks = await db.task.findMany({
    where: {
      agencyId: agencyId,
      status: {
        in: ["PENDING", "IN_PROGRESS"]
      },
      dueDate: {
        lt: now
      }
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
      }
    }
  })

  const alertsCreated = []

  for (const task of overdueTasks) {
    // Check if alert already exists for this task
    const existingAlert = await db.alert.findFirst({
      where: {
        agencyId: agencyId,
        type: "TASK_OVERDUE",
        entityId: task.id,
        entityType: "TASK",
        resolvedAt: null
      }
    })

    if (!existingAlert) {
      const severity = getTaskOverdueSeverity(task.dueDate, now)
      
      const alert = await db.alert.create({
        data: {
          agencyId: agencyId,
          type: "TASK_OVERDUE",
          title: "Task Overdue",
          message: `Task "${task.title}" is overdue and requires attention`,
          severity,
          entityId: task.id,
          entityType: "TASK",
          recipientId: task.assignedTo || task.studentId || task.leadId,
          recipientType: task.assignedTo ? "USER" : task.studentId ? "STUDENT" : "LEAD",
          actionRequired: true,
          actionUrl: `/tasks/${task.id}`,
          metadata: JSON.stringify({
            taskTitle: task.title,
            dueDate: task.dueDate,
            daysOverdue: Math.floor((now.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24))
          })
        }
      })

      await sendAlertNotification(alert, agencyId)
      alertsCreated.push(alert)
    }
  }

  return NextResponse.json({
    success: true,
    message: `Checked ${overdueTasks.length} overdue tasks, created ${alertsCreated.length} alerts`,
    alertsCreated: alertsCreated.length
  })
}

// Helper function to check missed appointments
async function handleCheckMissedAppointments(agencyId: string) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  // Find missed appointments (appointments that should have started in the last hour but weren't completed)
  const missedAppointments = await db.appointment.findMany({
    where: {
      agencyId: agencyId,
      status: {
        in: ["SCHEDULED", "CONFIRMED"]
      },
      startTime: {
        lt: now,
        gt: oneHourAgo
      }
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
      }
    }
  })

  const alertsCreated = []

  for (const appointment of missedAppointments) {
    // Check if alert already exists for this appointment
    const existingAlert = await db.alert.findFirst({
      where: {
        agencyId: agencyId,
        type: "APPOINTMENT_MISSED",
        entityId: appointment.id,
        entityType: "APPOINTMENT",
        resolvedAt: null
      }
    })

    if (!existingAlert) {
      const alert = await db.alert.create({
        data: {
          agencyId: agencyId,
          type: "APPOINTMENT_MISSED",
          title: "Appointment Missed",
          message: `Appointment "${appointment.title}" was missed`,
          severity: "MEDIUM",
          entityId: appointment.id,
          entityType: "APPOINTMENT",
          recipientId: appointment.assignedTo || appointment.studentId || appointment.leadId,
          recipientType: appointment.assignedTo ? "USER" : appointment.studentId ? "STUDENT" : "LEAD",
          actionRequired: true,
          actionUrl: `/appointments/${appointment.id}`,
          metadata: JSON.stringify({
            appointmentTitle: appointment.title,
            scheduledTime: appointment.startTime,
            type: appointment.type
          })
        }
      })

      await sendAlertNotification(alert, agencyId)
      alertsCreated.push(alert)
    }
  }

  return NextResponse.json({
    success: true,
    message: `Checked ${missedAppointments.length} appointments, created ${alertsCreated.length} alerts`,
    alertsCreated: alertsCreated.length
  })
}

// Helper function to check expired documents
async function handleCheckExpiredDocuments(agencyId: string) {
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Find expired and expiring soon documents
  const documents = await db.document.findMany({
    where: {
      agencyId: agencyId,
      OR: [
        {
          expiresAt: {
            lt: now
          }
        },
        {
          expiresAt: {
            gt: now,
            lt: thirtyDaysFromNow
          }
        }
      ]
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
      }
    }
  })

  const alertsCreated = []

  for (const document of documents) {
    const isExpired = document.expiresAt < now
    const alertType = isExpired ? "DOCUMENT_EXPIRED" : "DOCUMENT_EXPIRING"
    const severity = isExpired ? "HIGH" : "MEDIUM"

    // Check if alert already exists for this document
    const existingAlert = await db.alert.findFirst({
      where: {
        agencyId: agencyId,
        type: alertType,
        entityId: document.id,
        entityType: "DOCUMENT",
        resolvedAt: null
      }
    })

    if (!existingAlert) {
      const alert = await db.alert.create({
        data: {
          agencyId: agencyId,
          type: alertType,
          title: isExpired ? "Document Expired" : "Document Expiring Soon",
          message: `Document "${document.name}" ${isExpired ? "has expired" : "will expire soon"}`,
          severity,
          entityId: document.id,
          entityType: "DOCUMENT",
          recipientId: document.studentId || document.leadId,
          recipientType: document.studentId ? "STUDENT" : "LEAD",
          actionRequired: true,
          actionUrl: `/documents/${document.id}`,
          metadata: JSON.stringify({
            documentName: document.name,
            documentType: document.type,
            expiresAt: document.expiresAt,
            daysUntilExpiry: isExpired ? 0 : Math.ceil((document.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          })
        }
      })

      await sendAlertNotification(alert, agencyId)
      alertsCreated.push(alert)
    }
  }

  return NextResponse.json({
    success: true,
    message: `Checked ${documents.length} documents, created ${alertsCreated.length} alerts`,
    alertsCreated: alertsCreated.length
  })
}

// Helper function to check application deadlines
async function handleCheckApplicationDeadlines(agencyId: string) {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Find applications with approaching deadlines
  const applications = await db.application.findMany({
    where: {
      agencyId: agencyId,
      deadline: {
        gt: now,
        lt: sevenDaysFromNow
      },
      status: {
        in: ["PENDING", "UNDER_REVIEW", "IN_PROGRESS"]
      }
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
      university: {
        select: {
          name: true
        }
      }
    }
  })

  const alertsCreated = []

  for (const application of applications) {
    // Check if alert already exists for this application
    const existingAlert = await db.alert.findFirst({
      where: {
        agencyId: agencyId,
        type: "APPLICATION_DEADLINE",
        entityId: application.id,
        entityType: "APPLICATION",
        resolvedAt: null
      }
    })

    if (!existingAlert) {
      const daysUntilDeadline = Math.ceil((application.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const severity = daysUntilDeadline <= 3 ? "HIGH" : "MEDIUM"

      const alert = await db.alert.create({
        data: {
          agencyId: agencyId,
          type: "APPLICATION_DEADLINE",
          title: "Application Deadline Approaching",
          message: `Application to ${application.university.name} deadline is in ${daysUntilDeadline} days`,
          severity,
          entityId: application.id,
          entityType: "APPLICATION",
          recipientId: application.studentId,
          recipientType: "STUDENT",
          actionRequired: true,
          actionUrl: `/applications/${application.id}`,
          metadata: JSON.stringify({
            universityName: application.university.name,
            deadline: application.deadline,
            daysUntilDeadline: daysUntilDeadline
          })
        }
      })

      await sendAlertNotification(alert, agencyId)
      alertsCreated.push(alert)
    }
  }

  return NextResponse.json({
    success: true,
    message: `Checked ${applications.length} applications, created ${alertsCreated.length} alerts`,
    alertsCreated: alertsCreated.length
  })
}

// Helper functions
async function getAlertRecipient(recipientType: string, recipientId: string, agencyId: string) {
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

function getTaskOverdueSeverity(dueDate: Date, now: Date): string {
  const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysOverdue >= 7) return "CRITICAL"
  if (daysOverdue >= 3) return "HIGH"
  if (daysOverdue >= 1) return "MEDIUM"
  return "LOW"
}

async function sendAlertNotification(alert: any, agencyId: string) {
  await db.notification.create({
    data: {
      agencyId,
      type: alert.severity === "CRITICAL" ? "ERROR" : alert.severity === "HIGH" ? "WARNING" : "INFO",
      title: alert.title,
      message: alert.message,
      recipientId: alert.recipientId,
      recipientType: alert.recipientType,
      channel: "IN_APP",
      status: "PENDING",
      priority: alert.severity,
      data: JSON.stringify({
        alertId: alert.id,
        alertType: alert.type,
        actionRequired: alert.actionRequired,
        actionUrl: alert.actionUrl
      })
    }
  })
}