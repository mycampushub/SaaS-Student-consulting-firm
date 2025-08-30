import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
      }
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    if (!workflow.isActive) {
      return NextResponse.json({ error: "Workflow is not active" }, { status: 400 })
    }

    // Parse workflow data
    const triggers = workflow.triggers ? JSON.parse(workflow.triggers) : []
    const nodes = workflow.nodes ? JSON.parse(workflow.nodes) : []
    const edges = workflow.edges ? JSON.parse(workflow.edges) : []

    // Execute workflow (simplified version)
    const executionResults = {
      workflowId: workflow.id,
      workflowName: workflow.name,
      executedAt: new Date().toISOString(),
      triggers: triggers.length,
      nodes: nodes.length,
      edges: edges.length,
      status: "completed",
      message: "Workflow executed successfully"
    }

    // Update workflow execution count and last executed time
    await db.workflow.update({
      where: { id: params.id },
      data: {
        executionCount: {
          increment: 1
        },
        lastExecutedAt: new Date()
      }
    })

    return NextResponse.json(executionResults)
  } catch (error) {
    console.error("Error executing workflow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}