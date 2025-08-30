import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const studentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  passportNumber: z.string().optional(),
  status: z.enum(["PROSPECT", "APPLIED", "ACCEPTED", "ENROLLED", "GRADUATED", "WITHDRAWN"]).optional(),
  stage: z.enum(["INQUIRY", "CONSULTATION", "APPLICATION", "DOCUMENTATION", "VISA_PROCESSING", "PRE_DEPARTURE", "POST_ARRIVAL"]).optional(),
  currentEducation: z.string().optional(),
  gpa: z.number().min(0).max(4).optional(),
  testScores: z.string().optional(),
  preferredCountries: z.array(z.string()).optional(),
  preferredCourses: z.array(z.string()).optional(),
  budget: z.number().min(0).optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
})

const updateStudentSchema = studentSchema.partial()

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
    const stage = searchParams.get("stage")
    const assignedTo = searchParams.get("assignedTo")

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
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } }
        ]
      }),
      ...(status && { status: status }),
      ...(stage && { stage: stage }),
      ...(assignedTo && { assignedTo: assignedTo })
    }

    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        include: {
          applications: {
            include: {
              university: true
            },
            orderBy: { createdAt: "desc" }
          },
          invoices: {
            orderBy: { createdAt: "desc" },
            take: 5
          },
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 5
          },
          leads: {
            orderBy: { createdAt: "desc" },
            take: 3
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.student.count({ where })
    ])

    // Parse JSON fields
    const processedStudents = students.map(student => ({
      ...student,
      preferredCountries: student.preferredCountries ? JSON.parse(student.preferredCountries) : [],
      preferredCourses: student.preferredCourses ? JSON.parse(student.preferredCourses) : [],
      testScores: student.testScores ? JSON.parse(student.testScores) : null,
      documents: student.documents ? JSON.parse(student.documents) : []
    }))

    return NextResponse.json({
      students: processedStudents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching students:", error)
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
    const validatedData = studentSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if email already exists
    const existingStudent = await db.student.findFirst({
      where: {
        agencyId: agency.id,
        email: validatedData.email
      }
    })

    if (existingStudent) {
      return NextResponse.json({ error: "Student with this email already exists" }, { status: 400 })
    }

    const student = await db.student.create({
      data: {
        agencyId: agency.id,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
        nationality: validatedData.nationality,
        passportNumber: validatedData.passportNumber,
        status: validatedData.status || "PROSPECT",
        stage: validatedData.stage || "INQUIRY",
        currentEducation: validatedData.currentEducation,
        gpa: validatedData.gpa,
        testScores: validatedData.testScores,
        preferredCountries: validatedData.preferredCountries ? JSON.stringify(validatedData.preferredCountries) : null,
        preferredCourses: validatedData.preferredCourses ? JSON.stringify(validatedData.preferredCourses) : null,
        budget: validatedData.budget,
        assignedTo: validatedData.assignedTo,
        documents: JSON.stringify([]) // Initialize empty documents array
      },
      include: {
        applications: {
          include: {
            university: true
          }
        },
        invoices: true,
        transactions: true,
        leads: true
      }
    })

    // Parse JSON fields for response
    const processedStudent = {
      ...student,
      preferredCountries: student.preferredCountries ? JSON.parse(student.preferredCountries) : [],
      preferredCourses: student.preferredCourses ? JSON.parse(student.preferredCourses) : [],
      testScores: student.testScores ? JSON.parse(student.testScores) : null,
      documents: student.documents ? JSON.parse(student.documents) : []
    }

    return NextResponse.json(processedStudent)
  } catch (error) {
    console.error("Error creating student:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}