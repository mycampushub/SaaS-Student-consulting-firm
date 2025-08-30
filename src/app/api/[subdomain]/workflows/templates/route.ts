import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const workflowTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  category: z.enum(["LEAD_NURTURING", "STUDENT_ONBOARDING", "FOLLOW_UP", "NOTIFICATION", "INTEGRATION", "APPLICATION_PROCESSING", "VISA_PROCESSING"]),
  triggerType: z.enum(["IMMEDIATE", "TIME_DELAY", "SCHEDULED", "RECURRING"]),
  triggerEvent: z.string(),
  nodes: z.array(z.any()).min(1, "At least one node is required"),
  edges: z.array(z.any()).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).max(10).optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const triggerType = searchParams.get("triggerType")
    const isActive = searchParams.get("isActive")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Get predefined workflow templates
    const templates = getWorkflowTemplates()

    // Filter templates based on query parameters
    let filteredTemplates = templates
    
    if (category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === category)
    }
    
    if (triggerType) {
      filteredTemplates = filteredTemplates.filter(t => t.triggerType === triggerType)
    }
    
    if (isActive !== null) {
      filteredTemplates = filteredTemplates.filter(t => t.isActive === (isActive === "true"))
    }

    return NextResponse.json({
      templates: filteredTemplates,
      categories: [...new Set(templates.map(t => t.category))],
      triggerTypes: [...new Set(templates.map(t => t.triggerType))]
    })
  } catch (error) {
    console.error("Error fetching workflow templates:", error)
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
    const { templateId, customizations } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Get the template
    const templates = getWorkflowTemplates()
    const template = templates.find(t => t.id === templateId)

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Apply customizations to the template
    const customizedWorkflow = applyCustomizations(template, customizations)

    // Create the workflow from template
    const workflow = await db.workflow.create({
      data: {
        agencyId: agency.id,
        name: customizedWorkflow.name,
        description: customizedWorkflow.description,
        category: customizedWorkflow.category as any,
        triggers: JSON.stringify(customizedWorkflow.triggers),
        nodes: JSON.stringify(customizedWorkflow.nodes),
        edges: JSON.stringify(customizedWorkflow.edges),
        isActive: customizedWorkflow.isActive,
        priority: customizedWorkflow.priority
      }
    })

    return NextResponse.json({
      success: true,
      workflow,
      template: {
        id: template.id,
        name: template.name
      },
      message: "Workflow created successfully from template"
    })
  } catch (error) {
    console.error("Error creating workflow from template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get predefined workflow templates
function getWorkflowTemplates(): any[] {
  return [
    {
      id: "lead_welcome_sequence",
      name: "Lead Welcome Sequence",
      description: "Automated welcome sequence for new leads with immediate follow-up",
      category: "LEAD_NURTURING",
      triggerType: "IMMEDIATE",
      triggerEvent: "LEAD_CREATED",
      isActive: true,
      priority: 8,
      nodes: [
        {
          id: "node_1",
          type: "email",
          position: { x: 100, y: 100 },
          data: {
            label: "Send Welcome Email",
            config: {
              subject: "Welcome to {{agency_name}}!",
              body: "Hi {{firstName}},\n\nThank you for your interest in our educational consultancy services. We're excited to help you achieve your academic goals.\n\nOne of our expert consultants will be in touch with you shortly to discuss your requirements.\n\nBest regards,\n{{agency_name}} Team",
              templateId: "welcome_email"
            }
          }
        },
        {
          id: "node_2",
          type: "delay",
          position: { x: 300, y: 100 },
          data: {
            label: "Wait 24 Hours",
            config: {
              delay: 1440 // 24 hours in minutes
            }
          }
        },
        {
          id: "node_3",
          type: "task",
          position: { x: 500, y: 100 },
          data: {
            label: "Schedule Follow-up Call",
            config: {
              title: "Follow up with new lead",
              description: "Contact the lead and schedule an initial consultation call",
              type: "CALL",
              category: "LEAD",
              priority: "HIGH",
              dueDate: "2 days"
            }
          }
        },
        {
          id: "node_4",
          type: "notification",
          position: { x: 700, y: 100 },
          data: {
            label: "Notify Consultant",
            config: {
              title: "New Lead Assignment",
              message: "A new lead has been assigned to you. Please follow up within 48 hours.",
              priority: "HIGH",
              channel: "IN_APP"
            }
          }
        }
      ],
      edges: [
        { id: "edge_1", source: "node_1", target: "node_2" },
        { id: "edge_2", source: "node_2", target: "node_3" },
        { id: "edge_3", source: "node_3", target: "node_4" }
      ],
      triggers: [
        {
          eventType: "LEAD_CREATED",
          entityType: "LEAD"
        }
      ]
    },
    {
      id: "lead_nurturing_drip",
      name: "Lead Nurturing Drip Campaign",
      description: "Multi-day email drip campaign for lead nurturing",
      category: "LEAD_NURTURING",
      triggerType: "TIME_DELAY",
      triggerEvent: "LEAD_CREATED",
      isActive: true,
      priority: 6,
      nodes: [
        {
          id: "node_1",
          type: "email",
          position: { x: 100, y: 100 },
          data: {
            label: "Day 1: Educational Content",
            config: {
              subject: "How to Choose the Right University",
              body: "Hi {{firstName}},\n\nChoosing the right university is a crucial decision. Here are some key factors to consider:\n\n1. Academic reputation and rankings\n2. Program specialization\n3. Location and campus life\n4. Career opportunities\n5. Cost and financial aid\n\nWe'll help you navigate these factors to find your perfect match.\n\nBest regards,\n{{agency_name}} Team",
              templateId: "educational_content_1"
            }
          }
        },
        {
          id: "node_2",
          type: "delay",
          position: { x: 300, y: 100 },
          data: {
            label: "Wait 3 Days",
            config: {
              delay: 4320 // 3 days in minutes
            }
          }
        },
        {
          id: "node_3",
          type: "email",
          position: { x: 500, y: 100 },
          data: {
            label: "Day 4: Success Stories",
            config: {
              subject: "Success Stories from Our Students",
              body: "Hi {{firstName}},\n\nWe're proud to share some success stories from students who've successfully secured admissions to top universities:\n\n• Sarah got into Harvard with our guidance\n• Michael received a full scholarship to MIT\n• Emma was accepted into Oxford's medical program\n\nYour success story could be next! Let's discuss how we can help.\n\nBest regards,\n{{agency_name}} Team",
              templateId: "success_stories"
            }
          }
        },
        {
          id: "node_4",
          type: "delay",
          position: { x: 700, y: 100 },
          data: {
            label: "Wait 3 Days",
            config: {
              delay: 4320 // 3 days in minutes
            }
          }
        },
        {
          id: "node_5",
          type: "email",
          position: { x: 900, y: 100 },
          data: {
            label: "Day 7: Consultation Invitation",
            config: {
              subject: "Free Consultation Offer",
              body: "Hi {{firstName}},\n\nAs part of our commitment to helping students achieve their dreams, we'd like to offer you a free 30-minute consultation with one of our expert consultants.\n\nDuring this call, we'll:\n• Review your academic profile\n• Discuss your goals and preferences\n• Provide personalized university recommendations\n• Explain our application process\n\nClick here to schedule your free consultation: [Scheduling Link]\n\nLimited spots available - book yours today!\n\nBest regards,\n{{agency_name}} Team",
              templateId: "consultation_offer"
            }
          }
        }
      ],
      edges: [
        { id: "edge_1", source: "node_1", target: "node_2" },
        { id: "edge_2", source: "node_2", target: "node_3" },
        { id: "edge_3", source: "node_3", target: "node_4" },
        { id: "edge_4", source: "node_4", target: "node_5" }
      ],
      triggers: [
        {
          eventType: "LEAD_CREATED",
          entityType: "LEAD"
        }
      ]
    },
    {
      id: "inactive_lead_reengagement",
      name: "Inactive Lead Re-engagement",
      description: "Re-engage leads that haven't shown activity for 7 days",
      category: "LEAD_NURTURING",
      triggerType: "SCHEDULED",
      triggerEvent: "LEAD_INACTIVE",
      isActive: true,
      priority: 7,
      nodes: [
        {
          id: "node_1",
          type: "condition",
          position: { x: 100, y: 100 },
          data: {
            label: "Check Lead Activity",
            config: {
              conditions: [
                {
                  field: "lastActivity",
                  operator: "greater_than",
                  value: 7 // days
                }
              ]
            }
          }
        },
        {
          id: "node_2",
          type: "email",
          position: { x: 300, y: 50 },
          data: {
            label: "Re-engagement Email",
            config: {
              subject: "We haven't heard from you lately",
              body: "Hi {{firstName}},\n\nWe noticed you haven't been active on our platform recently. We wanted to check in and see if you have any questions about studying abroad.\n\nOur team is here to help you with:\n• University selection guidance\n• Application assistance\n• Visa processing support\n• Scholarship opportunities\n\nIs there anything specific you'd like to know more about?\n\nReply to this email or schedule a call at your convenience.\n\nBest regards,\n{{agency_name}} Team",
              templateId: "reengagement_email"
            }
          }
        },
        {
          id: "node_3",
          type: "sms",
          position: { x: 300, y: 150 },
          data: {
            label: "SMS Follow-up",
            config: {
              message: "Hi {{firstName}}, just checking in! We're here to help with your study abroad plans. Reply YES for a quick call.",
              templateId: "reengagement_sms"
            }
          }
        },
        {
          id: "node_4",
          type: "task",
          position: { x: 500, y: 100 },
          data: {
            label: "Personal Follow-up",
            config: {
              title: "Re-engage inactive lead",
              description: "Make personal contact to re-engage the lead",
              type: "CALL",
              category: "LEAD",
              priority: "MEDIUM",
              dueDate: "2 days"
            }
          }
        }
      ],
      edges: [
        { id: "edge_1", source: "node_1", target: "node_2", label: "true" },
        { id: "edge_2", source: "node_1", target: "node_3", label: "true" },
        { id: "edge_3", source: "node_2", target: "node_4" },
        { id: "edge_4", source: "node_3", target: "node_4" }
      ],
      triggers: [
        {
          eventType: "LEAD_INACTIVE",
          entityType: "LEAD"
        }
      ]
    },
    {
      id: "application_deadline_reminders",
      name: "Application Deadline Reminders",
      description: "Send reminders before application deadlines",
      category: "APPLICATION_PROCESSING",
      triggerType: "SCHEDULED",
      triggerEvent: "DEADLINE_APPROACHING",
      isActive: true,
      priority: 9,
      nodes: [
        {
          id: "node_1",
          type: "email",
          position: { x: 100, y: 100 },
          data: {
            label: "30-Day Deadline Notice",
            config: {
              subject: "Application Deadline Approaching - 30 Days Left",
              body: "Hi {{firstName}},\n\nThis is a friendly reminder that your application deadline for {{university}} is approaching in 30 days.\n\nHere's what you need to complete:\n• Finalize your personal statement\n• Submit recommendation letters\n• Complete financial aid forms\n• Upload required documents\n\nDon't wait until the last minute! Our team is here to help you complete everything on time.\n\nBest regards,\n{{agency_name}} Team",
              templateId: "deadline_30_day"
            }
          }
        },
        {
          id: "node_2",
          type: "delay",
          position: { x: 300, y: 100 },
          data: {
            label: "Wait 20 Days",
            config: {
              delay: 28800 // 20 days in minutes
            }
          }
        },
        {
          id: "node_3",
          type: "email",
          position: { x: 500, y: 100 },
          data: {
            label: "10-Day Urgent Notice",
            config: {
              subject: "URGENT: Application Deadline in 10 Days",
              body: "Hi {{firstName}},\n\nURGENT: Your application deadline for {{university}} is only 10 days away!\n\nTime is running out. Here's your immediate action list:\n• Submit all remaining documents TODAY\n• Contact recommenders if you haven't heard back\n• Review your application for completeness\n• Pay application fees if required\n\nPlease contact us immediately if you need assistance completing your application.\n\nBest regards,\n{{agency_name}} Team",
              templateId: "deadline_10_day"
            }
          }
        },
        {
          id: "node_4",
          type: "delay",
          position: { x: 700, y: 100 },
          data: {
            label: "Wait 7 Days",
            config: {
              delay: 10080 // 7 days in minutes
            }
          }
        },
        {
          id: "node_5",
          type: "email",
          position: { x: 900, y: 100 },
          data: {
            label: "3-Day Final Notice",
            config: {
              subject: "FINAL REMINDER: Application Deadline in 3 Days",
              body: "Hi {{firstName}},\n\nFINAL REMINDER: Your application deadline for {{university}} is in 3 days!\n\nThis is your last chance to complete your application. Please:\n• Submit all documents immediately\n• Double-check all requirements\n• Contact our office if you need emergency assistance\n\nDon't miss this opportunity! Call us now if you need help.\n\nBest regards,\n{{agency_name}} Team",
              templateId: "deadline_3_day"
            }
          }
        }
      ],
      edges: [
        { id: "edge_1", source: "node_1", target: "node_2" },
        { id: "edge_2", source: "node_2", target: "node_3" },
        { id: "edge_3", source: "node_3", target: "node_4" },
        { id: "edge_4", source: "node_4", target: "node_5" }
      ],
      triggers: [
        {
          eventType: "DEADLINE_APPROACHING",
          entityType: "APPLICATION"
        }
      ]
    }
  ]
}

// Helper function to apply customizations to a template
function applyCustomizations(template: any, customizations: any): any {
  const customized = { ...template }
  
  // Apply name customization
  if (customizations.name) {
    customized.name = customizations.name
  }
  
  // Apply description customization
  if (customizations.description) {
    customized.description = customizations.description
  }
  
  // Apply priority customization
  if (customizations.priority !== undefined) {
    customized.priority = customizations.priority
  }
  
  // Customize nodes
  if (customizations.nodes) {
    customized.nodes = template.nodes.map((node: any, index: number) => {
      const nodeCustomization = customizations.nodes[index] || {}
      
      return {
        ...node,
        data: {
          ...node.data,
          config: {
            ...node.data.config,
            ...nodeCustomization.config
          }
        }
      }
    })
  }
  
  // Customize triggers
  if (customizations.triggers) {
    customized.triggers = customizations.triggers
  }
  
  // Remove template ID
  delete customized.id
  
  return customized
}