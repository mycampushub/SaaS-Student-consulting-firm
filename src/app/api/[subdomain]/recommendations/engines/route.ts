import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const engineSchema = z.object({
  name: z.string().min(1, "Engine name is required"),
  description: z.string().optional(),
  type: z.enum([
    "UNIVERSITY_RECOMMENDATION", "PROGRAM_RECOMMENDATION", "SCHOLARSHIP_RECOMMENDATION",
    "VISA_PATHWAY_RECOMMENDATION", "ACCOMMODATION_RECOMMENDATION", "CAREER_PATH_RECOMMENDATION", "CUSTOM"
  ]),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT", "ARCHIVED"]).optional(),
  matchingRules: z.array(z.any()),
  scoringWeights: z.any(),
  filters: z.array(z.any()).optional(),
  requiredInputs: z.array(z.string()).optional(),
  optionalInputs: z.array(z.string()).optional(),
  maxResults: z.number().int().min(1).max(100).optional(),
  minScore: z.number().min(0).max(1).optional(),
  sortCriteria: z.any().optional(),
  isDefault: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const isDefault = searchParams.get("default")

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if automated recommendations are enabled
    if (!agency.featureSettings?.automatedRecommendations) {
      return NextResponse.json({ 
        error: "Automated recommendations are not enabled for this agency" 
      }, { status: 403 })
    }

    const where: any = { agencyId: agency.id }
    
    if (type) where.type = type
    if (status) where.status = status
    if (isDefault !== null) where.isDefault = isDefault === "true"

    const engines = await db.recommendationEngine.findMany({
      where,
      include: {
        recommendations: {
          take: 5,
          orderBy: { generatedAt: "desc" }
        }
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }]
    })

    // Parse JSON fields
    const processedEngines = engines.map(engine => ({
      ...engine,
      matchingRules: JSON.parse(engine.matchingRules),
      scoringWeights: JSON.parse(engine.scoringWeights),
      filters: engine.filters ? JSON.parse(engine.filters) : [],
      requiredInputs: engine.requiredInputs ? JSON.parse(engine.requiredInputs) : [],
      optionalInputs: engine.optionalInputs ? JSON.parse(engine.optionalInputs) : [],
      sortCriteria: engine.sortCriteria ? JSON.parse(engine.sortCriteria) : []
    }))

    return NextResponse.json({ engines: processedEngines })
  } catch (error) {
    console.error("Error fetching recommendation engines:", error)
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
    const validatedData = engineSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if automated recommendations are enabled
    if (!agency.featureSettings?.automatedRecommendations) {
      return NextResponse.json({ 
        error: "Automated recommendations are not enabled for this agency" 
      }, { status: 403 })
    }

    // If this is set as default, unset other default engines
    if (validatedData.isDefault) {
      await db.recommendationEngine.updateMany({
        where: {
          agencyId: agency.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    const engine = await db.recommendationEngine.create({
      data: {
        agencyId: agency.id,
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        status: validatedData.status || "ACTIVE",
        matchingRules: JSON.stringify(validatedData.matchingRules),
        scoringWeights: JSON.stringify(validatedData.scoringWeights),
        filters: validatedData.filters ? JSON.stringify(validatedData.filters) : null,
        requiredInputs: validatedData.requiredInputs ? JSON.stringify(validatedData.requiredInputs) : null,
        optionalInputs: validatedData.optionalInputs ? JSON.stringify(validatedData.optionalInputs) : null,
        maxResults: validatedData.maxResults || 10,
        minScore: validatedData.minScore || 0.5,
        sortCriteria: validatedData.sortCriteria ? JSON.stringify(validatedData.sortCriteria) : null,
        isDefault: validatedData.isDefault || false
      }
    })

    // Parse JSON fields for response
    const processedEngine = {
      ...engine,
      matchingRules: JSON.parse(engine.matchingRules),
      scoringWeights: JSON.parse(engine.scoringWeights),
      filters: engine.filters ? JSON.parse(engine.filters) : [],
      requiredInputs: engine.requiredInputs ? JSON.parse(engine.requiredInputs) : [],
      optionalInputs: engine.optionalInputs ? JSON.parse(engine.optionalInputs) : [],
      sortCriteria: engine.sortCriteria ? JSON.parse(engine.sortCriteria) : []
    }

    return NextResponse.json(processedEngine)
  } catch (error) {
    console.error("Error creating recommendation engine:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}