import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const updateApplicationSchema = z.object({
  program: z.string().min(1).optional(),
  intake: z.string().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "WITHDRAWN"]).optional(),
  assignedTo: z.string().optional(),
  documents: z.array(z.any()).optional(),
  payments: z.array(z.any()).optional(),
  communications: z.array(z.any()).optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const application = await db.application.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      },
      include: {
        student: true,
        university: true
      }
    })

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    // Parse JSON fields for response
    const processedApplication = {
      ...application,
      documents: application.documents ? JSON.parse(application.documents) : [],
      payments: application.payments ? JSON.parse(application.payments) : [],
      communications: application.communications ? JSON.parse(application.communications) : []
    }

    return NextResponse.json(processedApplication)
  } catch (error) {
    console.error("Error fetching application:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateApplicationSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if application exists and belongs to agency
    const existingApplication = await db.application.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!existingApplication) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const updateData: any = { ...validatedData }

    // Handle JSON field updates
    if (validatedData.documents) {
      updateData.documents = JSON.stringify(validatedData.documents)
    }

    if (validatedData.payments) {
      updateData.payments = JSON.stringify(validatedData.payments)
    }

    if (validatedData.communications) {
      updateData.communications = JSON.stringify(validatedData.communications)
    }

    const application = await db.application.update({
      where: { id: params.id },
      data: updateData,
      include: {
        student: true,
        university: true
      }
    })

    // Parse JSON fields for response
    const processedApplication = {
      ...application,
      documents: application.documents ? JSON.parse(application.documents) : [],
      payments: application.payments ? JSON.parse(application.payments) : [],
      communications: application.communications ? JSON.parse(application.communications) : []
    }

    return NextResponse.json(processedApplication)
  } catch (error) {
    console.error("Error updating application:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Check if application exists and belongs to agency
    const application = await db.application.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    await db.application.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Application deleted successfully" })
  } catch (error) {
    console.error("Error deleting application:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}