import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const featureSettingsSchema = z.object({
  // Student Journey Features
  studentJourneyEnabled: z.boolean().optional(),
  visualProgressTracker: z.boolean().optional(),
  automatedMilestones: z.boolean().optional(),
  
  // Knowledge Base Features
  knowledgeBaseEnabled: z.boolean().optional(),
  guidelinesRepository: z.boolean().optional(),
  automatedRecommendations: z.boolean().optional(),
  
  // Communication Features
  aiChatbotEnabled: z.boolean().optional(),
  twoWayMessaging: z.boolean().optional(),
  whatsappIntegration: z.boolean().optional(),
  
  // Events & Webinars
  virtualEventsEnabled: z.boolean().optional(),
  webinarIntegration: z.boolean().optional(),
  eventRegistration: z.boolean().optional(),
  
  // Marketing & Segmentation
  advancedSegmentation: z.boolean().optional(),
  targetedCampaigns: z.boolean().optional(),
  leadScoringEnabled: z.boolean().optional(),
  
  // Integration Features
  accountingIntegration: z.boolean().optional(),
  calendarIntegration: z.boolean().optional(),
  videoConferencingIntegration: z.boolean().optional(),
  
  // Advanced Features
  predictiveAnalytics: z.boolean().optional(),
  advancedReporting: z.boolean().optional(),
  customWorkflows: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Return default settings if none exist
    if (!agency.featureSettings) {
      const defaultSettings = {
        studentJourneyEnabled: true,
        visualProgressTracker: true,
        automatedMilestones: true,
        knowledgeBaseEnabled: true,
        guidelinesRepository: true,
        automatedRecommendations: true,
        aiChatbotEnabled: false,
        twoWayMessaging: true,
        whatsappIntegration: false,
        virtualEventsEnabled: false,
        webinarIntegration: false,
        eventRegistration: false,
        advancedSegmentation: true,
        targetedCampaigns: true,
        leadScoringEnabled: true,
        accountingIntegration: false,
        calendarIntegration: false,
        videoConferencingIntegration: false,
        predictiveAnalytics: false,
        advancedReporting: true,
        customWorkflows: true
      }

      return NextResponse.json(defaultSettings)
    }

    return NextResponse.json(agency.featureSettings)
  } catch (error) {
    console.error("Error fetching feature settings:", error)
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
    const validatedData = featureSettingsSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    let featureSettings = await db.featureSettings.findUnique({
      where: { agencyId: agency.id }
    })

    if (featureSettings) {
      // Update existing settings
      featureSettings = await db.featureSettings.update({
        where: { id: featureSettings.id },
        data: validatedData
      })
    } else {
      // Create new settings
      featureSettings = await db.featureSettings.create({
        data: {
          agencyId: agency.id,
          ...validatedData
        }
      })
    }

    return NextResponse.json(featureSettings)
  } catch (error) {
    console.error("Error updating feature settings:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const { feature, enabled } = body

    if (!feature || typeof enabled !== 'boolean') {
      return NextResponse.json({ 
        error: "Feature name and enabled status are required" 
      }, { status: 400 })
    }

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    let featureSettings = await db.featureSettings.findUnique({
      where: { agencyId: agency.id }
    })

    if (!featureSettings) {
      // Create default settings first
      featureSettings = await db.featureSettings.create({
        data: {
          agencyId: agency.id,
          studentJourneyEnabled: true,
          visualProgressTracker: true,
          automatedMilestones: true,
          knowledgeBaseEnabled: true,
          guidelinesRepository: true,
          automatedRecommendations: true,
          aiChatbotEnabled: false,
          twoWayMessaging: true,
          whatsappIntegration: false,
          virtualEventsEnabled: false,
          webinarIntegration: false,
          eventRegistration: false,
          advancedSegmentation: true,
          targetedCampaigns: true,
          leadScoringEnabled: true,
          accountingIntegration: false,
          calendarIntegration: false,
          videoConferencingIntegration: false,
          predictiveAnalytics: false,
          advancedReporting: true,
          customWorkflows: true
        }
      })
    }

    // Update specific feature
    const updateData: any = {}
    updateData[feature] = enabled

    featureSettings = await db.featureSettings.update({
      where: { id: featureSettings.id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      feature,
      enabled,
      message: `Feature ${feature} ${enabled ? 'enabled' : 'disabled'} successfully`
    })
  } catch (error) {
    console.error("Error toggling feature:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}