import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const updateLeadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "NURTURING", "CONVERTED", "LOST"]).optional(),
  assignedTo: z.string().optional(),
  customFields: z.any().optional(),
  converted: z.boolean().optional(),
  convertedAt: z.string().optional(),
  studentId: z.string().optional(),
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

    const lead = await db.lead.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      },
      include: {
        campaign: true,
        student: true,
        formSubmissions: {
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Parse JSON fields for response
    const processedLead = {
      ...lead,
      customFields: lead.customFields ? JSON.parse(lead.customFields) : null
    }

    return NextResponse.json(processedLead)
  } catch (error) {
    console.error("Error fetching lead:", error)
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
    const validatedData = updateLeadSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if lead exists and belongs to agency
    const existingLead = await db.lead.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const updateData: any = { ...validatedData }

    // Handle date conversion
    if (validatedData.convertedAt) {
      updateData.convertedAt = new Date(validatedData.convertedAt)
    }

    // Handle JSON field updates
    if (validatedData.customFields) {
      updateData.customFields = JSON.stringify(validatedData.customFields)
    }

    const lead = await db.lead.update({
      where: { id: params.id },
      data: updateData,
      include: {
        campaign: true,
        student: true,
        formSubmissions: {
          orderBy: { createdAt: "desc" }
        }
      }
    })

    // Parse JSON fields for response
    const processedLead = {
      ...lead,
      customFields: lead.customFields ? JSON.parse(lead.customFields) : null
    }

    return NextResponse.json(processedLead)
  } catch (error) {
    console.error("Error updating lead:", error)
    
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

    // Check if lead exists and belongs to agency
    const lead = await db.lead.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    await db.lead.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Lead deleted successfully" })
  } catch (error) {
    console.error("Error deleting lead:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}