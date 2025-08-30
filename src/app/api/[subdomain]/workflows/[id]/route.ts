import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(["GENERAL", "LEAD_NURTURING", "STUDENT_ONBOARDING", "FOLLOW_UP", "NOTIFICATION", "INTEGRATION"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
  triggers: z.array(z.any()).optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().min(0).optional(),
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

    const workflow = await db.workflow.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      },
      include: {
        marketingCampaigns: true
      }
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    // Parse JSON fields for response
    const processedWorkflow = {
      ...workflow,
      triggers: workflow.triggers ? JSON.parse(workflow.triggers) : [],
      nodes: workflow.nodes ? JSON.parse(workflow.nodes) : [],
      edges: workflow.edges ? JSON.parse(workflow.edges) : []
    }

    return NextResponse.json(processedWorkflow)
  } catch (error) {
    console.error("Error fetching workflow:", error)
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
    const validatedData = updateWorkflowSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if workflow exists and belongs to agency
    const existingWorkflow = await db.workflow.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!existingWorkflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    const updateData: any = { ...validatedData }

    // Handle JSON field updates
    if (validatedData.triggers) {
      updateData.triggers = JSON.stringify(validatedData.triggers)
    }

    if (validatedData.nodes) {
      updateData.nodes = JSON.stringify(validatedData.nodes)
    }

    if (validatedData.edges) {
      updateData.edges = JSON.stringify(validatedData.edges)
    }

    // Update lastExecutedAt when activating
    if (validatedData.isActive && !existingWorkflow.isActive) {
      updateData.lastExecutedAt = new Date()
      updateData.executionCount = {
        increment: 1
      }
    }

    const workflow = await db.workflow.update({
      where: { id: params.id },
      data: updateData,
      include: {
        marketingCampaigns: true
      }
    })

    // Parse JSON fields for response
    const processedWorkflow = {
      ...workflow,
      triggers: workflow.triggers ? JSON.parse(workflow.triggers) : [],
      nodes: workflow.nodes ? JSON.parse(workflow.nodes) : [],
      edges: workflow.edges ? JSON.parse(workflow.edges) : []
    }

    return NextResponse.json(processedWorkflow)
  } catch (error) {
    console.error("Error updating workflow:", error)
    
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

    // Check if workflow exists and belongs to agency
    const workflow = await db.workflow.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    await db.workflow.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Workflow deleted successfully" })
  } catch (error) {
    console.error("Error deleting workflow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}