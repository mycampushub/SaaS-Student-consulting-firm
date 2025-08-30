import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["EMAIL", "SMS", "SOCIAL_MEDIA", "GOOGLE_ADS", "FACEBOOK_ADS", "CONTENT", "WEBINAR", "EVENT"]).optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  targetAudience: z.array(z.any()).optional(),
  content: z.any().optional(),
  templateId: z.string().optional(),
  workflowId: z.string().optional(),
  budget: z.number().min(0).optional(),
  scheduledAt: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
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

    const campaign = await db.marketingCampaign.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      },
      include: {
        workflow: true,
        leads: {
          orderBy: { createdAt: "desc" },
          take: 20
        }
      }
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Parse JSON fields for response
    const processedCampaign = {
      ...campaign,
      targetAudience: campaign.targetAudience ? JSON.parse(campaign.targetAudience) : null,
      content: campaign.content ? JSON.parse(campaign.content) : null
    }

    return NextResponse.json(processedCampaign)
  } catch (error) {
    console.error("Error fetching campaign:", error)
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
    const validatedData = updateCampaignSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if campaign exists and belongs to agency
    const existingCampaign = await db.marketingCampaign.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const updateData: any = { ...validatedData }

    // Handle date conversions
    if (validatedData.scheduledAt) {
      updateData.scheduledAt = new Date(validatedData.scheduledAt)
    }
    if (validatedData.startedAt) {
      updateData.startedAt = new Date(validatedData.startedAt)
    }
    if (validatedData.completedAt) {
      updateData.completedAt = new Date(validatedData.completedAt)
    }

    // Handle JSON field updates
    if (validatedData.targetAudience) {
      updateData.targetAudience = JSON.stringify(validatedData.targetAudience)
    }

    if (validatedData.content) {
      updateData.content = JSON.stringify(validatedData.content)
    }

    const campaign = await db.marketingCampaign.update({
      where: { id: params.id },
      data: updateData,
      include: {
        workflow: true,
        leads: {
          orderBy: { createdAt: "desc" },
          take: 20
        }
      }
    })

    // Parse JSON fields for response
    const processedCampaign = {
      ...campaign,
      targetAudience: campaign.targetAudience ? JSON.parse(campaign.targetAudience) : null,
      content: campaign.content ? JSON.parse(campaign.content) : null
    }

    return NextResponse.json(processedCampaign)
  } catch (error) {
    console.error("Error updating campaign:", error)
    
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

    // Check if campaign exists and belongs to agency
    const campaign = await db.marketingCampaign.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    await db.marketingCampaign.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Campaign deleted successfully" })
  } catch (error) {
    console.error("Error deleting campaign:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}