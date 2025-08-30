import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const leadScoreRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  description: z.string().optional(),
  category: z.enum(["ENGAGEMENT", "DEMOGRAPHIC", "ACADEMIC", "BEHAVIORAL", "SOURCE", "CUSTOM"]).optional(),
  conditions: z.array(z.any()).min(1, "At least one condition is required"),
  action: z.enum(["ADD", "SUBTRACT", "MULTIPLY", "SET"]).optional(),
  points: z.number().int().min(0).optional(),
  targetAudience: z.any().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).optional()
})

const updateLeadScoreRuleSchema = leadScoreRuleSchema.partial()

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

    const [rules, total] = await Promise.all([
      db.leadScoreRule.findMany({
        where,
        include: {
          leadScores: {
            include: {
              lead: true,
              student: true
            },
            orderBy: { createdAt: "desc" },
            take: 5
          }
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit
      }),
      db.leadScoreRule.count({ where })
    ])

    // Parse JSON fields
    const processedRules = rules.map(rule => ({
      ...rule,
      conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
      targetAudience: rule.targetAudience ? JSON.parse(rule.targetAudience) : null
    }))

    return NextResponse.json({
      rules: processedRules,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching lead score rules:", error)
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
    const validatedData = leadScoreRuleSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const rule = await db.leadScoreRule.create({
      data: {
        agencyId: agency.id,
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category || "ENGAGEMENT",
        conditions: JSON.stringify(validatedData.conditions),
        action: validatedData.action || "ADD",
        points: validatedData.points || 0,
        targetAudience: validatedData.targetAudience ? JSON.stringify(validatedData.targetAudience) : null,
        isActive: validatedData.isActive ?? true,
        priority: validatedData.priority || 0
      },
      include: {
        leadScores: {
          include: {
            lead: true,
            student: true
          }
        }
      }
    })

    // Parse JSON fields for response
    const processedRule = {
      ...rule,
      conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
      targetAudience: rule.targetAudience ? JSON.parse(rule.targetAudience) : null
    }

    return NextResponse.json(processedRule)
  } catch (error) {
    console.error("Error creating lead score rule:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}