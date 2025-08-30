import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const knowledgeArticleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().optional(),
  type: z.enum([
    "UNIVERSITY_GUIDE", "VISA_GUIDE", "PROGRAM_REQUIREMENTS", "ADMISSION_PROCESS",
    "SCHOLARSHIP_INFO", "ACCOMMODATION_GUIDE", "HEALTH_INSURANCE", "CULTURAL_GUIDE",
    "GENERAL_INFO", "CUSTOM"
  ]),
  category: z.enum(["GENERAL", "ADMISSIONS", "VISA", "ACADEMIC", "FINANCIAL", "ACCOMMODATION", "HEALTH", "LEGAL", "CUSTOM"]).optional(),
  tags: z.array(z.string()).optional(),
  targetCountries: z.array(z.string()).optional(),
  targetUniversities: z.array(z.string()).optional(),
  targetPrograms: z.array(z.string()).optional(),
  visaTypes: z.array(z.string()).optional(),
  requirements: z.array(z.any()).optional(),
  deadlines: z.array(z.any()).optional(),
  documents: z.array(z.string()).optional(),
  tests: z.array(z.any()).optional(),
  minGPA: z.number().min(0).max(4).optional(),
  fees: z.array(z.any()).optional(),
  sourceLinks: z.array(z.string()).optional(),
  author: z.string().optional(),
  reviewer: z.string().optional(),
  lastReviewedAt: z.string().optional(),
  nextReviewDate: z.string().optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isDeprecated: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const category = searchParams.get("category")
    const country = searchParams.get("country")
    const university = searchParams.get("university")
    const visaType = searchParams.get("visaType")
    const isPublished = searchParams.get("published")
    const isFeatured = searchParams.get("featured")
    const search = searchParams.get("search")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

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

    const where: any = { agencyId: agency.id }
    
    if (type) where.type = type
    if (category) where.category = category
    if (isPublished !== null) where.isPublished = isPublished === "true"
    if (isFeatured !== null) where.isFeatured = isFeatured === "true"
    
    // Handle filtering by JSON fields
    if (country) {
      where.targetCountries = {
        path: '$',
        array_contains: [country]
      }
    }
    
    if (university) {
      where.targetUniversities = {
        path: '$',
        array_contains: [university]
      }
    }
    
    if (visaType) {
      where.visaTypes = {
        path: '$',
        array_contains: [visaType]
      }
    }
    
    // Handle search
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } }
      ]
    }

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
        take: limit,
        skip: offset
      }),
      db.knowledgeArticle.count({ where })
    ])

    // Parse JSON fields
    const processedArticles = articles.map(article => ({
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
      sourceLinks: article.sourceLinks ? JSON.parse(article.sourceLinks) : []
    }))

    return NextResponse.json({
      articles: processedArticles,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error("Error fetching knowledge articles:", error)
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
    const validatedData = knowledgeArticleSchema.parse(body)

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

    // Check if slug is unique
    const existingArticle = await db.knowledgeArticle.findFirst({
      where: {
        agencyId: agency.id,
        slug: validatedData.slug
      }
    })

    if (existingArticle) {
      return NextResponse.json({ 
        error: "Article with this slug already exists" 
      }, { status: 400 })
    }

    // Create article
    const article = await db.knowledgeArticle.create({
      data: {
        agencyId: agency.id,
        title: validatedData.title,
        slug: validatedData.slug,
        description: validatedData.description,
        content: validatedData.content,
        excerpt: validatedData.excerpt,
        type: validatedData.type,
        category: validatedData.category || "GENERAL",
        tags: validatedData.tags ? JSON.stringify(validatedData.tags) : null,
        targetCountries: validatedData.targetCountries ? JSON.stringify(validatedData.targetCountries) : null,
        targetUniversities: validatedData.targetUniversities ? JSON.stringify(validatedData.targetUniversities) : null,
        targetPrograms: validatedData.targetPrograms ? JSON.stringify(validatedData.targetPrograms) : null,
        visaTypes: validatedData.visaTypes ? JSON.stringify(validatedData.visaTypes) : null,
        requirements: validatedData.requirements ? JSON.stringify(validatedData.requirements) : null,
        deadlines: validatedData.deadlines ? JSON.stringify(validatedData.deadlines) : null,
        documents: validatedData.documents ? JSON.stringify(validatedData.documents) : null,
        tests: validatedData.tests ? JSON.stringify(validatedData.tests) : null,
        minGPA: validatedData.minGPA,
        fees: validatedData.fees ? JSON.stringify(validatedData.fees) : null,
        sourceLinks: validatedData.sourceLinks ? JSON.stringify(validatedData.sourceLinks) : null,
        author: validatedData.author,
        reviewer: validatedData.reviewer,
        lastReviewedAt: validatedData.lastReviewedAt ? new Date(validatedData.lastReviewedAt) : null,
        nextReviewDate: validatedData.nextReviewDate ? new Date(validatedData.nextReviewDate) : null,
        isPublished: validatedData.isPublished ?? false,
        isFeatured: validatedData.isFeatured ?? false,
        isDeprecated: validatedData.isDeprecated ?? false,
        metaTitle: validatedData.metaTitle,
        metaDescription: validatedData.metaDescription,
        metaKeywords: validatedData.metaKeywords
      }
    })

    // Create initial version
    await db.knowledgeVersion.create({
      data: {
        agencyId: agency.id,
        articleId: article.id,
        versionNumber: 1,
        title: validatedData.title,
        content: validatedData.content,
        reviewStatus: "APPROVED"
      }
    })

    // Parse JSON fields for response
    const processedArticle = {
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
      sourceLinks: article.sourceLinks ? JSON.parse(article.sourceLinks) : []
    }

    return NextResponse.json(processedArticle)
  } catch (error) {
    console.error("Error creating knowledge article:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}