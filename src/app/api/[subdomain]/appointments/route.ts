import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const appointmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["CONSULTATION", "FOLLOW_UP", "DOCUMENT_REVIEW", "INTERVIEW", "MEETING", "CUSTOM"]),
  startTime: z.date(),
  endTime: z.date(),
  studentId: z.string().optional(),
  leadId: z.string().optional(),
  assignedTo: z.string().optional(),
  location: z.string().optional(),
  virtualMeetingUrl: z.string().optional(),
  notes: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderMinutesBefore: z.number().int().min(0).optional(),
  status: z.enum(["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional()
})

const updateAppointmentSchema = appointmentSchema.partial()

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
    const assignedTo = searchParams.get("assignedTo")
    const studentId = searchParams.get("studentId")
    const leadId = searchParams.get("leadId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const upcoming = searchParams.get("upcoming") === "true"

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
      ...(assignedTo && { assignedTo: assignedTo }),
      ...(studentId && { studentId: studentId }),
      ...(leadId && { leadId: leadId }),
      ...(startDate && endDate && {
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }),
      ...(upcoming && {
        startTime: {
          gte: new Date()
        },
        status: {
          in: ["SCHEDULED", "CONFIRMED"]
        }
      })
    }

    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
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
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          reminders: true
        },
        orderBy: [{ startTime: "asc" }, { priority: "desc" }],
        skip: (page - 1) * limit,
        take: limit
      }),
      db.appointment.count({ where })
    ])

    return NextResponse.json({
      appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching appointments:", error)
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
    const validatedData = appointmentSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Validate time slot availability
    const isAvailable = await checkTimeSlotAvailability(
      validatedData.startTime,
      validatedData.endTime,
      validatedData.assignedTo,
      agency.id
    )

    if (!isAvailable) {
      return NextResponse.json({ error: "Time slot is not available" }, { status: 400 })
    }

    // Validate assigned user exists and belongs to agency
    if (validatedData.assignedTo) {
      const assignedUser = await db.user.findFirst({
        where: { id: validatedData.assignedTo, agencyId: agency.id }
      })
      if (!assignedUser) {
        return NextResponse.json({ error: "Assigned user not found" }, { status: 404 })
      }
    }

    // Validate student/lead exists and belongs to agency
    if (validatedData.studentId) {
      const student = await db.student.findFirst({
        where: { id: validatedData.studentId, agencyId: agency.id }
      })
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }
    }

    if (validatedData.leadId) {
      const lead = await db.lead.findFirst({
        where: { id: validatedData.leadId, agencyId: agency.id }
      })
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 })
      }
    }

    // Create appointment
    const appointment = await db.appointment.create({
      data: {
        agencyId: agency.id,
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        studentId: validatedData.studentId,
        leadId: validatedData.leadId,
        assignedTo: validatedData.assignedTo,
        location: validatedData.location,
        virtualMeetingUrl: validatedData.virtualMeetingUrl,
        notes: validatedData.notes,
        reminderEnabled: validatedData.reminderEnabled ?? true,
        reminderMinutesBefore: validatedData.reminderMinutesBefore || 30,
        status: validatedData.status || "SCHEDULED",
        priority: validatedData.priority || "MEDIUM"
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
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    // Create reminder if enabled
    if (appointment.reminderEnabled) {
      await createAppointmentReminder(appointment, agency.id)
    }

    // Send confirmation notifications
    await sendAppointmentConfirmation(appointment, agency.id)

    return NextResponse.json(appointment)
  } catch (error) {
    console.error("Error creating appointment:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to check time slot availability
async function checkTimeSlotAvailability(startTime: Date, endTime: Date, assignedTo: string | undefined, agencyId: string): Promise<boolean> {
  const where: any = {
    agencyId: agencyId,
    status: {
      in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"]
    },
    OR: [
      {
        AND: [
          { startTime: { lte: startTime } },
          { endTime: { gt: startTime } }
        ]
      },
      {
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gte: endTime } }
        ]
      },
      {
        AND: [
          { startTime: { gte: startTime } },
          { endTime: { lte: endTime } }
        ]
      }
    ]
  }

  if (assignedTo) {
    where.assignedTo = assignedTo
  }

  const conflictingAppointments = await db.appointment.count({ where })
  return conflictingAppointments === 0
}

// Helper function to create appointment reminder
async function createAppointmentReminder(appointment: any, agencyId: string) {
  const reminderTime = new Date(appointment.startTime.getTime() - (appointment.reminderMinutesBefore * 60 * 1000))

  await db.reminder.create({
    data: {
      agencyId,
      type: "APPOINTMENT",
      title: `Appointment: ${appointment.title}`,
      message: `Your appointment "${appointment.title}" is scheduled for ${appointment.startTime.toLocaleString()}`,
      scheduledFor: reminderTime,
      recipientId: appointment.assignedTo || appointment.studentId || appointment.leadId,
      recipientType: appointment.assignedTo ? "USER" : appointment.studentId ? "STUDENT" : "LEAD",
      status: "SCHEDULED",
      data: JSON.stringify({
        appointmentId: appointment.id,
        appointmentType: appointment.type,
        appointmentTime: appointment.startTime,
        location: appointment.location,
        virtualMeetingUrl: appointment.virtualMeetingUrl
      })
    }
  })
}

// Helper function to send appointment confirmation
async function sendAppointmentConfirmation(appointment: any, agencyId: string) {
  // Notify assigned user
  if (appointment.assignedTo) {
    await db.notification.create({
      data: {
        agencyId,
        type: "INFO",
        title: "New Appointment Scheduled",
        message: `You have a new appointment: ${appointment.title} on ${appointment.startTime.toLocaleString()}`,
        recipientId: appointment.assignedTo,
        recipientType: "USER",
        channel: "IN_APP",
        status: "PENDING",
        priority: "MEDIUM",
        data: JSON.stringify({
          appointmentId: appointment.id,
          appointmentType: appointment.type,
          appointmentTime: appointment.startTime,
          location: appointment.location,
          virtualMeetingUrl: appointment.virtualMeetingUrl
        })
      }
    })
  }

  // Notify student/lead
  const recipientId = appointment.studentId || appointment.leadId
  const recipientType = appointment.studentId ? "STUDENT" : "LEAD"
  const recipientEmail = appointment.student?.email || appointment.lead?.email

  if (recipientId && recipientEmail) {
    await db.notification.create({
      data: {
        agencyId,
        type: "SUCCESS",
        title: "Appointment Confirmation",
        message: `Your appointment "${appointment.title}" has been scheduled for ${appointment.startTime.toLocaleString()}`,
        recipientId: recipientId,
        recipientType: recipientType,
        channel: "EMAIL",
        status: "PENDING",
        priority: "MEDIUM",
        data: JSON.stringify({
          appointmentId: appointment.id,
          appointmentType: appointment.type,
          appointmentTime: appointment.startTime,
          location: appointment.location,
          virtualMeetingUrl: appointment.virtualMeetingUrl
        })
      }
    })
  }
}