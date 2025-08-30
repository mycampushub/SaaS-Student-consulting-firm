import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const pipelineSchema = z.object({
  name: z.string().min(1, "Pipeline name is required"),
  description: z.string().optional(),
  type: z.enum(["LEAD_CONVERSION", "STUDENT_ONBOARDING", "APPLICATION_PROCESSING", "VISA_PROCESSING", "DOCUMENT_COLLECTION", "GENERAL"]),
  category: z.enum(["GENERAL", "LEAD", "STUDENT", "APPLICATION", "VISA", "CUSTOM"]),
  stages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    order: z.number().int().min(0),
    color: z.string().optional(),
    duration: z.number().int().min(0).optional(), // in days
    requirements: z.array(z.any()).optional(),
    automation: z.any().optional()
  })).min(2, "At least 2 stages are required"),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional()
})

const updatePipelineSchema = pipelineSchema.partial()

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
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
      ...(type && { type: type }),
      ...(category && { category: category }),
      ...(isActive !== null && { isActive: isActive === "true" })
    }

    const pipelines = await db.pipeline.findMany({
      where,
      include: {
        pipelineEntries: {
          include: {
            student: true,
            lead: true,
            application: true
          },
          orderBy: { enteredAt: "desc" },
          take: 5
        }
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    })

    // Parse JSON fields
    const processedPipelines = pipelines.map(pipeline => ({
      ...pipeline,
      stages: pipeline.stages ? JSON.parse(pipeline.stages) : []
    }))

    return NextResponse.json({
      pipelines: processedPipelines
    })
  } catch (error) {
    console.error("Error fetching pipelines:", error)
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
    const validatedData = pipelineSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // If this is set as default, unset other default pipelines of the same type
    if (validatedData.isDefault) {
      await db.pipeline.updateMany({
        where: {
          agencyId: agency.id,
          type: validatedData.type,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    const pipeline = await db.pipeline.create({
      data: {
        agencyId: agency.id,
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        category: validatedData.category,
        stages: JSON.stringify(validatedData.stages),
        isActive: validatedData.isActive ?? true,
        isDefault: validatedData.isDefault ?? false
      },
      include: {
        pipelineEntries: {
          include: {
            student: true,
            lead: true,
            application: true
          }
        }
      }
    })

    // Parse JSON fields for response
    const processedPipeline = {
      ...pipeline,
      stages: pipeline.stages ? JSON.parse(pipeline.stages) : []
    }

    return NextResponse.json(processedPipeline)
  } catch (error) {
    console.error("Error creating pipeline:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}