import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const journeyEventSchema = z.object({
  pipelineId: z.string(),
  pipelineEntryId: z.string(),
  eventType: z.enum([
    "STAGE_CHANGED", "DOCUMENT_UPLOADED", "INTERVIEW_SCHEDULED", "FEE_PAID",
    "VISA_SUBMITTED", "OFFER_RECEIVED", "APPLICATION_FILED", "MILESTONE_REACHED",
    "SLA_BREACHED", "MANUAL_OVERRIDE", "AUTO_ACTION_TRIGGERED", "REMINDER_SENT",
    "ESCALATION_TRIGGERED"
  ]),
  eventName: z.string(),
  description: z.string().optional(),
  fromStage: z.string().optional(),
  toStage: z.string().optional(),
  entityId: z.string(),
  entityType: z.enum(["STUDENT", "LEAD", "APPLICATION"]),
  triggeredBy: z.string().optional(),
  triggeredByType: z.enum(["USER", "SYSTEM", "AUTOMATION", "WEBHOOK"]).optional(),
  eventData: z.any().optional(),
  slaImpact: z.boolean().optional(),
  slaDays: z.number().int().optional(),
  autoActions: z.array(z.any()).optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const pipelineId = searchParams.get("pipelineId")
    const entityId = searchParams.get("entityId")
    const entityType = searchParams.get("entityType")
    const eventType = searchParams.get("eventType")
    const limit = parseInt(searchParams.get("limit") || "50")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where: any = { agencyId: agency.id }
    
    if (pipelineId) where.pipelineId = pipelineId
    if (entityId) where.entityId = entityId
    if (entityType) where.entityType = entityType
    if (eventType) where.eventType = eventType

    const events = await db.journeyEvent.findMany({
      where,
      include: {
        pipeline: true,
        pipelineEntry: {
          include: {
            student: true,
            lead: true,
            application: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    })

    // Parse JSON fields
    const processedEvents = events.map(event => ({
      ...event,
      eventData: event.eventData ? JSON.parse(event.eventData) : null,
      autoActions: event.autoActions ? JSON.parse(event.autoActions) : []
    }))

    return NextResponse.json({ events: processedEvents })
  } catch (error) {
    console.error("Error fetching journey events:", error)
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
    const validatedData = journeyEventSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Verify pipeline and pipeline entry exist and belong to agency
    const pipeline = await db.pipeline.findFirst({
      where: {
        id: validatedData.pipelineId,
        agencyId: agency.id
      }
    })

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    const pipelineEntry = await db.pipelineEntry.findFirst({
      where: {
        id: validatedData.pipelineEntryId,
        agencyId: agency.id,
        pipelineId: validatedData.pipelineId
      }
    })

    if (!pipelineEntry) {
      return NextResponse.json({ error: "Pipeline entry not found" }, { status: 404 })
    }

    // Create the journey event
    const event = await db.journeyEvent.create({
      data: {
        agencyId: agency.id,
        pipelineId: validatedData.pipelineId,
        pipelineEntryId: validatedData.pipelineEntryId,
        eventType: validatedData.eventType,
        eventName: validatedData.eventName,
        description: validatedData.description,
        fromStage: validatedData.fromStage,
        toStage: validatedData.toStage,
        entityId: validatedData.entityId,
        entityType: validatedData.entityType,
        triggeredBy: validatedData.triggeredBy,
        triggeredByType: validatedData.triggeredByType || "USER",
        eventData: validatedData.eventData ? JSON.stringify(validatedData.eventData) : null,
        slaImpact: validatedData.slaImpact || false,
        slaDays: validatedData.slaDays,
        autoActions: validatedData.autoActions ? JSON.stringify(validatedData.autoActions) : null
      },
      include: {
        pipeline: true,
        pipelineEntry: {
          include: {
            student: true,
            lead: true,
            application: true
          }
        }
      }
    })

    // Trigger auto-actions if specified
    if (validatedData.autoActions && validatedData.autoActions.length > 0) {
      await triggerAutoActions(agency.id, event, validatedData.autoActions)
    }

    // Update pipeline entry if stage changed
    if (validatedData.eventType === "STAGE_CHANGED" && validatedData.toStage) {
      await db.pipelineEntry.update({
        where: { id: validatedData.pipelineEntryId },
        data: {
          currentStage: validatedData.toStage,
          previousStage: validatedData.fromStage,
          stageStatus: "IN_PROGRESS",
          movedBy: validatedData.triggeredBy,
          moveReason: validatedData.description,
          movedAt: new Date()
        }
      })
    }

    // Parse JSON fields for response
    const processedEvent = {
      ...event,
      eventData: event.eventData ? JSON.parse(event.eventData) : null,
      autoActions: event.autoActions ? JSON.parse(event.autoActions) : []
    }

    return NextResponse.json(processedEvent)
  } catch (error) {
    console.error("Error creating journey event:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to trigger auto-actions
async function triggerAutoActions(agencyId: string, event: any, actions: any[]) {
  for (const action of actions) {
    try {
      switch (action.type) {
        case "SEND_NOTIFICATION":
          // Send notification logic
          console.log(`Triggering notification for event ${event.id}`)
          break
        case "CREATE_TASK":
          // Create task logic
          console.log(`Creating task for event ${event.id}`)
          break
        case "SEND_EMAIL":
          // Send email logic
          console.log(`Sending email for event ${event.id}`)
          break
        case "SEND_SMS":
          // Send SMS logic
          console.log(`Sending SMS for event ${event.id}`)
          break
        case "UPDATE_SLA":
          // Update SLA logic
          console.log(`Updating SLA for event ${event.id}`)
          break
        default:
          console.log(`Unknown action type: ${action.type}`)
      }
    } catch (error) {
      console.error(`Error executing auto-action ${action.type}:`, error)
    }
  }
}