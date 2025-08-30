import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const leadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "NURTURING", "CONVERTED", "LOST"]).optional(),
  assignedTo: z.string().optional(),
  customFields: z.any().optional(),
  campaignId: z.string().optional(),
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
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const source = searchParams.get("source")
    const campaignId = searchParams.get("campaignId")
    const assignedTo = searchParams.get("assignedTo")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where = {
      agencyId: agency.id,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } }
        ]
      }),
      ...(status && { status: status }),
      ...(source && { source: source }),
      ...(campaignId && { campaignId: campaignId }),
      ...(assignedTo && { assignedTo: assignedTo })
    }

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        include: {
          campaign: true,
          student: true,
          formSubmissions: {
            orderBy: { createdAt: "desc" },
            take: 5
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.lead.count({ where })
    ])

    // Parse JSON fields
    const processedLeads = leads.map(lead => ({
      ...lead,
      customFields: lead.customFields ? JSON.parse(lead.customFields) : null
    }))

    return NextResponse.json({
      leads: processedLeads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching leads:", error)
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
    const validatedData = leadSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Validate campaignId if provided
    if (validatedData.campaignId) {
      const campaign = await db.marketingCampaign.findFirst({
        where: {
          id: validatedData.campaignId,
          agencyId: agency.id
        }
      })

      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
      }
    }

    const lead = await db.lead.create({
      data: {
        agencyId: agency.id,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        source: validatedData.source,
        status: validatedData.status || "NEW",
        assignedTo: validatedData.assignedTo,
        customFields: validatedData.customFields ? JSON.stringify(validatedData.customFields) : null,
        campaignId: validatedData.campaignId
      },
      include: {
        campaign: true,
        student: true,
        formSubmissions: true
      }
    })

    // Parse JSON fields for response
    const processedLead = {
      ...lead,
      customFields: lead.customFields ? JSON.parse(lead.customFields) : null
    }

    return NextResponse.json(processedLead)
  } catch (error) {
    console.error("Error creating lead:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}