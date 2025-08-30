import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  description: z.string().optional(),
  type: z.enum(["EMAIL", "SMS", "WHATSAPP", "MULTI_CHANNEL"]),
  category: z.enum(["WELCOME", "NURTURING", "REENGAGEMENT", "PROMOTIONAL", "TRANSACTIONAL", "CUSTOM"]),
  targetAudience: z.any(),
  triggers: z.array(z.any()),
  steps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["EMAIL", "SMS", "WHATSAPP", "WAIT", "CONDITION"]),
    delay: z.number().int().min(0).optional(),
    delayUnit: z.enum(["MINUTES", "HOURS", "DAYS", "WEEKS"]).optional(),
    content: z.any().optional(),
    conditions: z.array(z.any()).optional(),
    templateId: z.string().optional()
  })).min(1, "At least one campaign step is required"),
  isActive: z.boolean().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  maxContacts: z.number().int().min(0).optional(),
  metadata: z.any().optional()
})

const updateCampaignSchema = campaignSchema.partial()

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const type = searchParams.get("type")
    const category = searchParams.get("category")
    const isActive = searchParams.get("isActive")
    const status = searchParams.get("status")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where: any = {
      agencyId: agency.id,
      ...(type && { type: type }),
      ...(category && { category: category }),
      ...(isActive !== null && { isActive: isActive === "true" }),
      ...(status && { status: status })
    }

    const [campaigns, total] = await Promise.all([
      db.campaign.findMany({
        where,
        include: {
          campaignEnrollments: {
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatar: true
                }
              },
              lead: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatar: true
                }
              }
            },
            orderBy: { enrolledAt: "desc" },
            take: 5
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.campaign.count({ where })
    ])

    // Parse JSON fields
    const processedCampaigns = campaigns.map(campaign => ({
      ...campaign,
      targetAudience: campaign.targetAudience ? JSON.parse(campaign.targetAudience) : null,
      triggers: campaign.triggers ? JSON.parse(campaign.triggers) : [],
      steps: campaign.steps ? JSON.parse(campaign.steps) : [],
      metadata: campaign.metadata ? JSON.parse(campaign.metadata) : null
    }))

    return NextResponse.json({
      campaigns: processedCampaigns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching campaigns:", error)
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
    const validatedData = campaignSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Create campaign
    const campaign = await db.campaign.create({
      data: {
        agencyId: agency.id,
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        category: validatedData.category,
        targetAudience: JSON.stringify(validatedData.targetAudience),
        triggers: JSON.stringify(validatedData.triggers),
        steps: JSON.stringify(validatedData.steps),
        isActive: validatedData.isActive ?? true,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        maxContacts: validatedData.maxContacts,
        metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null
      },
      include: {
        campaignEnrollments: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true
              }
            },
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    // Parse JSON fields for response
    const processedCampaign = {
      ...campaign,
      targetAudience: campaign.targetAudience ? JSON.parse(campaign.targetAudience) : null,
      triggers: campaign.triggers ? JSON.parse(campaign.triggers) : [],
      steps: campaign.steps ? JSON.parse(campaign.steps) : [],
      metadata: campaign.metadata ? JSON.parse(campaign.metadata) : null
    }

    // If campaign is active, start enrolling contacts
    if (validatedData.isActive) {
      await startCampaignEnrollment(campaign, agency.id)
    }

    return NextResponse.json(processedCampaign)
  } catch (error) {
    console.error("Error creating campaign:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to start campaign enrollment
async function startCampaignEnrollment(campaign: any, agencyId: string) {
  try {
    const targetAudience = JSON.parse(campaign.targetAudience)
    const triggers = JSON.parse(campaign.triggers)

    // Find contacts that match target audience
    const contacts = await findContactsForCampaign(targetAudience, agencyId)

    // Enroll contacts in campaign
    for (const contact of contacts) {
      const enrollment = await db.campaignEnrollment.create({
        data: {
          agencyId: agencyId,
          campaignId: campaign.id,
          studentId: contact.type === "STUDENT" ? contact.id : null,
          leadId: contact.type === "LEAD" ? contact.id : null,
          status: "ACTIVE",
          currentStep: 0,
          enrolledAt: new Date(),
          nextStepAt: calculateNextStepTime(campaign.steps[0], new Date())
        }
      })

      // Process first step immediately
      await processCampaignStep(enrollment, campaign, agencyId)
    }
  } catch (error) {
    console.error("Error starting campaign enrollment:", error)
  }
}

// Helper function to find contacts for campaign
async function findContactsForCampaign(targetAudience: any, agencyId: string) {
  const contacts: any[] = []

  // Find students that match criteria
  if (targetAudience.includeStudents) {
    const students = await db.student.findMany({
      where: {
        agencyId: agencyId,
        ...(targetAudience.studentCriteria && buildStudentCriteria(targetAudience.studentCriteria))
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true
      }
    })

    students.forEach(student => {
      contacts.push({ ...student, type: "STUDENT" })
    })
  }

  // Find leads that match criteria
  if (targetAudience.includeLeads) {
    const leads = await db.lead.findMany({
      where: {
        agencyId: agencyId,
        ...(targetAudience.leadCriteria && buildLeadCriteria(targetAudience.leadCriteria))
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true
      }
    })

    leads.forEach(lead => {
      contacts.push({ ...lead, type: "LEAD" })
    })
  }

  return contacts
}

// Helper function to build student criteria
function buildStudentCriteria(criteria: any): any {
  const where: any = {}

  if (criteria.status) {
    where.status = { in: criteria.status }
  }

  if (criteria.nationality) {
    where.nationality = { in: criteria.nationality }
  }

  if (criteria.currentEducation) {
    where.currentEducation = { in: criteria.currentEducation }
  }

  if (criteria.gpa) {
    where.gpa = { gte: criteria.gpa.min, lte: criteria.gpa.max }
  }

  if (criteria.tags && criteria.tags.length > 0) {
    where.tags = {
      contains: JSON.stringify(criteria.tags)
    }
  }

  return where
}

// Helper function to build lead criteria
function buildLeadCriteria(criteria: any): any {
  const where: any = {}

  if (criteria.status) {
    where.status = { in: criteria.status }
  }

  if (criteria.source) {
    where.source = { in: criteria.source }
  }

  if (criteria.score) {
    where.score = { gte: criteria.score.min, lte: criteria.score.max }
  }

  if (criteria.tags && criteria.tags.length > 0) {
    where.tags = {
      contains: JSON.stringify(criteria.tags)
    }
  }

  return where
}

// Helper function to calculate next step time
function calculateNextStepTime(step: any, baseTime: Date): Date {
  if (!step.delay || !step.delayUnit) {
    return baseTime
  }

  const delay = step.delay
  const nextTime = new Date(baseTime)

  switch (step.delayUnit) {
    case "MINUTES":
      nextTime.setMinutes(nextTime.getMinutes() + delay)
      break
    case "HOURS":
      nextTime.setHours(nextTime.getHours() + delay)
      break
    case "DAYS":
      nextTime.setDate(nextTime.getDate() + delay)
      break
    case "WEEKS":
      nextTime.setDate(nextTime.getDate() + (delay * 7))
      break
  }

  return nextTime
}

// Helper function to process campaign step
async function processCampaignStep(enrollment: any, campaign: any, agencyId: string) {
  try {
    const steps = JSON.parse(campaign.steps)
    const currentStep = steps[enrollment.currentStep]

    if (!currentStep) {
      // Campaign completed
      await db.campaignEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date()
        }
      })
      return
    }

    // Process step based on type
    switch (currentStep.type) {
      case "EMAIL":
        await processEmailStep(enrollment, currentStep, campaign, agencyId)
        break
      case "SMS":
        await processSmsStep(enrollment, currentStep, campaign, agencyId)
        break
      case "WHATSAPP":
        await processWhatsAppStep(enrollment, currentStep, campaign, agencyId)
        break
      case "WAIT":
        await processWaitStep(enrollment, currentStep, campaign, agencyId)
        break
      case "CONDITION":
        await processConditionStep(enrollment, currentStep, campaign, agencyId)
        break
    }

    // Schedule next step
    const nextStepIndex = enrollment.currentStep + 1
    if (nextStepIndex < steps.length) {
      const nextStep = steps[nextStepIndex]
      const nextStepTime = calculateNextStepTime(nextStep, new Date())

      await db.campaignEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStep: nextStepIndex,
          nextStepAt: nextStepTime
        }
      })
    } else {
      // Campaign completed
      await db.campaignEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date()
        }
      })
    }
  } catch (error) {
    console.error("Error processing campaign step:", error)
    
    // Mark enrollment as failed
    await db.campaignEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: "FAILED",
        error: error.message
      }
    })
  }
}

