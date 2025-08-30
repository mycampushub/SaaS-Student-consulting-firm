import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const funnelSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  source: z.enum(["WEBSITE", "SOCIAL_MEDIA", "PAID_ADS", "EMAIL", "REFERRAL", "ORGANIC", "OTHER"]),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).default("DRAFT"),
  steps: z.array(z.object({
    id: z.string(),
    type: z.enum(["LANDING_PAGE", "FORM", "EMAIL", "SMS", "CALL", "MEETING", "WAIT"]),
    title: z.string(),
    description: z.string().optional(),
    content: z.string().optional(),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(["equals", "contains", "greater_than", "less_than"]),
      value: z.any()
    })).optional(),
    waitTime: z.number().optional(), // in hours
    nextStepId: z.string().optional()
  })),
  triggers: z.array(z.object({
    event: z.string(),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(["equals", "contains", "greater_than", "less_than"]),
      value: z.any()
    }))
  })).optional(),
  settings: z.object({
    autoAssign: z.boolean().default(true),
    assignTo: z.string().optional(),
    tags: z.array(z.string()).default([]),
    followUpDelay: z.number().default(24) // in hours
  }).optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const source = searchParams.get("source")
    const status = searchParams.get("status")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where: any = {
      agencyId: agency.id
    }

    if (source) {
      where.source = source
    }

    if (status) {
      where.status = status
    }

    // Get funnels (this would typically be a separate model)
    const funnels = [
      {
        id: "1",
        name: "Website Lead Capture Funnel",
        description: "Multi-step funnel for website visitors",
        source: "WEBSITE",
        status: "ACTIVE",
        steps: [
          {
            id: "step1",
            type: "LANDING_PAGE",
            title: "Welcome Page",
            description: "Initial landing page for lead capture",
            content: "Welcome to our educational consultancy services"
          },
          {
            id: "step2",
            type: "FORM",
            title: "Information Collection",
            description: "Collect basic lead information",
            conditions: [
              { field: "page_viewed", operator: "equals", value: "welcome" }
            ]
          },
          {
            id: "step3",
            type: "EMAIL",
            title: "Follow-up Email",
            description: "Send automated follow-up email",
            waitTime: 1,
            nextStepId: "step4"
          },
          {
            id: "step4",
            type: "CALL",
            title: "Consultation Call",
            description: "Schedule consultation call"
          }
        ],
        leadsCount: 156,
        conversionRate: 23.5,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      {
        id: "2",
        name: "Social Media Ad Funnel",
        description: "Facebook/Instagram ad lead generation",
        source: "SOCIAL_MEDIA",
        status: "ACTIVE",
        steps: [
          {
            id: "step1",
            type: "LANDING_PAGE",
            title: "Ad Landing Page",
            description: "Dedicated landing page for social media ads"
          },
          {
            id: "step2",
            type: "FORM",
            title: "Quick Application",
            description: "Fast-track application form"
          },
          {
            id: "step3",
            type: "SMS",
            title: "Immediate SMS",
            description: "Send immediate SMS confirmation",
            waitTime: 0.5
          }
        ],
        leadsCount: 89,
        conversionRate: 31.2,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      }
    ].filter(funnel => 
      (!source || funnel.source === source) &&
      (!status || funnel.status === status)
    )

    return NextResponse.json({
      funnels,
      summary: {
        total: funnels.length,
        active: funnels.filter(f => f.status === "ACTIVE").length,
        bySource: funnels.reduce((acc: any, funnel) => {
          acc[funnel.source] = (acc[funnel.source] || 0) + 1
          return acc
        }, {})
      }
    })
  } catch (error) {
    console.error("Error fetching funnels:", error)
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
    const validatedData = funnelSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Create funnel (in a real implementation, this would save to database)
    const funnel = {
      id: `funnel_${Date.now()}`,
      agencyId: agency.id,
      name: validatedData.name,
      description: validatedData.description,
      source: validatedData.source,
      status: validatedData.status,
      steps: validatedData.steps,
      triggers: validatedData.triggers || [],
      settings: validatedData.settings || {},
      leadsCount: 0,
      conversionRate: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Create initial tracking for the funnel
    await createFunnelTracking(funnel, agency)

    return NextResponse.json({
      success: true,
      funnel,
      message: "Funnel created successfully"
    })
  } catch (error) {
    console.error("Error creating funnel:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to create funnel tracking
async function createFunnelTracking(funnel: any, agency: any) {
  try {
    // Create analytics tracking for the funnel
    console.log(`Creating funnel tracking for ${funnel.name} in agency ${agency.id}`)
    
    // In a real implementation, this would:
    // 1. Create funnel analytics records
    // 2. Set up event tracking
    // 3. Initialize conversion tracking
    // 4. Create webhook endpoints for funnel events
    
    return true
  } catch (error) {
    console.error("Error creating funnel tracking:", error)
    return false
  }
}

// Process lead through funnel
export async function PUT(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const { funnelId, leadId, stepId, action, data } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Process lead through funnel step
    const result = await processFunnelStep(funnelId, leadId, stepId, action, data, agency)

    return NextResponse.json({
      success: true,
      result,
      message: "Lead processed through funnel successfully"
    })
  } catch (error) {
    console.error("Error processing funnel step:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to process funnel step
async function processFunnelStep(funnelId: string, leadId: string, stepId: string, action: string, data: any, agency: any) {
  try {
    // Get funnel configuration
    const funnel = await getFunnelConfiguration(funnelId, agency.id)
    if (!funnel) {
      throw new Error("Funnel not found")
    }

    // Get current step
    const currentStep = funnel.steps.find((step: any) => step.id === stepId)
    if (!currentStep) {
      throw new Error("Step not found")
    }

    // Process based on step type and action
    let nextStep = null
    let shouldContinue = true

    switch (currentStep.type) {
      case "FORM":
        if (action === "SUBMIT") {
          // Save form data
          await saveFormData(leadId, data, agency)
          
          // Check conditions for next step
          nextStep = await evaluateConditions(currentStep, data, funnel)
        }
        break

      case "EMAIL":
        if (action === "SEND") {
          // Send email
          await sendFunnelEmail(leadId, currentStep, agency)
          
          // Schedule next step if wait time specified
          if (currentStep.waitTime) {
            await scheduleNextStep(leadId, funnelId, currentStep.nextStepId, currentStep.waitTime, agency)
          }
        }
        break

      case "SMS":
        if (action === "SEND") {
          // Send SMS
          await sendFunnelSMS(leadId, currentStep, agency)
          
          // Schedule next step if wait time specified
          if (currentStep.waitTime) {
            await scheduleNextStep(leadId, funnelId, currentStep.nextStepId, currentStep.waitTime, agency)
          }
        }
        break

      case "WAIT":
        if (action === "COMPLETE") {
          // Move to next step
          nextStep = funnel.steps.find((step: any) => step.id === currentStep.nextStepId)
        }
        break

      default:
        console.log(`Processing ${currentStep.type} step with action ${action}`)
    }

    // Update lead progress in funnel
    await updateLeadProgress(leadId, funnelId, stepId, action, agency)

    return {
      currentStep: currentStep.type,
      action,
      nextStep: nextStep?.id || null,
      shouldContinue
    }
  } catch (error) {
    console.error("Error processing funnel step:", error)
    throw error
  }
}

// Helper functions
async function getFunnelConfiguration(funnelId: string, agencyId: string) {
  // In a real implementation, this would fetch from database
  return {
    id: funnelId,
    agencyId,
    steps: [
      {
        id: "step1",
        type: "FORM",
        title: "Lead Information",
        conditions: [],
        nextStepId: "step2"
      },
      {
        id: "step2",
        type: "EMAIL",
        title: "Follow-up Email",
        waitTime: 1,
        nextStepId: "step3"
      },
      {
        id: "step3",
        type: "CALL",
        title: "Consultation Call"
      }
    ]
  }
}

async function saveFormData(leadId: string, data: any, agency: any) {
  try {
    // Save form submission data
    console.log(`Saving form data for lead ${leadId}`)
    
    // In a real implementation, this would:
    // 1. Save form submission to database
    // 2. Update lead information
    // 3. Trigger any automation rules
    // 4. Create notifications
    
    return true
  } catch (error) {
    console.error("Error saving form data:", error)
    return false
  }
}

async function evaluateConditions(step: any, data: any, funnel: any) {
  try {
    if (!step.conditions || step.conditions.length === 0) {
      return funnel.steps.find((s: any) => s.id === step.nextStepId)
    }

    // Evaluate conditions
    let conditionsMet = true
    for (const condition of step.conditions) {
      const fieldValue = data[condition.field]
      
      switch (condition.operator) {
        case "equals":
          if (fieldValue !== condition.value) conditionsMet = false
          break
        case "contains":
          if (!fieldValue?.includes(condition.value)) conditionsMet = false
          break
        case "greater_than":
          if (fieldValue <= condition.value) conditionsMet = false
          break
        case "less_than":
          if (fieldValue >= condition.value) conditionsMet = false
          break
      }
      
      if (!conditionsMet) break
    }

    if (conditionsMet) {
      return funnel.steps.find((s: any) => s.id === step.nextStepId)
    }

    return null
  } catch (error) {
    console.error("Error evaluating conditions:", error)
    return null
  }
}

async function sendFunnelEmail(leadId: string, step: any, agency: any) {
  try {
    console.log(`Sending funnel email to lead ${leadId}`)
    
    // In a real implementation, this would:
    // 1. Get lead email address
    // 2. Render email template with step content
    // 3. Send email via email service provider
    // 4. Log email sending
    // 5. Update email metrics
    
    return true
  } catch (error) {
    console.error("Error sending funnel email:", error)
    return false
  }
}

async function sendFunnelSMS(leadId: string, step: any, agency: any) {
  try {
    console.log(`Sending funnel SMS to lead ${leadId}`)
    
    // In a real implementation, this would:
    // 1. Get lead phone number
    // 2. Send SMS via SMS service provider
    // 3. Log SMS sending
    // 4. Update SMS metrics
    
    return true
  } catch (error) {
    console.error("Error sending funnel SMS:", error)
    return false
  }
}

async function scheduleNextStep(leadId: string, funnelId: string, nextStepId: string, waitTime: number, agency: any) {
  try {
    console.log(`Scheduling next step ${nextStepId} for lead ${leadId} in ${waitTime} hours`)
    
    // In a real implementation, this would:
    // 1. Create scheduled task/job
    // 2. Set up reminder system
    // 3. Create notification for follow-up
    
    return true
  } catch (error) {
    console.error("Error scheduling next step:", error)
    return false
  }
}

async function updateLeadProgress(leadId: string, funnelId: string, stepId: string, action: string, agency: any) {
  try {
    console.log(`Updating lead ${leadId} progress in funnel ${funnelId}`)
    
    // In a real implementation, this would:
    // 1. Update lead's current position in funnel
    // 2. Log funnel step completion
    // 3. Update funnel analytics
    // 4. Trigger any completion events
    
    return true
  } catch (error) {
    console.error("Error updating lead progress:", error)
    return false
  }
}