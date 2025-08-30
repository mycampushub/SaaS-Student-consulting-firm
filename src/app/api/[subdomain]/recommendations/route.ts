import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const recommendationSchema = z.object({
  entityId: z.string(),
  entityType: z.enum(["STUDENT", "LEAD"]),
  engineId: z.string().optional(),
  inputProfile: z.any(),
  maxResults: z.number().int().min(1).max(50).optional(),
  minScore: z.number().min(0).max(1).optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get("entityId")
    const entityType = searchParams.get("entityType")
    const engineId = searchParams.get("engineId")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "20")

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if automated recommendations are enabled
    if (!agency.featureSettings?.automatedRecommendations) {
      return NextResponse.json({ 
        error: "Automated recommendations are not enabled for this agency" 
      }, { status: 403 })
    }

    const where: any = { agencyId: agency.id }
    
    if (entityId) where.entityId = entityId
    if (entityType) where.entityType = entityType
    if (engineId) where.engineId = engineId
    if (status) where.status = status

    const recommendations = await db.recommendation.findMany({
      where,
      include: {
        engine: true,
        student: entityType === "STUDENT",
        lead: entityType === "LEAD"
      },
      orderBy: { generatedAt: "desc" },
      take: limit
    })

    // Parse JSON fields
    const processedRecommendations = recommendations.map(rec => ({
      ...rec,
      recommendations: JSON.parse(rec.recommendations),
      scores: JSON.parse(rec.scores),
      reasons: rec.reasons ? JSON.parse(rec.reasons) : [],
      inputProfile: JSON.parse(rec.inputProfile)
    }))

    return NextResponse.json({ recommendations: processedRecommendations })
  } catch (error) {
    console.error("Error fetching recommendations:", error)
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
    const validatedData = recommendationSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if automated recommendations are enabled
    if (!agency.featureSettings?.automatedRecommendations) {
      return NextResponse.json({ 
        error: "Automated recommendations are not enabled for this agency" 
      }, { status: 403 })
    }

    // Get entity (student or lead)
    let entity
    if (validatedData.entityType === "STUDENT") {
      entity = await db.student.findFirst({
        where: { id: validatedData.entityId, agencyId: agency.id }
      })
    } else {
      entity = await db.lead.findFirst({
        where: { id: validatedData.entityId, agencyId: agency.id }
      })
    }

    if (!entity) {
      return NextResponse.json({ 
        error: `${validatedData.entityType} not found` 
      }, { status: 404 })
    }

    // Get recommendation engine
    let engine
    if (validatedData.engineId) {
      engine = await db.recommendationEngine.findFirst({
        where: { id: validatedData.engineId, agencyId: agency.id, status: "ACTIVE" }
      })
    } else {
      // Use default engine
      engine = await db.recommendationEngine.findFirst({
        where: { agencyId: agency.id, isDefault: true, status: "ACTIVE" }
      })
    }

    if (!engine) {
      return NextResponse.json({ 
        error: "No active recommendation engine found" 
      }, { status: 404 })
    }

    // Generate recommendations
    const recommendationResult = await generateRecommendations(
      agency.id,
      engine,
      entity,
      validatedData.entityType,
      validatedData.inputProfile,
      validatedData.maxResults,
      validatedData.minScore
    )

    // Create recommendation record
    const recommendation = await db.recommendation.create({
      data: {
        agencyId: agency.id,
        engineId: engine.id,
        entityId: validatedData.entityId,
        entityType: validatedData.entityType,
        recommendations: JSON.stringify(recommendationResult.recommendations),
        scores: JSON.stringify(recommendationResult.scores),
        reasons: JSON.stringify(recommendationResult.reasons),
        inputProfile: JSON.stringify(validatedData.inputProfile),
        expiresAt: recommendationResult.expiresAt
      },
      include: {
        engine: true,
        student: validatedData.entityType === "STUDENT",
        lead: validatedData.entityType === "LEAD"
      }
    })

    // Parse JSON fields for response
    const processedRecommendation = {
      ...recommendation,
      recommendations: JSON.parse(recommendation.recommendations),
      scores: JSON.parse(recommendation.scores),
      reasons: JSON.parse(recommendation.reasons),
      inputProfile: JSON.parse(recommendation.inputProfile)
    }

    return NextResponse.json(processedRecommendation)
  } catch (error) {
    console.error("Error creating recommendations:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to generate recommendations
async function generateRecommendations(
  agencyId: string,
  engine: any,
  entity: any,
  entityType: string,
  inputProfile: any,
  maxResults: number = 10,
  minScore: number = 0.5
) {
  try {
    // Parse engine configuration
    const matchingRules = JSON.parse(engine.matchingRules)
    const scoringWeights = JSON.parse(engine.scoringWeights)
    const filters = engine.filters ? JSON.parse(engine.filters) : []

    // Get candidate items based on engine type
    let candidates = []
    
    switch (engine.type) {
      case "UNIVERSITY_RECOMMENDATION":
        candidates = await getUniversityCandidates(agencyId, inputProfile)
        break
      case "PROGRAM_RECOMMENDATION":
        candidates = await getProgramCandidates(agencyId, inputProfile)
        break
      case "SCHOLARSHIP_RECOMMENDATION":
        candidates = await getScholarshipCandidates(agencyId, inputProfile)
        break
      case "VISA_PATHWAY_RECOMMENDATION":
        candidates = await getVisaPathwayCandidates(agencyId, inputProfile)
        break
      default:
        candidates = await getCustomCandidates(agencyId, engine, inputProfile)
    }

    // Apply filters
    candidates = applyFilters(candidates, filters, inputProfile)

    // Score candidates
    const scoredCandidates = await scoreCandidates(
      candidates,
      inputProfile,
      matchingRules,
      scoringWeights
    )

    // Sort by score and filter by minimum score
    const filteredCandidates = scoredCandidates
      .filter(candidate => candidate.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)

    // Generate explanations
    const recommendations = filteredCandidates.map(candidate => candidate.item)
    const scores = filteredCandidates.map(candidate => candidate.score)
    const reasons = filteredCandidates.map(candidate => candidate.reasons)

    // Set expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    return {
      recommendations,
      scores,
      reasons,
      expiresAt
    }
  } catch (error) {
    console.error("Error generating recommendations:", error)
    return {
      recommendations: [],
      scores: [],
      reasons: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  }
}

// Helper functions to get candidates based on type
async function getUniversityCandidates(agencyId: string, profile: any) {
  const universities = await db.university.findMany({
    where: { agencyId },
    include: {
      applications: {
        include: {
          student: true
        }
      }
    }
  })

  return universities.map(uni => ({
    id: uni.id,
    name: uni.name,
    country: uni.country,
    city: uni.city,
    worldRanking: uni.worldRanking,
    nationalRanking: uni.nationalRanking,
    programs: uni.programs ? JSON.parse(uni.programs) : [],
    requirements: uni.requirements ? JSON.parse(uni.requirements) : {},
    commissionRate: uni.commissionRate,
    applicationCount: uni.applications.length,
    successRate: calculateSuccessRate(uni.applications)
  }))
}

async function getProgramCandidates(agencyId: string, profile: any) {
  const universities = await db.university.findMany({
    where: { agencyId }
  })

  const programs = []
  
  for (const uni of universities) {
    const uniPrograms = uni.programs ? JSON.parse(uni.programs) : []
    for (const program of uniPrograms) {
      programs.push({
        id: `${uni.id}-${program.name}`,
        universityId: uni.id,
        universityName: uni.name,
        programName: program.name,
        level: program.level,
        duration: program.duration,
        requirements: program.requirements || {},
        country: uni.country,
        city: uni.city
      })
    }
  }

  return programs
}

async function getScholarshipCandidates(agencyId: string, profile: any) {
  // Return mock scholarship data for now
  return [
    {
      id: "scholarship-1",
      name: "Excellence Scholarship",
      amount: 5000,
      currency: "USD",
      eligibility: "GPA > 3.5",
      deadline: "2024-12-31"
    },
    {
      id: "scholarship-2",
      name: "Merit Award",
      amount: 2000,
      currency: "USD",
      eligibility: "GPA > 3.0",
      deadline: "2024-11-30"
    }
  ]
}

async function getVisaPathwayCandidates(agencyId: string, profile: any) {
  // Return mock visa pathway data
  return [
    {
      id: "visa-1",
      type: "Student Visa",
      country: "USA",
      processingTime: "3-6 weeks",
      requirements: ["I-20", "Financial Proof", "Passport"],
      successRate: 0.85
    },
    {
      id: "visa-2",
      type: "Study Permit",
      country: "Canada",
      processingTime: "4-8 weeks",
      requirements: ["LOA", "Financial Proof", "Medical Exam"],
      successRate: 0.90
    }
  ]
}

async function getCustomCandidates(agencyId: string, engine: any, profile: any) {
  // Implement custom candidate retrieval based on engine configuration
  return []
}

// Helper functions for filtering and scoring
function applyFilters(candidates: any[], filters: any[], profile: any) {
  return candidates.filter(candidate => {
    return filters.every(filter => {
      switch (filter.type) {
        case "country":
          return filter.values.includes(candidate.country)
        case "min_gpa":
          return profile.gpa >= filter.value
        case "budget":
          return profile.budget >= filter.min && profile.budget <= filter.max
        case "program_level":
          return filter.values.includes(candidate.level)
        default:
          return true
      }
    })
  })
}

async function scoreCandidates(candidates: any[], profile: any, rules: any[], weights: any) {
  return candidates.map(candidate => {
    let score = 0
    const reasons = []

    // Apply matching rules
    for (const rule of rules) {
      const ruleScore = applyRule(candidate, profile, rule)
      if (ruleScore > 0) {
        score += ruleScore * (weights[rule.type] || 1)
        reasons.push(rule.reason)
      }
    }

    // Normalize score
    score = Math.min(score, 1)

    return {
      item: candidate,
      score,
      reasons
    }
  })
}

function applyRule(candidate: any, profile: any, rule: any) {
  switch (rule.type) {
    case "gpa_match":
      const gpaDiff = Math.abs(profile.gpa - candidate.minGPA || 0)
      return gpaDiff <= 0.5 ? 1 : Math.max(0, 1 - gpaDiff)
    
    case "country_preference":
      return profile.preferredCountries?.includes(candidate.country) ? 1 : 0
    
    case "budget_fit":
      if (!profile.budget || !candidate.estimatedCost) return 0
      const budgetRatio = profile.budget / candidate.estimatedCost
      return budgetRatio >= 0.8 && budgetRatio <= 1.2 ? 1 : 0
    
    case "ranking_preference":
      const maxRanking = profile.maxRanking || 1000
      return candidate.worldRanking <= maxRanking ? 1 : 0
    
    case "program_match":
      return profile.preferredPrograms?.some((pref: string) => 
        candidate.programName?.toLowerCase().includes(pref.toLowerCase())
      ) ? 1 : 0
    
    default:
      return 0
  }
}

function calculateSuccessRate(applications: any[]) {
  if (applications.length === 0) return 0
  const successful = applications.filter(app => app.status === "ACCEPTED").length
  return successful / applications.length
}