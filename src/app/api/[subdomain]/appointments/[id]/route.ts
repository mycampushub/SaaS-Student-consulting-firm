import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const updateAppointmentSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  type: z.enum(["CONSULTATION", "FOLLOW_UP", "DOCUMENT_REVIEW", "INTERVIEW", "MEETING", "CUSTOM"]).optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
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

const rescheduleSchema = z.object({
  newStartTime: z.date(),
  newEndTime: z.date(),
  reason: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const appointment = await db.appointment.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
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
        },
        reminders: true
      }
    })

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    return NextResponse.json(appointment)
  } catch (error) {
    console.error("Error fetching appointment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existingAppointment = await db.appointment.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!existingAppointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    if (action === "reschedule") {
      const validatedData = rescheduleSchema.parse(body)
      return await handleReschedule(existingAppointment, validatedData, agency.id)
    } else if (action === "cancel") {
      return await handleCancel(existingAppointment, body.reason, agency.id)
    } else if (action === "confirm") {
      return await handleConfirm(existingAppointment, agency.id)
    } else if (action === "complete") {
      return await handleComplete(existingAppointment, body.notes, agency.id)
    } else {
      const validatedData = updateAppointmentSchema.parse(body)
      return await handleUpdate(existingAppointment, validatedData, agency.id)
    }
  } catch (error) {
    console.error("Error updating appointment:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const existingAppointment = await db.appointment.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!existingAppointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Delete associated reminders
    await db.reminder.deleteMany({
      where: {
        agencyId: agency.id,
        data: {
          path: ["appointmentId"],
          equals: params.id
        }
      }
    })

    // Delete appointment
    await db.appointment.delete({
      where: { id: params.id }
    })

    // Send cancellation notifications
    await sendCancellationNotifications(existingAppointment, agency.id)

    return NextResponse.json({ success: true, message: "Appointment deleted successfully" })
  } catch (error) {
    console.error("Error deleting appointment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handleUpdate(appointment: any, data: any, agencyId: string) {
  // Check time slot availability if times are being updated
  if (data.startTime || data.endTime) {
    const startTime = data.startTime || appointment.startTime
    const endTime = data.endTime || appointment.endTime
    const assignedTo = data.assignedTo || appointment.assignedTo

    const isAvailable = await checkTimeSlotAvailability(startTime, endTime, assignedTo, agencyId)
    if (!isAvailable) {
      return NextResponse.json({ error: "Time slot is not available" }, { status: 400 })
    }
  }

  // Update appointment
  const updatedAppointment = await db.appointment.update({
    where: { id: appointment.id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.type && { type: data.type }),
      ...(data.startTime && { startTime: data.startTime }),
      ...(data.endTime && { endTime: data.endTime }),
      ...(data.studentId && { studentId: data.studentId }),
      ...(data.leadId && { leadId: data.leadId }),
      ...(data.assignedTo && { assignedTo: data.assignedTo }),
      ...(data.location && { location: data.location }),
      ...(data.virtualMeetingUrl && { virtualMeetingUrl: data.virtualMeetingUrl }),
      ...(data.notes && { notes: data.notes }),
      ...(data.reminderEnabled !== undefined && { reminderEnabled: data.reminderEnabled }),
      ...(data.reminderMinutesBefore && { reminderMinutesBefore: data.reminderMinutesBefore }),
      ...(data.status && { status: data.status }),
      ...(data.priority && { priority: data.priority })
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

  // Update reminder if needed
  if (data.reminderEnabled !== undefined || data.startTime || data.reminderMinutesBefore) {
    await updateAppointmentReminder(updatedAppointment, agencyId)
  }

  return NextResponse.json(updatedAppointment)
}

async function handleReschedule(appointment: any, data: any, agencyId: string) {
  const { newStartTime, newEndTime, reason } = data

  // Check time slot availability
  const isAvailable = await checkTimeSlotAvailability(newStartTime, newEndTime, appointment.assignedTo, agencyId)
  if (!isAvailable) {
    return NextResponse.json({ error: "Time slot is not available" }, { status: 400 })
  }

  // Update appointment
  const updatedAppointment = await db.appointment.update({
    where: { id: appointment.id },
    data: {
      startTime: newStartTime,
      endTime: newEndTime,
      notes: appointment.notes ? `${appointment.notes}\n\nRescheduled: ${reason}` : `Rescheduled: ${reason}`
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

  // Update reminder
  await updateAppointmentReminder(updatedAppointment, agencyId)

  // Send reschedule notifications
  await sendRescheduleNotifications(updatedAppointment, reason, agencyId)

  return NextResponse.json({
    success: true,
    appointment: updatedAppointment,
    message: "Appointment rescheduled successfully"
  })
}

async function handleCancel(appointment: any, reason: string, agencyId: string) {
  // Update appointment status
  const updatedAppointment = await db.appointment.update({
    where: { id: appointment.id },
    data: {
      status: "CANCELLED",
      notes: appointment.notes ? `${appointment.notes}\n\nCancelled: ${reason}` : `Cancelled: ${reason}`
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

  // Delete reminders
  await db.reminder.deleteMany({
    where: {
      agencyId: agencyId,
      data: {
        path: ["appointmentId"],
        equals: appointment.id
      }
    }
  })

  // Send cancellation notifications
  await sendCancellationNotifications(updatedAppointment, agencyId)

  return NextResponse.json({
    success: true,
    appointment: updatedAppointment,
    message: "Appointment cancelled successfully"
  })
}

async function handleConfirm(appointment: any, agencyId: string) {
  const updatedAppointment = await db.appointment.update({
    where: { id: appointment.id },
    data: {
      status: "CONFIRMED"
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

  // Send confirmation notifications
  await sendConfirmationNotifications(updatedAppointment, agencyId)

  return NextResponse.json({
    success: true,
    appointment: updatedAppointment,
    message: "Appointment confirmed successfully"
  })
}

async function handleComplete(appointment: any, notes: string, agencyId: string) {
  const updatedAppointment = await db.appointment.update({
    where: { id: appointment.id },
    data: {
      status: "COMPLETED",
      notes: notes ? `${appointment.notes}\n\nCompleted: ${notes}` : appointment.notes
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

  // Delete reminders
  await db.reminder.deleteMany({
    where: {
      agencyId: agencyId,
      data: {
        path: ["appointmentId"],
        equals: appointment.id
      }
    }
  })

  // Send completion notifications
  await sendCompletionNotifications(updatedAppointment, agencyId)

  return NextResponse.json({
    success: true,
    appointment: updatedAppointment,
    message: "Appointment completed successfully"
  })
}

// Helper functions
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

async function updateAppointmentReminder(appointment: any, agencyId: string) {
  // Delete existing reminders
  await db.reminder.deleteMany({
    where: {
      agencyId: agencyId,
      data: {
        path: ["appointmentId"],
        equals: appointment.id
      }
    }
  })

  // Create new reminder if enabled
  if (appointment.reminderEnabled) {
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
}

async function sendRescheduleNotifications(appointment: any, reason: string, agencyId: string) {
  // Notify assigned user
  if (appointment.assignedTo) {
    await db.notification.create({
      data: {
        agencyId,
        type: "WARNING",
        title: "Appointment Rescheduled",
        message: `Appointment "${appointment.title}" has been rescheduled to ${appointment.startTime.toLocaleString()}. Reason: ${reason}`,
        recipientId: appointment.assignedTo,
        recipientType: "USER",
        channel: "IN_APP",
        status: "PENDING",
        priority: "HIGH",
        data: JSON.stringify({
          appointmentId: appointment.id,
          appointmentType: appointment.type,
          newTime: appointment.startTime,
          reason: reason
        })
      }
    })
  }

  // Notify student/lead
  const recipientId = appointment.studentId || appointment.leadId
  const recipientType = appointment.studentId ? "STUDENT" : "LEAD"

  if (recipientId) {
    await db.notification.create({
      data: {
        agencyId,
        type: "WARNING",
        title: "Appointment Rescheduled",
        message: `Your appointment "${appointment.title}" has been rescheduled to ${appointment.startTime.toLocaleString()}`,
        recipientId: recipientId,
        recipientType: recipientType,
        channel: "EMAIL",
        status: "PENDING",
        priority: "HIGH",
        data: JSON.stringify({
          appointmentId: appointment.id,
          appointmentType: appointment.type,
          newTime: appointment.startTime,
          reason: reason
        })
      }
    })
  }
}

async function sendCancellationNotifications(appointment: any, agencyId: string) {
  // Notify assigned user
  if (appointment.assignedTo) {
    await db.notification.create({
      data: {
        agencyId,
        type: "ERROR",
        title: "Appointment Cancelled",
        message: `Appointment "${appointment.title}" has been cancelled`,
        recipientId: appointment.assignedTo,
        recipientType: "USER",
        channel: "IN_APP",
        status: "PENDING",
        priority: "HIGH",
        data: JSON.stringify({
          appointmentId: appointment.id,
          appointmentType: appointment.type
        })
      }
    })
  }

  // Notify student/lead
  const recipientId = appointment.studentId || appointment.leadId
  const recipientType = appointment.studentId ? "STUDENT" : "LEAD"

  if (recipientId) {
    await db.notification.create({
      data: {
        agencyId,
        type: "ERROR",
        title: "Appointment Cancelled",
        message: `Your appointment "${appointment.title}" has been cancelled`,
        recipientId: recipientId,
        recipientType: recipientType,
        channel: "EMAIL",
        status: "PENDING",
        priority: "HIGH",
        data: JSON.stringify({
          appointmentId: appointment.id,
          appointmentType: appointment.type
        })
      }
    })
  }
}

async function sendConfirmationNotifications(appointment: any, agencyId: string) {
  // Notify assigned user
  if (appointment.assignedTo) {
    await db.notification.create({
      data: {
        agencyId,
        type: "SUCCESS",
        title: "Appointment Confirmed",
        message: `Appointment "${appointment.title}" has been confirmed for ${appointment.startTime.toLocaleString()}`,
        recipientId: appointment.assignedTo,
        recipientType: "USER",
        channel: "IN_APP",
        status: "PENDING",
        priority: "MEDIUM",
        data: JSON.stringify({
          appointmentId: appointment.id,
          appointmentType: appointment.type,
          appointmentTime: appointment.startTime
        })
      }
    })
  }

  // Notify student/lead
  const recipientId = appointment.studentId || appointment.leadId
  const recipientType = appointment.studentId ? "STUDENT" : "LEAD"

  if (recipientId) {
    await db.notification.create({
      data: {
        agencyId,
        type: "SUCCESS",
        title: "Appointment Confirmed",
        message: `Your appointment "${appointment.title}" has been confirmed for ${appointment.startTime.toLocaleString()}`,
        recipientId: recipientId,
        recipientType: recipientType,
        channel: "EMAIL",
        status: "PENDING",
        priority: "MEDIUM",
        data: JSON.stringify({
          appointmentId: appointment.id,
          appointmentType: appointment.type,
          appointmentTime: appointment.startTime
        })
      }
    })
  }
}

async function sendCompletionNotifications(appointment: any, agencyId: string) {
  // Notify assigned user
  if (appointment.assignedTo) {
    await db.notification.create({
      data: {
        agencyId,
        type: "INFO",
        title: "Appointment Completed",
        message: `Appointment "${appointment.title}" has been completed`,
        recipientId: appointment.assignedTo,
        recipientType: "USER",
        channel: "IN_APP",
        status: "PENDING",
        priority: "LOW",
        data: JSON.stringify({
          appointmentId: appointment.id,
          appointmentType: appointment.type
        })
      }
    })
  }

  // Notify student/lead
  const recipientId = appointment.studentId || appointment.leadId
  const recipientType = appointment.studentId ? "STUDENT" : "LEAD"

  if (recipientId) {
    await db.notification.create({
      data: {
        agencyId,
        type: "INFO",
        title: "Appointment Completed",
        message: `Your appointment "${appointment.title}" has been completed`,
        recipientId: recipientId,
        recipientType: recipientType,
        channel: "EMAIL",
        status: "PENDING",
        priority: "LOW",
        data: JSON.stringify({
          appointmentId: appointment.id,
          appointmentType: appointment.type
        })
      }
    })
  }
}