import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const calculateScoreSchema = z.object({
  leadId: z.string().optional(),
  studentId: z.string().optional(),
  entityType: z.enum(["LEAD", "STUDENT"]),
  context: z.any().optional()
})

export async function POST(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = calculateScoreSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Get active lead scoring rules
    const rules = await db.leadScoreRule.findMany({
      where: {
        agencyId: agency.id,
        isActive: true
      },
      orderBy: { priority: "desc" }
    })

    let totalScore = 0
    const appliedRules = []
    const scoreDetails = []

    // Get the entity (lead or student)
    let entity = null
    if (validatedData.entityType === "LEAD" && validatedData.leadId) {
      entity = await db.lead.findFirst({
        where: {
          id: validatedData.leadId,
          agencyId: agency.id
        },
        include: {
          formSubmissions: true,
          campaign: true
        }
      })
    } else if (validatedData.entityType === "STUDENT" && validatedData.studentId) {
      entity = await db.student.findFirst({
        where: {
          id: validatedData.studentId,
          agencyId: agency.id
        },
        include: {
          applications: true,
          leads: true
        }
      })
    }

    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 })
    }

    // Apply each rule
    for (const rule of rules) {
      const conditions = JSON.parse(rule.conditions)
      const targetAudience = rule.targetAudience ? JSON.parse(rule.targetAudience) : null

      // Check if rule applies to this entity
      if (targetAudience && !matchesTargetAudience(entity, targetAudience)) {
        continue
      }

      // Check if conditions are met
      if (evaluateConditions(entity, conditions, validatedData.context)) {
        let scoreChange = 0

        switch (rule.action) {
          case "ADD":
            scoreChange = rule.points
            totalScore += scoreChange
            break
          case "SUBTRACT":
            scoreChange = -rule.points
            totalScore += scoreChange
            break
          case "MULTIPLY":
            totalScore = totalScore * rule.points
            scoreChange = totalScore
            break
          case "SET":
            const oldScore = totalScore
            totalScore = rule.points
            scoreChange = totalScore - oldScore
            break
        }

        // Record the score application
        const scoreRecord = await db.leadScore.create({
          data: {
            agencyId: agency.id,
            leadId: validatedData.entityType === "LEAD" ? validatedData.leadId : null,
            studentId: validatedData.entityType === "STUDENT" ? validatedData.studentId : null,
            ruleId: rule.id,
            points: Math.abs(scoreChange),
            action: rule.action,
            reason: `Rule "${rule.name}" applied`
          }
        })

        appliedRules.push(rule)
        scoreDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          action: rule.action,
          points: scoreChange,
          reason: `Rule "${rule.name}" applied`,
          timestamp: scoreRecord.createdAt
        })
      }
    }

    return NextResponse.json({
      entityId: validatedData.leadId || validatedData.studentId,
      entityType: validatedData.entityType,
      totalScore,
      appliedRules: appliedRules.length,
      scoreDetails,
      calculationTime: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error calculating lead score:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to check if entity matches target audience
function matchesTargetAudience(entity: any, targetAudience: any): boolean {
  // Implement target audience matching logic
  // This could include demographic filters, source filters, etc.
  for (const filter of targetAudience) {
    const { field, operator, value } = filter
    
    switch (field) {
      case "source":
        if (entity.source && !evaluateOperator(entity.source, operator, value)) {
          return false
        }
        break
      case "status":
        if (entity.status && !evaluateOperator(entity.status, operator, value)) {
          return false
        }
        break
      case "createdAt":
        if (entity.createdAt && !evaluateOperator(new Date(entity.createdAt), operator, new Date(value))) {
          return false
        }
        break
      // Add more field types as needed
    }
  }
  
  return true
}

// Helper function to evaluate conditions
function evaluateConditions(entity: any, conditions: any, context?: any): boolean {
  for (const condition of conditions) {
    const { field, operator, value, type } = condition
    
    let fieldValue = null
    
    // Get field value based on type
    switch (type) {
      case "demographic":
        fieldValue = getDemographicValue(entity, field)
        break
      case "engagement":
        fieldValue = getEngagementValue(entity, field)
        break
      case "academic":
        fieldValue = getAcademicValue(entity, field)
        break
      case "behavioral":
        fieldValue = getBehavioralValue(entity, field, context)
        break
      case "source":
        fieldValue = getSourceValue(entity, field)
        break
      default:
        fieldValue = entity[field]
    }
    
    if (!evaluateOperator(fieldValue, operator, value)) {
      return false
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
    case "exists":
      return fieldValue !== null && fieldValue !== undefined
    case "not_exists":
      return fieldValue === null || fieldValue === undefined
    default:
      return false
  }
}

// Helper functions to get field values
function getDemographicValue(entity: any, field: string): any {
  switch (field) {
    case "age":
      if (entity.dateOfBirth) {
        const birthDate = new Date(entity.dateOfBirth)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        return age
      }
      return null
    case "nationality":
      return entity.nationality
    case "country":
      return entity.country
    default:
      return entity[field]
  }
}

function getEngagementValue(entity: any, field: string): any {
  switch (field) {
    case "emailOpens":
      // This would typically come from email tracking data
      return 0 // Placeholder
    case "clicks":
      // This would typically come from link tracking data
      return 0 // Placeholder
    case "formSubmissions":
      return entity.formSubmissions?.length || 0
    case "lastActivity":
      return entity.updatedAt || entity.createdAt
    default:
      return entity[field]
  }
}

function getAcademicValue(entity: any, field: string): any {
  switch (field) {
    case "gpa":
      return entity.gpa
    case "testScores":
      return entity.testScores ? JSON.parse(entity.testScores) : null
    case "currentEducation":
      return entity.currentEducation
    default:
      return entity[field]
  }
}

function getBehavioralValue(entity: any, field: string, context?: any): any {
  switch (field) {
    case "timeSinceLastActivity":
      if (entity.updatedAt) {
        const lastActivity = new Date(entity.updatedAt)
        const now = new Date()
        return (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24) // days
      }
      return null
    case "visitCount":
      // This would typically come from web analytics
      return 0 // Placeholder
    case "pageViews":
      // This would typically come from web analytics
      return 0 // Placeholder
    default:
      return context?.[field] || entity[field]
  }
}

function getSourceValue(entity: any, field: string): any {
  switch (field) {
    case "source":
      return entity.source
    case "campaign":
      return entity.campaign?.name
    case "medium":
      // This would typically come from UTM parameters
      return null // Placeholder
    default:
      return entity[field]
  }
}