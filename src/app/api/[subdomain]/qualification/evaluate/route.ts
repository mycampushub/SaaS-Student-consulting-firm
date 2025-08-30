import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const evaluateQualificationSchema = z.object({
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
    const validatedData = evaluateQualificationSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Get active qualification criteria
    const criteria = await db.qualificationCriteria.findMany({
      where: {
        agencyId: agency.id,
        isActive: true
      }
    })

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

    const results = []
    let totalWeightedScore = 0
    let totalWeight = 0

    // Evaluate each criterion
    for (const criterion of criteria) {
      const conditions = JSON.parse(criterion.conditions)
      
      // Check if conditions are met
      const isMet = evaluateConditions(entity, conditions, validatedData.context)
      
      // Calculate weighted score
      const weightedScore = isMet ? criterion.weight : 0
      totalWeightedScore += weightedScore
      totalWeight += criterion.weight

      results.push({
        criterionId: criterion.id,
        criterionName: criterion.name,
        category: criterion.category,
        isMet,
        weight: criterion.weight,
        weightedScore,
        conditions: conditions
      })
    }

    // Calculate overall qualification score
    const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0
    
    // Determine qualification level
    let qualificationLevel = "UNQUALIFIED"
    if (overallScore >= 0.8) {
      qualificationLevel = "HIGHLY_QUALIFIED"
    } else if (overallScore >= 0.6) {
      qualificationLevel = "QUALIFIED"
    } else if (overallScore >= 0.4) {
      qualificationLevel = "MODERATELY_QUALIFIED"
    }

    // Get recommendations based on qualification level
    const recommendations = getRecommendations(qualificationLevel, results)

    return NextResponse.json({
      entityId: validatedData.leadId || validatedData.studentId,
      entityType: validatedData.entityType,
      overallScore: Math.round(overallScore * 100) / 100,
      qualificationLevel,
      totalCriteria: criteria.length,
      metCriteria: results.filter(r => r.isMet).length,
      results,
      recommendations,
      evaluationTime: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error evaluating qualification:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to evaluate conditions
function evaluateConditions(entity: any, conditions: any, context?: any): boolean {
  for (const condition of conditions) {
    const { field, operator, value, type } = condition
    
    let fieldValue = null
    
    // Get field value based on type
    switch (type) {
      case "academic":
        fieldValue = getAcademicValue(entity, field)
        break
      case "financial":
        fieldValue = getFinancialValue(entity, field)
        break
      case "geographic":
        fieldValue = getGeographicValue(entity, field)
        break
      case "language":
        fieldValue = getLanguageValue(entity, field)
        break
      case "experience":
        fieldValue = getExperienceValue(entity, field)
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
function getAcademicValue(entity: any, field: string): any {
  switch (field) {
    case "gpa":
      return entity.gpa
    case "testScores":
      return entity.testScores ? JSON.parse(entity.testScores) : null
    case "currentEducation":
      return entity.currentEducation
    case "hasBachelorDegree":
      return entity.currentEducation?.toLowerCase().includes("bachelor") || false
    case "hasMasterDegree":
      return entity.currentEducation?.toLowerCase().includes("master") || false
    default:
      return entity[field]
  }
}

function getFinancialValue(entity: any, field: string): any {
  switch (field) {
    case "budget":
      return entity.budget
    case "hasSufficientFunds":
      return entity.budget >= 50000 // Example threshold
    case "financialDocuments":
      return entity.documents ? JSON.parse(entity.documents).filter((d: any) => d.category === "financial").length : 0
    default:
      return entity[field]
  }
}

function getGeographicValue(entity: any, field: string): any {
  switch (field) {
    case "nationality":
      return entity.nationality
    case "country":
      return entity.country
    case "preferredCountries":
      return entity.preferredCountries ? JSON.parse(entity.preferredCountries) : []
    case "isLocalStudent":
      return entity.nationality === "United States" // Example for US-based agency
    default:
      return entity[field]
  }
}

function getLanguageValue(entity: any, field: string): any {
  switch (field) {
    case "englishProficiency":
      // This would typically come from test scores like TOEFL/IELTS
      const testScores = entity.testScores ? JSON.parse(entity.testScores) : {}
      return testScores.toefl || testScores.ielts || null
    case "toeflScore":
      const testScores = entity.testScores ? JSON.parse(entity.testScores) : {}
      return testScores.toefl || null
    case "ieltsScore":
      const testScores2 = entity.testScores ? JSON.parse(entity.testScores) : {}
      return testScores2.ielts || null
    case "meetsLanguageRequirements":
      const testScores3 = entity.testScores ? JSON.parse(entity.testScores) : {}
      const toefl = testScores3.toefl || 0
      const ielts = testScores3.ielts || 0
      return toefl >= 80 || ielts >= 6.5 // Example thresholds
    default:
      return entity[field]
  }
}

function getExperienceValue(entity: any, field: string): any {
  switch (field) {
    case "workExperience":
      // This would typically come from additional profile data
      return 0 // Placeholder
    case "hasRelevantExperience":
      // This would typically come from additional profile data
      return false // Placeholder
    case "yearsOfExperience":
      // This would typically come from additional profile data
      return 0 // Placeholder
    default:
      return entity[field]
  }
}

// Helper function to get recommendations based on qualification level
function getRecommendations(qualificationLevel: string, results: any[]): string[] {
  const recommendations = []
  
  switch (qualificationLevel) {
    case "HIGHLY_QUALIFIED":
      recommendations.push("Prioritize this lead for immediate follow-up")
      recommendations.push("Consider for premium programs and scholarships")
      recommendations.push("Fast-track application process")
      break
      
    case "QUALIFIED":
      recommendations.push("Schedule consultation within 24-48 hours")
      recommendations.push("Provide detailed program information")
      recommendations.push("Discuss application requirements and timeline")
      break
      
    case "MODERATELY_QUALIFIED":
      recommendations.push("Provide additional resources and guidance")
      recommendations.push("Suggest preparatory courses or programs")
      recommendations.push("Regular follow-up to track progress")
      break
      
    case "UNQUALIFIED":
      recommendations.push("Provide information about requirements")
      recommendations.push("Suggest alternative pathways or programs")
      recommendations.push("Add to nurturing campaign")
      break
  }
  
  // Add specific recommendations based on unmet criteria
  const unmetCriteria = results.filter(r => !r.isMet)
  for (const criterion of unmetCriteria) {
    switch (criterion.category) {
      case "ACADEMIC":
        recommendations.push("Address academic requirements: " + criterion.criterionName)
        break
      case "FINANCIAL":
        recommendations.push("Discuss financial options and requirements: " + criterion.criterionName)
        break
      case "LANGUAGE":
        recommendations.push("Provide language proficiency resources: " + criterion.criterionName)
        break
      case "GEOGRAPHIC":
        recommendations.push("Discuss location preferences and options: " + criterion.criterionName)
        break
    }
  }
  
  return recommendations
}