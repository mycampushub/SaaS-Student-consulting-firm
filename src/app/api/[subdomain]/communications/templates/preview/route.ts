import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const previewSchema = z.object({
  type: z.enum(["email", "sms"]),
  templateId: z.string(),
  data: z.record(z.any()).optional(),
  entityType: z.enum(["STUDENT", "LEAD", "USER"]).optional(),
  entityId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = previewSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    let templateData: any = null
    let entityData: any = null

    // Get template
    if (validatedData.type === "email") {
      templateData = await db.emailTemplate.findFirst({
        where: {
          id: validatedData.templateId,
          agencyId: agency.id
        }
      })
    } else {
      templateData = await db.smsTemplate.findFirst({
        where: {
          id: validatedData.templateId,
          agencyId: agency.id
        }
      })
    }

    if (!templateData) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Get entity data if provided
    if (validatedData.entityType && validatedData.entityId) {
      entityData = await getEntity(validatedData.entityType, validatedData.entityId, agency.id)
    }

    // Prepare template variables
    let templateVariables: any = validatedData.data || {}

    // Add entity data if available
    if (entityData) {
      templateVariables = {
        ...templateVariables,
        ...getEntityVariables(entityData, validatedData.entityType)
      }
    }

    // Add agency data
    templateVariables = {
      ...templateVariables,
      agencyName: agency.name,
      agencySubdomain: agency.subdomain
    }

    // Personalize template
    if (validatedData.type === "email") {
      const personalizedSubject = personalizeTemplate(templateData.subject, templateVariables)
      const personalizedBody = personalizeTemplate(templateData.body, templateVariables)

      return NextResponse.json({
        type: "email",
        subject: personalizedSubject,
        body: personalizedBody,
        variables: templateData.variables ? JSON.parse(templateData.variables) : [],
        usedVariables: Object.keys(templateVariables)
      })
    } else {
      const personalizedMessage = personalizeTemplate(templateData.message, templateVariables)

      return NextResponse.json({
        type: "sms",
        message: personalizedMessage,
        variables: templateData.variables ? JSON.parse(templateData.variables) : [],
        usedVariables: Object.keys(templateVariables)
      })
    }
  } catch (error) {
    console.error("Error previewing template:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get entity
async function getEntity(entityType: string, entityId: string, agencyId: string) {
  switch (entityType) {
    case "STUDENT":
      return await db.student.findFirst({
        where: { id: entityId, agencyId: agencyId }
      })
    case "LEAD":
      return await db.lead.findFirst({
        where: { id: entityId, agencyId: agencyId }
      })
    case "USER":
      return await db.user.findFirst({
        where: { id: entityId, agencyId: agencyId }
      })
    default:
      return null
  }
}

// Helper function to get entity variables
function getEntityVariables(entity: any, entityType: string): any {
  const baseVariables = {
    id: entity.id,
    firstName: entity.firstName || "",
    lastName: entity.lastName || "",
    email: entity.email || "",
    phone: entity.phone || "",
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt
  }

  if (entityType === "STUDENT") {
    return {
      ...baseVariables,
      studentId: entity.studentId || "",
      dateOfBirth: entity.dateOfBirth || "",
      nationality: entity.nationality || "",
      country: entity.country || "",
      currentEducation: entity.currentEducation || "",
      gpa: entity.gpa || "",
      status: entity.status || ""
    }
  } else if (entityType === "LEAD") {
    return {
      ...baseVariables,
      source: entity.source || "",
      campaign: entity.campaign?.name || "",
      status: entity.status || "",
      score: entity.score || 0
    }
  } else if (entityType === "USER") {
    return {
      ...baseVariables,
      name: entity.name || "",
      role: entity.role || "",
      title: entity.title || "",
      department: entity.department || ""
    }
  }

  return baseVariables
}

// Helper function to personalize template
function personalizeTemplate(template: string, variables: any): string {
  let personalized = template

  // Replace all variables in the format {{variableName}}
  Object.keys(variables).forEach(key => {
    const value = variables[key]
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    
    if (value !== null && value !== undefined) {
      // Format dates
      if (value instanceof Date) {
        personalized = personalized.replace(regex, value.toLocaleDateString())
      } else if (typeof value === 'object') {
        personalized = personalized.replace(regex, JSON.stringify(value))
      } else {
        personalized = personalized.replace(regex, String(value))
      }
    } else {
      // Replace with empty string if value is null/undefined
      personalized = personalized.replace(regex, '')
    }
  })

  return personalized
}