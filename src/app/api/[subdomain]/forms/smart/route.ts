import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const smartFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  serviceType: z.enum(["CONSULTATION", "VISA_PROCESSING", "APPLICATION_FEE", "TUITION_FEE", "OTHER"]),
  fields: z.array(z.object({
    id: z.string(),
    type: z.enum(["TEXT", "EMAIL", "PHONE", "SELECT", "MULTI_SELECT", "CHECKBOX", "RADIO", "TEXTAREA", "DATE", "NUMBER"]),
    label: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean().default(false),
    options: z.array(z.object({
      value: z.string(),
      label: z.string(),
      nextStep: z.string().optional()
    })).optional(),
    conditional: z.object({
      dependsOn: z.string(),
      value: z.any(),
      action: z.enum(["SHOW", "HIDE", "REQUIRE"])
    }).optional(),
    validation: z.object({
      pattern: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      custom: z.string().optional()
    }).optional()
  })),
  branchingLogic: z.array(z.object({
    field: z.string(),
    conditions: z.array(z.object({
      value: z.any(),
      operator: z.enum(["equals", "contains", "greater_than", "less_than", "in"]),
      nextStep: z.string(),
      action: z.enum(["SHOW_FIELDS", "HIDE_FIELDS", "SKIP_TO", "REDIRECT"])
    }))
  })).optional(),
  automation: z.object({
    createLead: z.boolean().default(true),
    assignTo: z.string().optional(),
    tags: z.array(z.string()).default([]),
    followUp: z.object({
      enabled: z.boolean().default(true),
      delay: z.number().default(24), // hours
      type: z.enum(["EMAIL", "SMS", "BOTH"]).default("EMAIL")
    }).optional(),
    resources: z.array(z.object({
      type: z.enum(["GUIDE", "CHECKLIST", "TEMPLATE", "VIDEO"]),
      title: z.string(),
      url: z.string().optional(),
      content: z.string().optional(),
      delivery: z.enum(["IMMEDIATE", "EMAIL", "SMS"])
    })).optional()
  }).optional(),
  styling: z.object({
    theme: z.enum(["DEFAULT", "MINIMAL", "BOLD", "EDUCATIONAL"]).default("DEFAULT"),
    primaryColor: z.string().default("#3B82F6"),
    secondaryColor: z.string().default("#10B981"),
    layout: z.enum(["SINGLE_COLUMN", "MULTI_COLUMN", "WIZARD"]).default("SINGLE_COLUMN")
  }).optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const serviceType = searchParams.get("serviceType")
    const template = searchParams.get("template")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Get smart forms with filtering
    const where: any = {
      agencyId: agency.id
    }

    if (serviceType) {
      where.serviceType = serviceType
    }

    // In a real implementation, this would query a SmartForm model
    const smartForms = [
      {
        id: "1",
        name: "Study Abroad Consultation Form",
        description: "Comprehensive form for study abroad consultation",
        serviceType: "CONSULTATION",
        fields: [
          {
            id: "name",
            type: "TEXT",
            label: "Full Name",
            required: true
          },
          {
            id: "email",
            type: "EMAIL",
            label: "Email Address",
            required: true
          },
          {
            id: "phone",
            type: "PHONE",
            label: "Phone Number",
            required: true
          },
          {
            id: "country",
            type: "SELECT",
            label: "Preferred Study Destination",
            required: true,
            options: [
              { value: "usa", label: "United States", nextStep: "usa_requirements" },
              { value: "uk", label: "United Kingdom", nextStep: "uk_requirements" },
              { value: "canada", label: "Canada", nextStep: "canada_requirements" },
              { value: "australia", label: "Australia", nextStep: "australia_requirements" }
            ]
          },
          {
            id: "budget",
            type: "SELECT",
            label: "Budget Range",
            required: true,
            conditional: {
              dependsOn: "country",
              value: "usa",
              action: "SHOW"
            },
            options: [
              { value: "20000-30000", label: "$20,000 - $30,000" },
              { value: "30000-40000", label: "$30,000 - $40,000" },
              { value: "40000+", label: "$40,000+" }
            ]
          }
        ],
        branchingLogic: [
          {
            field: "country",
            conditions: [
              {
                value: "usa",
                operator: "equals",
                nextStep: "usa_requirements",
                action: "SHOW_FIELDS"
              },
              {
                value: "uk",
                operator: "equals", 
                nextStep: "uk_requirements",
                action: "SHOW_FIELDS"
              }
            ]
          }
        ],
        automation: {
          createLead: true,
          tags: ["study_abroad", "consultation"],
          followUp: {
            enabled: true,
            delay: 24,
            type: "EMAIL"
          },
          resources: [
            {
              type: "GUIDE",
              title: "Study Abroad Guide",
              content: "Comprehensive guide to studying abroad",
              delivery: "EMAIL"
            }
          ]
        },
        styling: {
          theme: "EDUCATIONAL",
          primaryColor: "#3B82F6",
          layout: "WIZARD"
        },
        submissions: 234,
        conversionRate: 45.2,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        id: "2",
        name: "Visa Processing Application",
        description: "Form for visa processing services",
        serviceType: "VISA_PROCESSING",
        fields: [
          {
            id: "passport_number",
            type: "TEXT",
            label: "Passport Number",
            required: true,
            validation: {
              pattern: "^[A-Z0-9]{9}$",
              min: 9,
              max: 9
            }
          },
          {
            id: "visa_type",
            type: "SELECT",
            label: "Visa Type",
            required: true,
            options: [
              { value: "student", label: "Student Visa" },
              { value: "tourist", label: "Tourist Visa" },
              { value: "work", label: "Work Visa" }
            ]
          }
        ],
        automation: {
          createLead: true,
          tags: ["visa", "processing"],
          followUp: {
            enabled: true,
            delay: 12,
            type: "SMS"
          },
          resources: [
            {
              type: "CHECKLIST",
              title: "Visa Document Checklist",
              url: "/resources/visa-checklist",
              delivery: "IMMEDIATE"
            }
          ]
        },
        submissions: 89,
        conversionRate: 67.8,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      }
    ].filter(form => !serviceType || form.serviceType === serviceType)

    return NextResponse.json({
      smartForms,
      templates: getFormTemplates(),
      summary: {
        total: smartForms.length,
        byServiceType: smartForms.reduce((acc: any, form) => {
          acc[form.serviceType] = (acc[form.serviceType] || 0) + 1
          return acc
        }, {})
      }
    })
  } catch (error) {
    console.error("Error fetching smart forms:", error)
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
    const validatedData = smartFormSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Create smart form (in a real implementation, this would save to database)
    const smartForm = {
      id: `smart_form_${Date.now()}`,
      agencyId: agency.id,
      name: validatedData.name,
      description: validatedData.description,
      serviceType: validatedData.serviceType,
      fields: validatedData.fields,
      branchingLogic: validatedData.branchingLogic || [],
      automation: validatedData.automation || {},
      styling: validatedData.styling || {},
      submissions: 0,
      conversionRate: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Set up automation and integrations
    await setupFormAutomation(smartForm, agency)

    return NextResponse.json({
      success: true,
      smartForm,
      message: "Smart form created successfully"
    })
  } catch (error) {
    console.error("Error creating smart form:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Process smart form submission
export async function PUT(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const { formId, submissionData, sourceUrl, userAgent } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Process form submission with branching logic
    const result = await processSmartFormSubmission(formId, submissionData, {
      sourceUrl,
      userAgent,
      agency
    })

    return NextResponse.json({
      success: true,
      result,
      message: "Form submission processed successfully"
    })
  } catch (error) {
    console.error("Error processing smart form submission:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper functions
function getFormTemplates() {
  return [
    {
      id: "consultation_template",
      name: "Consultation Request Template",
      serviceType: "CONSULTATION",
      description: "Template for booking consultation appointments",
      fields: [
        { id: "name", type: "TEXT", label: "Full Name", required: true },
        { id: "email", type: "EMAIL", label: "Email", required: true },
        { id: "phone", type: "PHONE", label: "Phone", required: true },
        { id: "service_interest", type: "SELECT", label: "Service Interest", required: true }
      ]
    },
    {
      id: "visa_template",
      name: "Visa Application Template",
      serviceType: "VISA_PROCESSING",
      description: "Template for visa processing applications",
      fields: [
        { id: "passport_number", type: "TEXT", label: "Passport Number", required: true },
        { id: "visa_type", type: "SELECT", label: "Visa Type", required: true },
        { id: "destination_country", type: "SELECT", label: "Destination Country", required: true }
      ]
    }
  ]
}

async function setupFormAutomation(form: any, agency: any) {
  try {
    console.log(`Setting up automation for form ${form.name}`)
    
    // In a real implementation, this would:
    // 1. Create webhook endpoints for form submissions
    // 2. Set up email/SMS templates for follow-ups
    // 3. Configure lead assignment rules
    // 4. Set up resource delivery automation
    // 5. Create analytics tracking
    
    return true
  } catch (error) {
    console.error("Error setting up form automation:", error)
    return false
  }
}

async function processSmartFormSubmission(formId: string, submissionData: any, context: any) {
  try {
    // Get form configuration
    const formConfig = await getFormConfiguration(formId, context.agency.id)
    if (!formConfig) {
      throw new Error("Form not found")
    }

    // Validate submission data
    const validationResult = await validateFormSubmission(submissionData, formConfig)
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(", ")}`)
    }

    // Process branching logic
    const branchingResult = await processBranchingLogic(submissionData, formConfig)
    
    // Create lead if enabled
    let lead = null
    if (formConfig.automation?.createLead) {
      lead = await createLeadFromForm(submissionData, formConfig, context)
    }

    // Deliver resources
    if (formConfig.automation?.resources) {
      await deliverResources(lead, formConfig.automation.resources, context)
    }

    // Schedule follow-up
    if (formConfig.automation?.followUp?.enabled) {
      await scheduleFollowUp(lead, formConfig.automation.followUp, context)
    }

    // Track submission analytics
    await trackSubmission(formId, submissionData, context)

    return {
      success: true,
      leadId: lead?.id,
      nextStep: branchingResult.nextStep,
      deliveredResources: formConfig.automation?.resources?.length || 0,
      followUpScheduled: formConfig.automation?.followUp?.enabled || false
    }
  } catch (error) {
    console.error("Error processing smart form submission:", error)
    throw error
  }
}

async function getFormConfiguration(formId: string, agencyId: string) {
  // In a real implementation, this would fetch from database
  return {
    id: formId,
    agencyId,
    fields: [
      { id: "name", type: "TEXT", label: "Full Name", required: true },
      { id: "email", type: "EMAIL", label: "Email", required: true }
    ],
    branchingLogic: [],
    automation: {
      createLead: true,
      followUp: { enabled: true, delay: 24, type: "EMAIL" },
      resources: []
    }
  }
}

async function validateFormSubmission(data: any, formConfig: any) {
  const errors: string[] = []

  for (const field of formConfig.fields) {
    if (field.required && !data[field.id]) {
      errors.push(`${field.label} is required`)
    }

    if (field.validation) {
      const value = data[field.id]
      
      if (field.validation.pattern && value && !new RegExp(field.validation.pattern).test(value)) {
        errors.push(`${field.label} format is invalid`)
      }
      
      if (field.validation.min && value && value.length < field.validation.min) {
        errors.push(`${field.label} must be at least ${field.validation.min} characters`)
      }
      
      if (field.validation.max && value && value.length > field.validation.max) {
        errors.push(`${field.label} must be no more than ${field.validation.max} characters`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

async function processBranchingLogic(data: any, formConfig: any) {
  try {
    if (!formConfig.branchingLogic || formConfig.branchingLogic.length === 0) {
      return { nextStep: null }
    }

    for (const branch of formConfig.branchingLogic) {
      const fieldValue = data[branch.field]
      
      for (const condition of branch.conditions) {
        let conditionMet = false
        
        switch (condition.operator) {
          case "equals":
            conditionMet = fieldValue === condition.value
            break
          case "contains":
            conditionMet = fieldValue?.includes(condition.value)
            break
          case "greater_than":
            conditionMet = fieldValue > condition.value
            break
          case "less_than":
            conditionMet = fieldValue < condition.value
            break
          case "in":
            conditionMet = Array.isArray(condition.value) && condition.value.includes(fieldValue)
            break
        }
        
        if (conditionMet) {
          return { nextStep: condition.nextStep, action: condition.action }
        }
      }
    }

    return { nextStep: null }
  } catch (error) {
    console.error("Error processing branching logic:", error)
    return { nextStep: null }
  }
}

async function createLeadFromForm(data: any, formConfig: any, context: any) {
  try {
    console.log("Creating lead from form submission")
    
    // In a real implementation, this would:
    // 1. Create lead record in database
    // 2. Assign to consultant if specified
    // 3. Apply tags
    // 4. Set up lead nurturing workflow
    
    return {
      id: `lead_${Date.now()}`,
      name: data.name,
      email: data.email,
      phone: data.phone,
      source: "SMART_FORM",
      tags: formConfig.automation?.tags || []
    }
  } catch (error) {
    console.error("Error creating lead from form:", error)
    return null
  }
}

async function deliverResources(lead: any, resources: any[], context: any) {
  try {
    console.log(`Delivering ${resources.length} resources`)
    
    for (const resource of resources) {
      switch (resource.delivery) {
        case "IMMEDIATE":
          // Return resources in response
          break
        case "EMAIL":
          await sendResourceEmail(lead, resource, context)
          break
        case "SMS":
          await sendResourceSMS(lead, resource, context)
          break
      }
    }
    
    return true
  } catch (error) {
    console.error("Error delivering resources:", error)
    return false
  }
}

async function scheduleFollowUp(lead: any, followUp: any, context: any) {
  try {
    console.log(`Scheduling ${followUp.type} follow-up in ${followUp.delay} hours`)
    
    // In a real implementation, this would:
    // 1. Create scheduled task/job
    // 2. Set up reminder system
    // 3. Create follow-up template
    
    return true
  } catch (error) {
    console.error("Error scheduling follow-up:", error)
    return false
  }
}

async function trackSubmission(formId: string, data: any, context: any) {
  try {
    console.log(`Tracking submission for form ${formId}`)
    
    // In a real implementation, this would:
    // 1. Update form submission count
    // 2. Track conversion metrics
    // 3. Log analytics event
    // 4. Update funnel progress
    
    return true
  } catch (error) {
    console.error("Error tracking submission:", error)
    return false
  }
}

async function sendResourceEmail(lead: any, resource: any, context: any) {
  try {
    console.log(`Sending email resource: ${resource.title}`)
    // Implementation for sending email
    return true
  } catch (error) {
    console.error("Error sending resource email:", error)
    return false
  }
}

async function sendResourceSMS(lead: any, resource: any, context: any) {
  try {
    console.log(`Sending SMS resource: ${resource.title}`)
    // Implementation for sending SMS
    return true
  } catch (error) {
    console.error("Error sending resource SMS:", error)
    return false
  }
}