// Helper functions for processing different step types
async function processEmailStep(enrollment: any, step: any, campaign: any, agencyId: string) {
  const contact = await getEnrollmentContact(enrollment, agencyId)
  if (!contact || !contact.email) return

  const content = step.content || {}
  const subject = personalizeTemplate(content.subject || campaign.name, contact)
  const body = personalizeTemplate(content.body || "", contact)

  await db.emailMessage.create({
    data: {
      agencyId,
      to: contact.email,
      subject,
      body,
      status: "SCHEDULED",
      campaignEnrollmentId: enrollment.id
    }
  })
}

async function processSmsStep(enrollment: any, step: any, campaign: any, agencyId: string) {
  const contact = await getEnrollmentContact(enrollment, agencyId)
  if (!contact || !contact.phone) return

  const message = personalizeTemplate(step.content?.message || "", contact)

  await db.smsMessage.create({
    data: {
      agencyId,
      to: contact.phone,
      message,
      status: "SCHEDULED",
      campaignEnrollmentId: enrollment.id
    }
  })
}

async function processWhatsAppStep(enrollment: any, step: any, campaign: any, agencyId: string) {
  const contact = await getEnrollmentContact(enrollment, agencyId)
  if (!contact || !contact.phone) return

  const message = personalizeTemplate(step.content?.message || "", contact)

  await db.whatsappMessage.create({
    data: {
      agencyId,
      to: contact.phone,
      message,
      status: "SCHEDULED",
      campaignEnrollmentId: enrollment.id
    }
  })
}

