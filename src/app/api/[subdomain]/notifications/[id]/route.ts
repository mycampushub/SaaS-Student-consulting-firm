import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const updateNotificationSchema = z.object({
  status: z.enum(["PENDING", "SENT", "DELIVERED", "READ", "DISMISSED", "FAILED"]).optional(),
  readAt: z.date().optional(),
  deliveredAt: z.date().optional()
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

    const notification = await db.notification.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
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
        },
        emailMessage: true,
        smsMessage: true,
        whatsappMessage: true
      }
    })

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    // Parse JSON data field
    const processedNotification = {
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : null
    }

    return NextResponse.json(processedNotification)
  } catch (error) {
    console.error("Error fetching notification:", error)
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
    const validatedData = updateNotificationSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if notification exists and belongs to agency
    const existingNotification = await db.notification.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!existingNotification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    // Update notification
    const updatedNotification = await db.notification.update({
      where: { id: params.id },
      data: {
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.readAt && { readAt: validatedData.readAt }),
        ...(validatedData.deliveredAt && { deliveredAt: validatedData.deliveredAt }),
        // Auto-set readAt if status is being set to READ
        ...(validatedData.status === "READ" && !validatedData.readAt && { readAt: new Date() })
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

    // Parse JSON data for response
    const processedNotification = {
      ...updatedNotification,
      data: updatedNotification.data ? JSON.parse(updatedNotification.data) : null
    }

    return NextResponse.json(processedNotification)
  } catch (error) {
    console.error("Error updating notification:", error)
    
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

    // Check if notification exists and belongs to agency
    const existingNotification = await db.notification.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!existingNotification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    // Delete notification
    await db.notification.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true, message: "Notification deleted successfully" })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}