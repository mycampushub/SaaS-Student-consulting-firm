import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const nurturingCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["EMAIL", "SMS", "MULTI_CHANNEL"]),
  category: z.enum(["LEAD_NURTURING", "STUDENT_ONBOARDING", "APPLICATION_REMINDERS", "PAYMENT_REMINDERS", "DOCUMENT_COLLECTION", "VISA_UPDATES"]),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).default("DRAFT"),
  
  // Targeting
  targetAudience: z.object({
    serviceTypes: z.array(z.string()).optional(),
    leadStatuses: z.array(z.string()).optional(),
    studentStages: z.array(z.string()).optional(),
    countries: z.array(z.string()).optional(),
    budgetRanges: z.array(z.string()).optional(),
    customConditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(["equals", "contains", "greater_than", "less_than", "in"]),
      value: z.any()
    })).optional()
  }),
  
  // Campaign Flow
  steps: z.array(z.object({
    id: z.string(),
    type: z.enum(["EMAIL", "SMS", "WAIT", "CONDITION"]),
    order: z.number(),
    name: z.string(),
    content: z.object({
      subject: z.string().optional(),
      message: z.string(),
      template: z.string().optional(),
      dynamicFields: z.array(z.object({
        name: z.string(),
        type: z.enum(["TEXT", "PERSONALIZATION", "CONDITIONAL"]),
        value: z.string().optional(),
        condition: z.object({
          field: z.string(),
          operator: z.enum(["equals", "contains", "greater_than", "less_than"]),
          value: z.any()
        }).optional()
      })).optional()
    }),
    timing: z.object({
      delay: z.number(), // hours from previous step
      sendTime: z.string().optional(), // specific time of day "HH:MM"
      daysOfWeek: z.array(z.number()).optional(), // 0-6 (Sunday-Saturday)
      timezone: z.string().default("UTC")
    }),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(["equals", "contains", "greater_than", "less_than"]),
      value: z.any()
    })).optional(),
    nextStepId: z.string().optional()
  })),
  
  // Settings
  settings: z.object({
    trackOpens: z.boolean().default(true),
    trackClicks: z.boolean().default(true),
    allowUnsubscribe: z.boolean().default(true),
    throttleRate: z.number().default(1), // messages per hour
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM")
  }).optional(),
  
  // Goals
  goals: z.object({
    primary: z.enum(["OPEN_RATE", "CLICK_RATE", "CONVERSION_RATE", "RESPONSE_RATE"]),
    targetValue: z.number(),
    timeframe: z.enum(["DAYS_7", "DAYS_30", "DAYS_90"]).default("DAYS_30")
  }).optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Get nurturing campaigns (in a real implementation, this would query a NurturingCampaign model)
    const campaigns = [
      {
        id: "1",
        name: "Lead Nurturing Drip Campaign",
        description: "Automated email sequence for new leads",
        type: "EMAIL",
        category: "LEAD_NURTURING",
        status: "ACTIVE",
        targetAudience: {
          leadStatuses: ["NEW", "CONTACTED"],
          serviceTypes: ["CONSULTATION"]
        },
        steps: [
          {
            id: "step1",
            type: "EMAIL",
            order: 1,
            name: "Welcome Email",
            content: {
              subject: "Welcome to Our Educational Consultancy",
              message: "Thank you for your interest in our services...",
              dynamicFields: [
                { name: "lead_name", type: "PERSONALIZATION", value: "{{lead.name}}" }
              ]
            },
            timing: { delay: 0, sendTime: "09:00" }
          },
          {
            id: "step2",
            type: "EMAIL",
            order: 2,
            name: "Services Overview",
            content: {
              subject: "How We Can Help You Study Abroad",
              message: "Let me tell you about our comprehensive services..."
            },
            timing: { delay: 48, sendTime: "10:00" }
          },
          {
            id: "step3",
            type: "EMAIL",
            order: 3,
            name: "Consultation Invitation",
            content: {
              subject: "Schedule Your Free Consultation",
              message: "Ready to take the next step? Schedule a consultation..."
            },
            timing: { delay: 96, sendTime: "14:00" }
          }
        ],
        stats: {
          totalContacts: 456,
          activeContacts: 234,
          completedContacts: 89,
          openRate: 42.3,
          clickRate: 18.7,
          conversionRate: 12.4
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastRun: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: "2",
        name: "Application Document Reminders",
        description: "SMS reminders for document collection",
        type: "SMS",
        category: "DOCUMENT_COLLECTION",
        status: "ACTIVE",
        targetAudience: {
          studentStages: ["APPLICATION_SUBMITTED"],
          serviceTypes: ["VISA_PROCESSING"]
        },
        steps: [
          {
            id: "step1",
            type: "SMS",
            order: 1,
            name: "Document Checklist",
            content: {
              message: "Hi {{student.name}}, please submit these documents: passport, transcripts, bank statement. Reply HELP for assistance."
            },
            timing: { delay: 24 }
          },
          {
            id: "step2",
            type: "CONDITION",
            order: 2,
            name: "Check Document Status",
            conditions: [
              { field: "documents_submitted", operator: "less_than", value: 3 }
            ]
          },
          {
            id: "step3",
            type: "SMS",
            order: 3,
            name: "Follow-up Reminder",
            content: {
              message: "Friendly reminder: We're still waiting for your documents. Let us know if you need help!"
            },
            timing: { delay: 72 }
          }
        ],
        stats: {
          totalContacts: 123,
          activeContacts: 67,
          completedContacts: 45,
          responseRate: 34.2,
          completionRate: 67.2
        },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        lastRun: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: "3",
        name: "Payment Deadline Campaign",
        description: "Multi-channel payment reminders",
        type: "MULTI_CHANNEL",
        category: "PAYMENT_REMINDERS",
        status: "ACTIVE",
        targetAudience: {
          customConditions: [
            { field: "invoice_due_date", operator: "less_than", value: 7 },
            { field: "invoice_status", operator: "equals", value: "UNPAID" }
          ]
        },
        steps: [
          {
            id: "step1",
            type: "EMAIL",
            order: 1,
            name: "Payment Due Soon",
            content: {
              subject: "Payment Due in 7 Days - Invoice {{invoice.number}}",
              message: "This is a friendly reminder that your payment of {{invoice.amount}} is due in 7 days."
            },
            timing: { delay: 0 }
          },
          {
            id: "step2",
            type: "SMS",
            order: 2,
            name: "SMS Reminder",
            content: {
              message: "Reminder: Payment of {{invoice.amount}} due in 3 days. Invoice {{invoice.number}}"
            },
            timing: { delay: 96 }
          },
          {
            id: "step3",
            type: "EMAIL",
            order: 3,
            name: "Final Reminder",
            content: {
              subject: "URGENT: Payment Due Tomorrow",
              message: "Final reminder: Your payment is due tomorrow. Please pay now to avoid service interruption."
            },
            timing: { delay: 144 }
          }
        ],
        stats: {
          totalContacts: 78,
          activeContacts: 78,
          completedContacts: 67,
          paymentRate: 85.9
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastRun: new Date()
      }
    ].filter(campaign => 
      (!category || campaign.category === category) &&
      (!status || campaign.status === status) &&
      (!type || campaign.type === type)
    )

    return NextResponse.json({
      campaigns,
      summary: {
        total: campaigns.length,
        active: campaigns.filter(c => c.status === "ACTIVE").length,
        byCategory: campaigns.reduce((acc: any, campaign) => {
          acc[campaign.category] = (acc[campaign.category] || 0) + 1
          return acc
        }, {}),
        byType: campaigns.reduce((acc: any, campaign) => {
          acc[campaign.type] = (acc[campaign.type] || 0) + 1
          return acc
        }, {})
      }
    })
  } catch (error) {
    console.error("Error fetching nurturing campaigns:", error)
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
    const validatedData = nurturingCampaignSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Create nurturing campaign (in a real implementation, this would save to database)
    const campaign = {
      id: `nurturing_${Date.now()}`,
      agencyId: agency.id,
      name: validatedData.name,
      description: validatedData.description,
      type: validatedData.type,
      category: validatedData.category,
      status: validatedData.status,
      targetAudience: validatedData.targetAudience,
      steps: validatedData.steps,
      settings: validatedData.settings || {},
      goals: validatedData.goals,
      stats: {
        totalContacts: 0,
        activeContacts: 0,
        completedContacts: 0,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Set up campaign automation
    await setupCampaignAutomation(campaign, agency)

    return NextResponse.json({
      success: true,
      campaign,
      message: "Nurturing campaign created successfully"
    })
  } catch (error) {
    console.error("Error creating nurturing campaign:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Execute campaign steps
export async function PUT(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const { campaignId, action, contactId, stepData } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    switch (action) {
      case "EXECUTE_STEP":
        return await executeCampaignStep(campaignId, contactId, stepData, agency)
      
      case "PROCESS_CONDITION":
        return await processCampaignCondition(campaignId, contactId, stepData, agency)
      
      case "UPDATE_CONTACT_STATUS":
        return await updateContactStatus(campaignId, contactId, stepData, agency)
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in nurturing campaign PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper functions
async function setupCampaignAutomation(campaign: any, agency: any) {
  try {
    console.log(`Setting up automation for campaign ${campaign.name}`)
    
    // In a real implementation, this would:
    // 1. Create scheduled jobs for each step
    // 2. Set up audience segmentation
    // 3. Configure tracking and analytics
    // 4. Create webhook endpoints for campaign events
    // 5. Set up A/B testing if applicable
    
    return true
  } catch (error) {
    console.error("Error setting up campaign automation:", error)
    return false
  }
}

async function executeCampaignStep(campaignId: string, contactId: string, stepData: any, agency: any) {
  try {
    // Get campaign configuration
    const campaign = await getCampaignConfiguration(campaignId, agency.id)
    if (!campaign) {
      throw new Error("Campaign not found")
    }

    // Get current step
    const step = campaign.steps.find((s: any) => s.id === stepData.stepId)
    if (!step) {
      throw new Error("Step not found")
    }

    // Get contact data
    const contact = await getContactData(contactId, agency.id)
    if (!contact) {
      throw new Error("Contact not found")
    }

    // Execute step based on type
    let result = null

    switch (step.type) {
      case "EMAIL":
        result = await sendCampaignEmail(contact, step, campaign, agency)
        break
      
      case "SMS":
        result = await sendCampaignSMS(contact, step, campaign, agency)
        break
      
      case "WAIT":
        result = await scheduleNextStep(contact, campaign, step, agency)
        break
      
      default:
        console.log(`Executing step type: ${step.type}`)
    }

    // Log campaign execution
    await logCampaignExecution(campaignId, contactId, step.id, result, agency)

    return {
      success: true,
      stepType: step.type,
      result,
      nextStep: step.nextStepId
    }
  } catch (error) {
    console.error("Error executing campaign step:", error)
    throw error
  }
}

async function processCampaignCondition(campaignId: string, contactId: string, stepData: any, agency: any) {
  try {
    const campaign = await getCampaignConfiguration(campaignId, agency.id)
    if (!campaign) {
      throw new Error("Campaign not found")
    }

    const step = campaign.steps.find((s: any) => s.id === stepData.stepId)
    if (!step || step.type !== "CONDITION") {
      throw new Error("Condition step not found")
    }

    const contact = await getContactData(contactId, agency.id)
    if (!contact) {
      throw new Error("Contact not found")
    }

    // Evaluate conditions
    let conditionsMet = true
    for (const condition of step.conditions) {
      const fieldValue = getContactFieldValue(contact, condition.field)
      
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

    // Find next step based on condition result
    const nextStep = conditionsMet ? 
      campaign.steps.find((s: any) => s.id === step.nextStepId) :
      campaign.steps.find((s: any) => s.order === step.order + 1)

    return {
      success: true,
      conditionsMet,
      nextStep: nextStep?.id || null
    }
  } catch (error) {
    console.error("Error processing campaign condition:", error)
    throw error
  }
}

async function updateContactStatus(campaignId: string, contactId: string, stepData: any, agency: any) {
  try {
    console.log(`Updating contact ${contactId} status in campaign ${campaignId}`)
    
    // In a real implementation, this would:
    // 1. Update contact's campaign status
    // 2. Move to next step if applicable
    // 3. Update campaign statistics
    // 4. Trigger completion events
    
    return {
      success: true,
      newStatus: stepData.status,
      completedAt: new Date()
    }
  } catch (error) {
    console.error("Error updating contact status:", error)
    throw error
  }
}

// Additional helper functions
async function getCampaignConfiguration(campaignId: string, agencyId: string) {
  // In a real implementation, this would fetch from database
  return {
    id: campaignId,
    agencyId,
    steps: [
      {
        id: "step1",
        type: "EMAIL",
        order: 1,
        content: { subject: "Test", message: "Test message" },
        timing: { delay: 0 }
      }
    ]
  }
}

async function getContactData(contactId: string, agencyId: string) {
  // In a real implementation, this would fetch contact data
  return {
    id: contactId,
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890"
  }
}

async function sendCampaignEmail(contact: any, step: any, campaign: any, agency: any) {
  try {
    // Personalize content
    const personalizedContent = await personalizeContent(step.content.message, contact)
    
    console.log(`Sending email to ${contact.email}: ${step.content.subject}`)
    
    // In a real implementation, this would:
    // 1. Render email template
    // 2. Send via email service provider
    // 3. Track opens and clicks
    // 4. Log sending
    
    return {
      sent: true,
      messageId: `email_${Date.now()}`,
      personalizedContent
    }
  } catch (error) {
    console.error("Error sending campaign email:", error)
    return { sent: false, error: error.message }
  }
}

async function sendCampaignSMS(contact: any, step: any, campaign: any, agency: any) {
  try {
    // Personalize content
    const personalizedContent = await personalizeContent(step.content.message, contact)
    
    console.log(`Sending SMS to ${contact.phone}: ${personalizedContent}`)
    
    // In a real implementation, this would:
    // 1. Send via SMS service provider
    // 2. Track delivery status
    // 3. Log sending
    
    return {
      sent: true,
      messageId: `sms_${Date.now()}`,
      personalizedContent
    }
  } catch (error) {
    console.error("Error sending campaign SMS:", error)
    return { sent: false, error: error.message }
  }
}

async function scheduleNextStep(contact: any, campaign: any, step: any, agency: any) {
  try {
    console.log(`Scheduling next step for contact ${contact.id}`)
    
    // In a real implementation, this would:
    // 1. Calculate next execution time
    // 2. Create scheduled job
    // 3. Set up reminder
    
    return {
      scheduled: true,
      nextExecutionTime: new Date(Date.now() + step.timing.delay * 60 * 60 * 1000)
    }
  } catch (error) {
    console.error("Error scheduling next step:", error)
    return { scheduled: false, error: error.message }
  }
}

async function personalizeContent(content: string, contact: any) {
  // Replace personalization tokens
  let personalized = content
    .replace(/\{\{contact\.name\}\}/g, contact.name || "")
    .replace(/\{\{contact\.email\}\}/g, contact.email || "")
    .replace(/\{\{contact\.phone\}\}/g, contact.phone || "")
  
  return personalized
}

function getContactFieldValue(contact: any, field: string) {
  // Extract field value from contact data
  const fieldPath = field.split(".")
  let value = contact
  
  for (const part of fieldPath) {
    value = value?.[part]
  }
  
  return value
}

async function logCampaignExecution(campaignId: string, contactId: string, stepId: string, result: any, agency: any) {
  try {
    console.log(`Logging campaign execution: ${campaignId} - ${stepId} for contact ${contactId}`)
    
    // In a real implementation, this would:
    // 1. Create execution log
    // 2. Update campaign statistics
    // 3. Trigger analytics events
    
    return true
  } catch (error) {
    console.error("Error logging campaign execution:", error)
    return false
  }
}