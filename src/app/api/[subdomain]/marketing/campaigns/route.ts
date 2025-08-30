import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where = {
      agencyId: agency.id,
      ...(status && { status: status }),
      ...(type && { type: type })
    }

    const [campaigns, total] = await Promise.all([
      db.marketingCampaign.findMany({
        where,
        include: {
          workflow: true,
          leads: {
            take: 5,
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.marketingCampaign.count({ where })
    ])

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching marketing campaigns:", error)
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
    const {
      name,
      description,
      type,
      targetAudience,
      content,
      templateId,
      workflowId,
      budget,
      scheduledAt
    } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const campaign = await db.marketingCampaign.create({
      data: {
        agencyId: agency.id,
        name,
        description,
        type,
        targetAudience: targetAudience ? JSON.stringify(targetAudience) : null,
        content: content ? JSON.stringify(content) : null,
        templateId,
        workflowId,
        budget,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null
      },
      include: {
        workflow: true,
        leads: true
      }
    })

    return NextResponse.json(campaign)
  } catch (error) {
    console.error("Error creating marketing campaign:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}