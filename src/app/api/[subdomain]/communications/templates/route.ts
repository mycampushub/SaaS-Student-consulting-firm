import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const emailTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  category: z.enum(["WELCOME", "FOLLOW_UP", "REMINDER", "NOTIFICATION", "MARKETING", "TRANSACTIONAL", "CUSTOM"]),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional()
})

const smsTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  category: z.enum(["WELCOME", "FOLLOW_UP", "REMINDER", "NOTIFICATION", "MARKETING", "TRANSACTIONAL", "CUSTOM"]),
  message: z.string().min(1, "Message is required"),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // "email" or "sms"
    const category = searchParams.get("category")
    const isActive = searchParams.get("isActive")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    if (!type || !["email", "sms"].includes(type)) {
      return NextResponse.json({ error: "Template type (email/sms) is required" }, { status: 400 })
    }

    const where = {
      agencyId: agency.id,
      ...(category && { category: category }),
      ...(isActive !== null && { isActive: isActive === "true" })
    }

    if (type === "email") {
      const [templates, total] = await Promise.all([
        db.emailTemplate.findMany({
          where,
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          skip: (page - 1) * limit,
          take: limit
        }),
        db.emailTemplate.count({ where })
      ])

      // Parse JSON fields
      const processedTemplates = templates.map(template => ({
        ...template,
        variables: template.variables ? JSON.parse(template.variables) : []
      }))

      return NextResponse.json({
        templates: processedTemplates,
        type: "email",
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      })
    } else {
      const [templates, total] = await Promise.all([
        db.smsTemplate.findMany({
          where,
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          skip: (page - 1) * limit,
          take: limit
        }),
        db.smsTemplate.count({ where })
      ])

      // Parse JSON fields
      const processedTemplates = templates.map(template => ({
        ...template,
        variables: template.variables ? JSON.parse(template.variables) : []
      }))

      return NextResponse.json({
        templates: processedTemplates,
        type: "sms",
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      })
    }
  } catch (error) {
    console.error("Error fetching templates:", error)
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
    const { type } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    if (!type || !["email", "sms"].includes(type)) {
      return NextResponse.json({ error: "Template type (email/sms) is required" }, { status: 400 })
    }

    if (type === "email") {
      const validatedData = emailTemplateSchema.parse(body)
      
      // If this is set as default, unset other default templates of the same category
      if (validatedData.isDefault) {
        await db.emailTemplate.updateMany({
          where: {
            agencyId: agency.id,
            category: validatedData.category,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        })
      }

      // Extract variables from template
      const variables = extractVariables(validatedData.subject + " " + validatedData.body)

      const template = await db.emailTemplate.create({
        data: {
          agencyId: agency.id,
          name: validatedData.name,
          description: validatedData.description,
          category: validatedData.category,
          subject: validatedData.subject,
          body: validatedData.body,
          variables: JSON.stringify(variables),
          isActive: validatedData.isActive ?? true,
          isDefault: validatedData.isDefault ?? false
        }
      })

      // Parse JSON fields for response
      const processedTemplate = {
        ...template,
        variables: template.variables ? JSON.parse(template.variables) : []
      }

      return NextResponse.json(processedTemplate)
    } else {
      const validatedData = smsTemplateSchema.parse(body)
      
      // If this is set as default, unset other default templates of the same category
      if (validatedData.isDefault) {
        await db.smsTemplate.updateMany({
          where: {
            agencyId: agency.id,
            category: validatedData.category,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        })
      }

      // Extract variables from template
      const variables = extractVariables(validatedData.message)

      const template = await db.smsTemplate.create({
        data: {
          agencyId: agency.id,
          name: validatedData.name,
          description: validatedData.description,
          category: validatedData.category,
          message: validatedData.message,
          variables: JSON.stringify(variables),
          isActive: validatedData.isActive ?? true,
          isDefault: validatedData.isDefault ?? false
        }
      })

      // Parse JSON fields for response
      const processedTemplate = {
        ...template,
        variables: template.variables ? JSON.parse(template.variables) : []
      }

      return NextResponse.json(processedTemplate)
    }
  } catch (error) {
    console.error("Error creating template:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to extract variables from template text
function extractVariables(text: string): string[] {
  const variablePattern = /\{\{(\w+)\}\}/g
  const variables = new Set<string>()
  let match

  while ((match = variablePattern.exec(text)) !== null) {
    variables.add(match[1])
  }

  return Array.from(variables)
}