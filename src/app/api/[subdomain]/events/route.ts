import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const eventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  description: z.string().optional(),
  type: z.enum(["WEBINAR", "WORKSHOP", "SEMINAR", "INFO_SESSION", "VIRTUAL_FAIR", "TRAINING", "MEETING", "CUSTOM"]),
  status: z.enum(["DRAFT", "PUBLISHED", "LIVE", "ENDED", "CANCELLED", "POSTPONED"]).optional(),
  startTime: z.string(),
  endTime: z.string(),
  timezone: z.string().optional(),
  platform: z.enum(["ZOOM", "GOOGLE_MEET", "MICROSOFT_TEAMS", "WEBEX", "CUSTOM"]),
  platformEventId: z.string().optional(),
  platformConfig: z.any().optional(),
  maxAttendees: z.number().int().min(1).optional(),
  isWaitlistEnabled: z.boolean().optional(),
  agenda: z.any().optional(),
  speakers: z.array(z.any()).optional(),
  materials: z.array(z.any()).optional(),
  registrationRequired: z.boolean().optional(),
  registrationDeadline: z.string().optional(),
  autoApprove: z.boolean().optional(),
  bannerImage: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  isRecorded: z.boolean().optional(),
  recordingUrl: z.string().optional(),
  enableChat: z.boolean().optional(),
  enableQAndA: z.boolean().optional(),
  enablePolls: z.boolean().optional()
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
    const platform = searchParams.get("platform")
    const upcoming = searchParams.get("upcoming")
    const limit = parseInt(searchParams.get("limit") || "20")

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if virtual events are enabled
    if (!agency.featureSettings?.virtualEventsEnabled) {
      return NextResponse.json({ 
        error: "Virtual events are not enabled for this agency" 
      }, { status: 403 })
    }

    const where: any = { agencyId: agency.id }
    
    if (type) where.type = type
    if (status) where.status = status
    if (platform) where.platform = platform
    
    if (upcoming === "true") {
      where.startTime = { gte: new Date() }
      where.status = { in: ["PUBLISHED", "LIVE"] }
    }

    const events = await db.event.findMany({
      where,
      include: {
        registrations: {
          take: 5,
          orderBy: { registeredAt: "desc" }
        },
        analytics: true
      },
      orderBy: { startTime: "asc" },
      take: limit
    })

    // Parse JSON fields
    const processedEvents = events.map(event => ({
      ...event,
      agenda: event.agenda ? JSON.parse(event.agenda) : [],
      speakers: event.speakers ? JSON.parse(event.speakers) : [],
      materials: event.materials ? JSON.parse(event.materials) : [],
      platformConfig: event.platformConfig ? JSON.parse(event.platformConfig) : {}
    }))

    return NextResponse.json({ events: processedEvents })
  } catch (error) {
    console.error("Error fetching events:", error)
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
    const validatedData = eventSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if virtual events are enabled
    if (!agency.featureSettings?.virtualEventsEnabled) {
      return NextResponse.json({ 
        error: "Virtual events are not enabled for this agency" 
      }, { status: 403 })
    }

    // Parse dates
    const startTime = new Date(validatedData.startTime)
    const endTime = new Date(validatedData.endTime)
    const registrationDeadline = validatedData.registrationDeadline ? new Date(validatedData.registrationDeadline) : null

    // Create event
    const event = await db.event.create({
      data: {
        agencyId: agency.id,
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        status: validatedData.status || "DRAFT",
        startTime,
        endTime,
        timezone: validatedData.timezone || "UTC",
        platform: validatedData.platform,
        platformEventId: validatedData.platformEventId,
        platformConfig: validatedData.platformConfig ? JSON.stringify(validatedData.platformConfig) : null,
        maxAttendees: validatedData.maxAttendees,
        isWaitlistEnabled: validatedData.isWaitlistEnabled || false,
        agenda: validatedData.agenda ? JSON.stringify(validatedData.agenda) : null,
        speakers: validatedData.speakers ? JSON.stringify(validatedData.speakers) : null,
        materials: validatedData.materials ? JSON.stringify(validatedData.materials) : null,
        registrationRequired: validatedData.registrationRequired ?? true,
        registrationDeadline,
        autoApprove: validatedData.autoApprove ?? true,
        bannerImage: validatedData.bannerImage,
        primaryColor: validatedData.primaryColor,
        secondaryColor: validatedData.secondaryColor,
        isRecorded: validatedData.isRecorded ?? true,
        recordingUrl: validatedData.recordingUrl,
        enableChat: validatedData.enableChat ?? true,
        enableQAndA: validatedData.enableQAndA ?? true,
        enablePolls: validatedData.enablePolls ?? true
      }
    })

    // Create initial analytics
    await db.eventAnalytics.create({
      data: {
        agencyId: agency.id,
        eventId: event.id
      }
    })

    // If platform integration is enabled, create event on platform
    if (validatedData.platform !== "CUSTOM") {
      try {
        await createPlatformEvent(event, validatedData.platform, validatedData.platformConfig)
      } catch (error) {
        console.error("Error creating platform event:", error)
      }
    }

    // Parse JSON fields for response
    const processedEvent = {
      ...event,
      agenda: event.agenda ? JSON.parse(event.agenda) : [],
      speakers: event.speakers ? JSON.parse(event.speakers) : [],
      materials: event.materials ? JSON.parse(event.materials) : [],
      platformConfig: event.platformConfig ? JSON.parse(event.platformConfig) : {}
    }

    return NextResponse.json(processedEvent)
  } catch (error) {
    console.error("Error creating event:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to create event on external platform
async function createPlatformEvent(event: any, platform: string, config: any) {
  // Simulate platform integration
  console.log(`Creating ${platform} event for ${event.title}`)
  
  // In a real implementation, this would make API calls to:
  // - Zoom API to create webinar
  // - Google Calendar API to create event
  // - Microsoft Teams API to create meeting
  // - Webex API to create webinar
  
  // Return mock platform event ID
  return `platform_${event.id}_${Date.now()}`
}