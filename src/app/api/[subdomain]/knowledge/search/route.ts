import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const searchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  type: z.enum([
    "UNIVERSITY_GUIDE", "VISA_GUIDE", "PROGRAM_REQUIREMENTS", "ADMISSION_PROCESS",
    "SCHOLARSHIP_INFO", "ACCOMMODATION_GUIDE", "HEALTH_INSURANCE", "CULTURAL_GUIDE",
    "GENERAL_INFO", "CUSTOM"
  ]).optional(),
  category: z.enum(["GENERAL", "ADMISSIONS", "VISA", "ACADEMIC", "FINANCIAL", "ACCOMMODATION", "HEALTH", "LEGAL", "CUSTOM"]).optional(),
  country: z.string().optional(),
  university: z.string().optional(),
  visaType: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
})

export async function POST(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = searchSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        featureSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if knowledge base is enabled
    if (!agency.featureSettings?.knowledgeBaseEnabled) {
      return NextResponse.json({ 
        error: "Knowledge base is not enabled for this agency" 
      }, { status: 403 })
    }

    const startTime = Date.now()

    // Build search conditions
    const where: any = {
      agencyId: agency.id,
      isPublished: true,
      isDeprecated: false
    }

    // Add filters
    if (validatedData.type) where.type = validatedData.type
    if (validatedData.category) where.category = validatedData.category

    // Handle JSON field filters
    if (validatedData.country) {
      where.targetCountries = {
        path: '$',
        array_contains: [validatedData.country]
      }
    }

    if (validatedData.university) {
      where.targetUniversities = {
        path: '$',
        array_contains: [validatedData.university]
      }
    }

    if (validatedData.visaType) {
      where.visaTypes = {
        path: '$',
        array_contains: [validatedData.visaType]
      }
    }

    // Create search conditions
    const searchConditions = []
    const searchTerms = validatedData.query.toLowerCase().split(' ')

    // Add full-text search conditions
    for (const term of searchTerms) {
      searchConditions.push(
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
        { excerpt: { contains: term, mode: 'insensitive' } }
      )
    }

    // Add synonym search (basic implementation)
    const synonyms = getSynonyms(validatedData.query)
    for (const synonym of synonyms) {
      searchConditions.push(
        { title: { contains: synonym, mode: 'insensitive' } },
        { description: { contains: synonym, mode: 'insensitive' } },
        { content: { contains: synonym, mode: 'insensitive' } }
      )
    }

    where.OR = searchConditions

    // Execute search
    const [articles, total] = await Promise.all([
      db.knowledgeArticle.findMany({
        where,
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1
          }
        },
        orderBy: [
          { isFeatured: 'desc' },
          { viewCount: 'desc' },
          { createdAt: 'desc' }
        ],
        take: validatedData.limit,
        skip: validatedData.offset
      }),
      db.knowledgeArticle.count({ where })
    ])

    const searchDuration = Date.now() - startTime

    // Log search analytics
    try {
      await db.knowledgeSearch.create({
        data: {
          agencyId: agency.id,
          query: validatedData.query,
          resultsCount: total,
          searchDuration,
          hasResults: total > 0
        }
      })
    } catch (error) {
      console.error("Error logging search analytics:", error)
    }

    // Parse JSON fields and calculate relevance scores
    const processedArticles = articles.map(article => {
      const relevanceScore = calculateRelevanceScore(article, validatedData.query, searchTerms)
      
      return {
        ...article,
        tags: article.tags ? JSON.parse(article.tags) : [],
        targetCountries: article.targetCountries ? JSON.parse(article.targetCountries) : [],
        targetUniversities: article.targetUniversities ? JSON.parse(article.targetUniversities) : [],
        targetPrograms: article.targetPrograms ? JSON.parse(article.targetPrograms) : [],
        visaTypes: article.visaTypes ? JSON.parse(article.visaTypes) : [],
        requirements: article.requirements ? JSON.parse(article.requirements) : [],
        deadlines: article.deadlines ? JSON.parse(article.deadlines) : [],
        documents: article.documents ? JSON.parse(article.documents) : [],
        tests: article.tests ? JSON.parse(article.tests) : [],
        fees: article.fees ? JSON.parse(article.fees) : [],
        sourceLinks: article.sourceLinks ? JSON.parse(article.sourceLinks) : [],
        relevanceScore
      }
    })

    // Sort by relevance score
    processedArticles.sort((a, b) => b.relevanceScore - a.relevanceScore)

    return NextResponse.json({
      query: validatedData.query,
      articles: processedArticles,
      pagination: {
        total,
        limit: validatedData.limit,
        offset: validatedData.offset,
        hasMore: validatedData.offset + validatedData.limit < total
      },
      searchDuration,
      suggestions: total === 0 ? getSearchSuggestions(validatedData.query) : []
    })
  } catch (error) {
    console.error("Error searching knowledge base:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper functions
function getSynonyms(query: string): string[] {
  const synonymMap: Record<string, string[]> = {
    "i-20": ["admission form", "certificate of eligibility", "sevis"],
    "visa": ["permit", "authorization", "entry document"],
    "university": ["college", "institute", "school", "academy"],
    "application": ["submission", "enrollment", "registration"],
    "scholarship": ["grant", "funding", "financial aid", "bursary"],
    "accommodation": ["housing", "lodging", "residence", "dormitory"],
    "gpa": ["grade point average", "academic score", "grades"],
    "toefl": ["english test", "language proficiency", "ielts"],
    "gre": ["graduate test", "aptitude test", "exam"],
    "transcript": ["academic record", "grade report", "marks"],
    "recommendation": ["reference", "endorsement", "letter"]
  }

  const synonyms: string[] = []
  const lowerQuery = query.toLowerCase()

  for (const [key, values] of Object.entries(synonymMap)) {
    if (lowerQuery.includes(key)) {
      synonyms.push(...values)
    }
  }

  return [...new Set(synonyms)]
}

function calculateRelevanceScore(article: any, query: string, searchTerms: string[]): number {
  let score = 0
  const lowerQuery = query.toLowerCase()
  const lowerTitle = article.title.toLowerCase()
  const lowerDescription = (article.description || '').toLowerCase()
  const lowerContent = article.content.toLowerCase()
  const lowerExcerpt = (article.excerpt || '').toLowerCase()

  // Title matches (highest weight)
  if (lowerTitle.includes(lowerQuery)) score += 10
  searchTerms.forEach(term => {
    if (lowerTitle.includes(term)) score += 5
  })

  // Description matches (medium weight)
  if (lowerDescription.includes(lowerQuery)) score += 5
  searchTerms.forEach(term => {
    if (lowerDescription.includes(term)) score += 3
  })

  // Content matches (lower weight)
  if (lowerContent.includes(lowerQuery)) score += 2
  searchTerms.forEach(term => {
    if (lowerContent.includes(term)) score += 1
  })

  // Excerpt matches
  if (lowerExcerpt.includes(lowerQuery)) score += 3
  searchTerms.forEach(term => {
    if (lowerExcerpt.includes(term)) score += 2
  })

  // Featured articles boost
  if (article.isFeatured) score += 2

  // View count boost (popular articles)
  score += Math.log(article.viewCount + 1) * 0.1

  return Math.round(score * 100) / 100
}

function getSearchSuggestions(query: string): string[] {
  const suggestions = [
    "Try different keywords",
    "Check your spelling",
    "Use more general terms",
    "Browse by category",
    "Contact support for help"
  ]

  const lowerQuery = query.toLowerCase()
  
  if (lowerQuery.includes("visa")) {
    suggestions.unshift("Try searching for specific visa types like 'student visa' or 'work visa'")
  }
  
  if (lowerQuery.includes("university")) {
    suggestions.unshift("Try searching for specific countries or programs")
  }
  
  if (lowerQuery.includes("scholarship")) {
    suggestions.unshift("Try searching for 'financial aid' or 'funding opportunities'")
  }

  return suggestions
}