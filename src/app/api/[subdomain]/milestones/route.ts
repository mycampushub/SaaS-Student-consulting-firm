import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const milestoneSchema = z.object({
  name: z.string().min(1, "Milestone name is required"),
  description: z.string().optional(),
  type: z.enum([
    "DOCUMENT_SUBMISSION", "APPLICATION_FILED", "INTERVIEW_SCHEDULED", "FEE_PAID",
    "VISA_SUBMITTED", "OFFER_RECEIVED", "OFFER_ACCEPTED", "VISA_APPROVED",
    "ENROLLMENT_CONFIRMED", "DEPARTURE_PREPARED", "CUSTOM"
  ]),
  category: z.enum(["GENERAL", "APPLICATION", "VISA", "FINANCIAL", "ACADEMIC", "LOGISTICAL", "CUSTOM"]).optional(),
  pipelineType: z.enum(["LEAD_CONVERSION", "STUDENT_ONBOARDING", "APPLICATION_PROCESSING", "VISA_PROCESSING", "DOCUMENT_COLLECTION", "GENERAL"]).optional(),
  stageName: z.string().optional(),
  triggerConditions: z.array(z.any()),
  requiredInputs: z.array(z.any()).optional(),
  expectedOutputs: z.array(z.any()).optional(),
  autoActions: z.array(z.any()).optional(),
  reminders: z.array(z.any()).optional(),
  slaDays: z.number().int().min(0).optional(),
  escalationRules: z.array(z.any()).optional(),
  isActive: z.boolean().optional(),
  isSystem: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const category = searchParams.get("category")
    const pipelineType = searchParams.get("pipelineType")
    const isActive = searchParams.get("isActive")
    const isSystem = searchParams.get("isSystem")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where: any = { agencyId: agency.id }
    
    if (type) where.type = type
    if (category) where.category = category
    if (pipelineType) where.pipelineType = pipelineType
    if (isActive !== null) where.isActive = isActive === "true"
    if (isSystem !== null) where.isSystem = isSystem === "true"

    const milestones = await db.milestone.findMany({
      where,
      include: {
        milestoneInstances: {
          take: 5,
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }]
    })

    // Parse JSON fields
    const processedMilestones = milestones.map(milestone => ({
      ...milestone,
      triggerConditions: JSON.parse(milestone.triggerConditions),
      requiredInputs: milestone.requiredInputs ? JSON.parse(milestone.requiredInputs) : [],
      expectedOutputs: milestone.expectedOutputs ? JSON.parse(milestone.expectedOutputs) : [],
      autoActions: milestone.autoActions ? JSON.parse(milestone.autoActions) : [],
      reminders: milestone.reminders ? JSON.parse(milestone.reminders) : [],
      escalationRules: milestone.escalationRules ? JSON.parse(milestone.escalationRules) : []
    }))

    return NextResponse.json({ milestones: processedMilestones })
  } catch (error) {
    console.error("Error fetching milestones:", error)
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
    const validatedData = milestoneSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const milestone = await db.milestone.create({
      data: {
        agencyId: agency.id,
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        category: validatedData.category || "GENERAL",
        pipelineType: validatedData.pipelineType,
        stageName: validatedData.stageName,
        triggerConditions: JSON.stringify(validatedData.triggerConditions),
        requiredInputs: validatedData.requiredInputs ? JSON.stringify(validatedData.requiredInputs) : null,
        expectedOutputs: validatedData.expectedOutputs ? JSON.stringify(validatedData.expectedOutputs) : null,
        autoActions: validatedData.autoActions ? JSON.stringify(validatedData.autoActions) : null,
        reminders: validatedData.reminders ? JSON.stringify(validatedData.reminders) : null,
        slaDays: validatedData.slaDays,
        escalationRules: validatedData.escalationRules ? JSON.stringify(validatedData.escalationRules) : null,
        isActive: validatedData.isActive ?? true,
        isSystem: validatedData.isSystem ?? false
      }
    })

    // Parse JSON fields for response
    const processedMilestone = {
      ...milestone,
      triggerConditions: JSON.parse(milestone.triggerConditions),
      requiredInputs: milestone.requiredInputs ? JSON.parse(milestone.requiredInputs) : [],
      expectedOutputs: milestone.expectedOutputs ? JSON.parse(milestone.expectedOutputs) : [],
      autoActions: milestone.autoActions ? JSON.parse(milestone.autoActions) : [],
      reminders: milestone.reminders ? JSON.parse(milestone.reminders) : [],
      escalationRules: milestone.escalationRules ? JSON.parse(milestone.escalationRules) : []
    }

    return NextResponse.json(processedMilestone)
  } catch (error) {
    console.error("Error creating milestone:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}