async function processWaitStep(enrollment: any, step: any, campaign: any, agencyId: string) {
  // Wait step is handled by the nextStepAt scheduling
  // No immediate action needed
}

async function processConditionStep(enrollment: any, step: any, campaign: any, agencyId: string) {
  const contact = await getEnrollmentContact(enrollment, agencyId)
  if (!contact) return

  const conditionsMet = evaluateConditions(step.conditions, contact)
  
  if (!conditionsMet) {
    // End campaign if conditions not met
    await db.campaignEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: "STOPPED",
        stoppedAt: new Date(),
        stopReason: "Conditions not met"
      }
    })
  }
}

// Helper function to get enrollment contact
async function getEnrollmentContact(enrollment: any, agencyId: string) {
  if (enrollment.studentId) {
    return await db.student.findFirst({
      where: { id: enrollment.studentId, agencyId: agencyId }
    })
  } else if (enrollment.leadId) {
    return await db.lead.findFirst({
      where: { id: enrollment.leadId, agencyId: agencyId }
    })
  }
  return null
}

// Helper function to personalize template
function personalizeTemplate(template: string, contact: any): string {
  let personalized = template
    .replace(/\{\{firstName\}\}/g, contact.firstName || "")
    .replace(/\{\{lastName\}\}/g, contact.lastName || "")
    .replace(/\{\{email\}\}/g, contact.email || "")
    .replace(/\{\{phone\}\}/g, contact.phone || "")
    .replace(/\{\{id\}\}/g, contact.id || "")
  
  return personalized
}

// Helper function to evaluate conditions
function evaluateConditions(conditions: any[], contact: any): boolean {
  for (const condition of conditions) {
    const { field, operator, value } = condition
    
    switch (field) {
      case "status":
        if (!evaluateOperator(contact.status, operator, value)) return false
        break
      case "score":
        if (!evaluateOperator(contact.score, operator, value)) return false
        break
      case "email":
        if (!evaluateOperator(contact.email, operator, value)) return false
        break
      case "phone":
        if (!evaluateOperator(contact.phone, operator, value)) return false
        break
    }
  }
  
  return true
}

// Helper function to evaluate operators
function evaluateOperator(fieldValue: any, operator: string, value: any): boolean {
  switch (operator) {
    case "equals":
      return fieldValue === value
    case "not_equals":
      return fieldValue !== value
    case "contains":
      return fieldValue && fieldValue.toString().includes(value)
    case "not_contains":
      return !fieldValue || !fieldValue.toString().includes(value)
    case "greater_than":
      return fieldValue > value
    case "less_than":
      return fieldValue < value
    case "greater_equal":
      return fieldValue >= value
    case "less_equal":
      return fieldValue <= value
    case "in":
      return Array.isArray(value) && value.includes(fieldValue)
    case "not_in":
      return Array.isArray(value) && !value.includes(fieldValue)
    default:
      return false
  }
}