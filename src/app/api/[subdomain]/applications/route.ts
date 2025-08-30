import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const applicationSchema = z.object({
  studentId: z.string(),
  universityId: z.string(),
  program: z.string().min(1, "Program is required"),
  intake: z.string().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "WITHDRAWN"]).optional(),
  assignedTo: z.string().optional(),
  documents: z.array(z.any()).optional(),
  payments: z.array(z.any()).optional(),
  communications: z.array(z.any()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const studentId = searchParams.get("studentId")
    const universityId = searchParams.get("universityId")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where = {
      agencyId: agency.id,
      ...(search && {
        OR: [
          { program: { contains: search, mode: "insensitive" as const } },
          { intake: { contains: search, mode: "insensitive" as const } },
          { student: { firstName: { contains: search, mode: "insensitive" as const } } },
          { student: { lastName: { contains: search, mode: "insensitive" as const } } },
          { university: { name: { contains: search, mode: "insensitive" as const } } }
        ]
      }),
      ...(status && { status: status }),
      ...(studentId && { studentId: studentId }),
      ...(universityId && { universityId: universityId })
    }

    const [applications, total] = await Promise.all([
      db.application.findMany({
        where,
        include: {
          student: true,
          university: true
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.application.count({ where })
    ])

    // Parse JSON fields
    const processedApplications = applications.map(application => ({
      ...application,
      documents: application.documents ? JSON.parse(application.documents) : [],
      payments: application.payments ? JSON.parse(application.payments) : [],
      communications: application.communications ? JSON.parse(application.communications) : []
    }))

    return NextResponse.json({
      applications: processedApplications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching applications:", error)
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
    const validatedData = applicationSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Validate student exists and belongs to agency
    const student = await db.student.findFirst({
      where: {
        id: validatedData.studentId,
        agencyId: agency.id
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Validate university exists and belongs to agency
    const university = await db.university.findFirst({
      where: {
        id: validatedData.universityId,
        agencyId: agency.id
      }
    })

    if (!university) {
      return NextResponse.json({ error: "University not found" }, { status: 404 })
    }

    const application = await db.application.create({
      data: {
        agencyId: agency.id,
        studentId: validatedData.studentId,
        universityId: validatedData.universityId,
        program: validatedData.program,
        intake: validatedData.intake,
        status: validatedData.status || "DRAFT",
        assignedTo: validatedData.assignedTo,
        documents: JSON.stringify(validatedData.documents || []),
        payments: JSON.stringify(validatedData.payments || []),
        communications: JSON.stringify(validatedData.communications || [])
      },
      include: {
        student: true,
        university: true
      }
    })

    // Parse JSON fields for response
    const processedApplication = {
      ...application,
      documents: application.documents ? JSON.parse(application.documents) : [],
      payments: application.payments ? JSON.parse(application.payments) : [],
      communications: application.communications ? JSON.parse(application.communications) : []
    }

    return NextResponse.json(processedApplication)
  } catch (error) {
    console.error("Error creating application:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}