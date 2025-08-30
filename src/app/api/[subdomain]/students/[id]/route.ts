import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const updateStudentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const student = await db.student.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      },
      include: {
        applications: {
          include: {
            university: true
          },
          orderBy: { createdAt: "desc" }
        },
        invoices: {
          orderBy: { createdAt: "desc" }
        },
        transactions: {
          orderBy: { createdAt: "desc" }
        },
        leads: {
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

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
    console.error("Error fetching student:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateStudentSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if student exists and belongs to agency
    const existingStudent = await db.student.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!existingStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check if email is being changed and already exists
    if (validatedData.email && validatedData.email !== existingStudent.email) {
      const emailExists = await db.student.findFirst({
        where: {
          agencyId: agency.id,
          email: validatedData.email,
          id: { not: params.id }
        }
      })

      if (emailExists) {
        return NextResponse.json({ error: "Student with this email already exists" }, { status: 400 })
      }
    }

    const updateData: any = { ...validatedData }

    // Handle date conversion
    if (validatedData.dateOfBirth) {
      updateData.dateOfBirth = new Date(validatedData.dateOfBirth)
    }

    // Handle JSON field updates
    if (validatedData.preferredCountries) {
      updateData.preferredCountries = JSON.stringify(validatedData.preferredCountries)
    }

    if (validatedData.preferredCourses) {
      updateData.preferredCourses = JSON.stringify(validatedData.preferredCourses)
    }

    const student = await db.student.update({
      where: { id: params.id },
      data: updateData,
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
    console.error("Error updating student:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if student exists and belongs to agency
    const student = await db.student.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    await db.student.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Student deleted successfully" })
  } catch (error) {
    console.error("Error deleting student:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}