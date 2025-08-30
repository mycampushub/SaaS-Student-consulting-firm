import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const qualificationCriteriaSchema = z.object({
  name: z.string().min(1, "Criteria name is required"),
  description: z.string().optional(),
  category: z.enum(["ACADEMIC", "FINANCIAL", "GEOGRAPHIC", "LANGUAGE", "EXPERIENCE", "CUSTOM"]).optional(),
  conditions: z.array(z.any()).min(1, "At least one condition is required"),
  weight: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional()
})

const updateQualificationCriteriaSchema = qualificationCriteriaSchema.partial()

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const category = searchParams.get("category")
    const isActive = searchParams.get("isActive")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where = {
      agencyId: agency.id,
      ...(category && { category: category }),
      ...(isActive !== null && { isActive: isActive === "true" })
    }

    const [criteria, total] = await Promise.all([
      db.qualificationCriteria.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.qualificationCriteria.count({ where })
    ])

    // Parse JSON fields
    const processedCriteria = criteria.map(criterion => ({
      ...criterion,
      conditions: criterion.conditions ? JSON.parse(criterion.conditions) : []
    }))

    return NextResponse.json({
      criteria: processedCriteria,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching qualification criteria:", error)
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
    const validatedData = qualificationCriteriaSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const criterion = await db.qualificationCriteria.create({
      data: {
        agencyId: agency.id,
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category || "ACADEMIC",
        conditions: JSON.stringify(validatedData.conditions),
        weight: validatedData.weight || 1.0,
        isActive: validatedData.isActive ?? true
      }
    })

    // Parse JSON fields for response
    const processedCriterion = {
      ...criterion,
      conditions: criterion.conditions ? JSON.parse(criterion.conditions) : []
    }

    return NextResponse.json(processedCriterion)
  } catch (error) {
    console.error("Error creating qualification criteria:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}