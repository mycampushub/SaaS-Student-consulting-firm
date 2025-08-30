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
    const category = searchParams.get("category")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where = {
      agencyId: agency.id,
      ...(status && { status: status }),
      ...(category && { category: category })
    }

    const [workflows, total] = await Promise.all([
      db.workflow.findMany({
        where,
        include: {
          marketingCampaigns: true
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.workflow.count({ where })
    ])

    return NextResponse.json({
      workflows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching workflows:", error)
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
      category,
      triggers,
      nodes,
      edges,
      isActive,
      priority
    } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const workflow = await db.workflow.create({
      data: {
        agencyId: agency.id,
        name,
        description,
        category,
        triggers: JSON.stringify(triggers),
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
        isActive: isActive || false,
        priority: priority || 0
      },
      include: {
        marketingCampaigns: true
      }
    })

    return NextResponse.json(workflow)
  } catch (error) {
    console.error("Error creating workflow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}