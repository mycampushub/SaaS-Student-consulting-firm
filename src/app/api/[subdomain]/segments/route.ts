import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const segmentSchema = z.object({
  name: z.string().min(1, "Segment name is required"),
  description: z.string().optional(),
  type: z.enum(["STATIC", "DYNAMIC"]),
  entityType: z.enum(["STUDENT", "LEAD", "USER"]),
  criteria: z.array(z.any()).optional(),
  memberIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isSystem: z.boolean().optional(),
  refreshInterval: z.number().int().min(0).optional(),
  metadata: z.any().optional()
})

const updateSegmentSchema = segmentSchema.partial()

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
    const entityType = searchParams.get("entityType")
    const isActive = searchParams.get("isActive")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where: any = {
      agencyId: agency.id,
      ...(type && { type: type }),
      ...(entityType && { entityType: entityType }),
      ...(isActive !== null && { isActive: isActive === "true" })
    }

    const [segments, total] = await Promise.all([
      db.segment.findMany({
        where,
        include: {
          segmentMembers: {
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
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true
                }
              }
            },
            orderBy: { joinedAt: "desc" },
            take: 5
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.segment.count({ where })
    ])

    // Parse JSON fields
    const processedSegments = segments.map(segment => ({
      ...segment,
      criteria: segment.criteria ? JSON.parse(segment.criteria) : [],
      memberIds: segment.memberIds ? JSON.parse(segment.memberIds) : [],
      metadata: segment.metadata ? JSON.parse(segment.metadata) : null,
      memberCount: segment.segmentMembers.length
    }))

    return NextResponse.json({
      segments: processedSegments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching segments:", error)
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
    const validatedData = segmentSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Create segment
    const segment = await db.segment.create({
      data: {
        agencyId: agency.id,
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        entityType: validatedData.entityType,
        criteria: validatedData.criteria ? JSON.stringify(validatedData.criteria) : null,
        memberIds: validatedData.memberIds ? JSON.stringify(validatedData.memberIds) : null,
        isActive: validatedData.isActive ?? true,
        isSystem: validatedData.isSystem ?? false,
        refreshInterval: validatedData.refreshInterval || 24, // Default 24 hours
        metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null
      }
    })

    // If segment is static and has member IDs, add members
    if (validatedData.type === "STATIC" && validatedData.memberIds && validatedData.memberIds.length > 0) {
      await addSegmentMembers(segment.id, validatedData.memberIds, validatedData.entityType, agency.id)
    }

    // If segment is dynamic, populate members based on criteria
    if (validatedData.type === "DYNAMIC" && validatedData.criteria && validatedData.criteria.length > 0) {
      await populateDynamicSegment(segment.id, validatedData.criteria, validatedData.entityType, agency.id)
    }

    // Parse JSON fields for response
    const processedSegment = {
      ...segment,
      criteria: segment.criteria ? JSON.parse(segment.criteria) : [],
      memberIds: segment.memberIds ? JSON.parse(segment.memberIds) : [],
      metadata: segment.metadata ? JSON.parse(segment.metadata) : null
    }

    return NextResponse.json(processedSegment)
  } catch (error) {
    console.error("Error creating segment:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to add segment members
async function addSegmentMembers(segmentId: string, memberIds: string[], entityType: string, agencyId: string) {
  for (const memberId of memberIds) {
    // Validate member exists and belongs to agency
    let memberExists = false
    switch (entityType) {
      case "STUDENT":
        memberExists = await db.student.findFirst({
          where: { id: memberId, agencyId: agencyId }
        })
        break
      case "LEAD":
        memberExists = await db.lead.findFirst({
          where: { id: memberId, agencyId: agencyId }
        })
        break
      case "USER":
        memberExists = await db.user.findFirst({
          where: { id: memberId, agencyId: agencyId }
        })
        break
    }

    if (memberExists) {
      await db.segmentMember.create({
        data: {
          agencyId: agencyId,
          segmentId: segmentId,
          studentId: entityType === "STUDENT" ? memberId : null,
          leadId: entityType === "LEAD" ? memberId : null,
          userId: entityType === "USER" ? memberId : null,
          joinedAt: new Date()
        }
      })
    }
  }
}

// Helper function to populate dynamic segment
async function populateDynamicSegment(segmentId: string, criteria: any[], entityType: string, agencyId: string) {
  // Clear existing members
  await db.segmentMember.deleteMany({
    where: {
      segmentId: segmentId,
      agencyId: agencyId
    }
  })

  // Find entities that match criteria
  const matchingEntities = await findEntitiesByCriteria(criteria, entityType, agencyId)

  // Add matching entities as segment members
  for (const entity of matchingEntities) {
    await db.segmentMember.create({
      data: {
        agencyId: agencyId,
        segmentId: segmentId,
        studentId: entityType === "STUDENT" ? entity.id : null,
        leadId: entityType === "LEAD" ? entity.id : null,
        userId: entityType === "USER" ? entity.id : null,
        joinedAt: new Date()
      }
    })
  }
}

// Helper function to find entities by criteria
async function findEntitiesByCriteria(criteria: any[], entityType: string, agencyId: string) {
  let entities: any[] = []

  switch (entityType) {
    case "STUDENT":
      entities = await db.student.findMany({
        where: buildCriteriaWhere(criteria, "STUDENT"),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          nationality: true,
          currentEducation: true,
          gpa: true,
          tags: true,
          createdAt: true,
          updatedAt: true
        }
      })
      break
    case "LEAD":
      entities = await db.lead.findMany({
        where: buildCriteriaWhere(criteria, "LEAD"),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          source: true,
          score: true,
          tags: true,
          createdAt: true,
          updatedAt: true
        }
      })
      break
    case "USER":
      entities = await db.user.findMany({
        where: buildCriteriaWhere(criteria, "USER"),
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          title: true,
          department: true,
          createdAt: true,
          updatedAt: true
        }
      })
      break
  }

  return entities
}

// Helper function to build criteria WHERE clause
function buildCriteriaWhere(criteria: any[], entityType: string): any {
  const where: any = {
    agencyId: { equals: "" } // This will be set by the caller
  }

  for (const criterion of criteria) {
    const { field, operator, value, logic = "AND" } = criterion

    if (!where[logic]) {
      where[logic] = []
    }

    const condition = buildFieldCondition(field, operator, value, entityType)
    if (condition) {
      where[logic].push(condition)
    }
  }

  return where
}

// Helper function to build field condition
function buildFieldCondition(field: string, operator: string, value: any, entityType: string): any {
  const condition: any = {}

  switch (field) {
    case "status":
      condition.status = buildOperatorCondition(operator, value)
      break
    case "nationality":
      if (entityType === "STUDENT") {
        condition.nationality = buildOperatorCondition(operator, value)
      }
      break
    case "currentEducation":
      if (entityType === "STUDENT") {
        condition.currentEducation = buildOperatorCondition(operator, value)
      }
      break
    case "gpa":
      if (entityType === "STUDENT") {
        condition.gpa = buildOperatorCondition(operator, value)
      }
      break
    case "source":
      if (entityType === "LEAD") {
        condition.source = buildOperatorCondition(operator, value)
      }
      break
    case "score":
      if (entityType === "LEAD") {
        condition.score = buildOperatorCondition(operator, value)
      }
      break
    case "role":
      if (entityType === "USER") {
        condition.role = buildOperatorCondition(operator, value)
      }
      break
    case "department":
      if (entityType === "USER") {
        condition.department = buildOperatorCondition(operator, value)
      }
      break
    case "tags":
      condition.tags = buildTagsCondition(operator, value)
      break
    case "createdAt":
      condition.createdAt = buildDateCondition(operator, value)
      break
    case "updatedAt":
      condition.updatedAt = buildDateCondition(operator, value)
      break
  }

  return Object.keys(condition).length > 0 ? condition : null
}

// Helper function to build operator condition
function buildOperatorCondition(operator: string, value: any): any {
  switch (operator) {
    case "equals":
      return { equals: value }
    case "not_equals":
      return { not: value }
    case "contains":
      return { contains: value, mode: "insensitive" }
    case "not_contains":
      return { not: { contains: value, mode: "insensitive" } }
    case "starts_with":
      return { startsWith: value, mode: "insensitive" }
    case "ends_with":
      return { endsWith: value, mode: "insensitive" }
    case "greater_than":
      return { gt: value }
    case "less_than":
      return { lt: value }
    case "greater_equal":
      return { gte: value }
    case "less_equal":
      return { lte: value }
    case "in":
      return { in: Array.isArray(value) ? value : [value] }
    case "not_in":
      return { notIn: Array.isArray(value) ? value : [value] }
    default:
      return { equals: value }
  }
}

// Helper function to build tags condition
function buildTagsCondition(operator: string, value: any): any {
  const tagsArray = Array.isArray(value) ? value : [value]
  
  switch (operator) {
    case "contains":
      return {
        contains: JSON.stringify(tagsArray)
      }
    case "contains_any":
      return {
        contains: JSON.stringify(tagsArray[0]) // Simplified for now
      }
    case "contains_all":
      return {
        contains: JSON.stringify(tagsArray)
      }
    default:
      return {
        contains: JSON.stringify(tagsArray)
      }
  }
}

// Helper function to build date condition
function buildDateCondition(operator: string, value: any): any {
  const dateValue = new Date(value)
  
  switch (operator) {
    case "equals":
      return { equals: dateValue }
    case "after":
      return { gt: dateValue }
    case "before":
      return { lt: dateValue }
    case "on_or_after":
      return { gte: dateValue }
    case "on_or_before":
      return { lte: dateValue }
    case "between":
      if (Array.isArray(value) && value.length === 2) {
        return {
          gte: new Date(value[0]),
          lte: new Date(value[1])
        }
      }
      return { equals: dateValue }
    default:
      return { equals: dateValue }
  }
}