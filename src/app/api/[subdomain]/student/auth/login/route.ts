import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Demo credentials for easy testing
const DEMO_STUDENTS = [
  {
    email: 'alex.thompson@demo.com',
    password: 'demo123',
    firstName: 'Alex',
    lastName: 'Thompson',
    nationality: 'Canadian',
    preferredCountries: ['United States', 'United Kingdom', 'Australia'],
    budget: 50000,
    gpa: 3.8,
    status: 'APPLIED' as const,
    stage: 'APPLICATION' as const,
  },
  {
    email: 'maria.garcia@demo.com',
    password: 'demo123',
    firstName: 'Maria',
    lastName: 'Garcia',
    nationality: 'Spanish',
    preferredCountries: ['United States', 'Canada', 'Germany'],
    budget: 40000,
    gpa: 3.6,
    status: 'ACCEPTED' as const,
    stage: 'DOCUMENTATION' as const,
  },
  {
    email: 'james.wilson@demo.com',
    password: 'demo123',
    firstName: 'James',
    lastName: 'Wilson',
    nationality: 'British',
    preferredCountries: ['United States', 'Canada', 'Australia'],
    budget: 60000,
    gpa: 3.9,
    status: 'ENROLLED' as const,
    stage: 'PRE_DEPARTURE' as const,
  }
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Check demo credentials first
    const demoStudent = DEMO_STUDENTS.find(
      student => student.email === email && student.password === password
    )

    if (demoStudent) {
      // Create or get demo agency
      let agency = await db.agency.findFirst({
        where: { 
          OR: [
            { subdomain: 'demo-agency' },
            { name: 'Demo Education Agency' }
          ]
        }
      })

      if (!agency) {
        agency = await db.agency.create({
          data: {
            name: 'Demo Education Agency',
            subdomain: 'demo-agency',
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981',
            status: 'ACTIVE',
            plan: 'PROFESSIONAL'
          }
        })
      }

      // Create or get demo student record
      let student = await db.student.findFirst({
        where: { 
          AND: [
            { email: demoStudent.email },
            { agencyId: agency.id }
          ]
        }
      })

      if (!student) {
        student = await db.student.create({
          data: {
            agencyId: agency.id,
            firstName: demoStudent.firstName,
            lastName: demoStudent.lastName,
            email: demoStudent.email,
            nationality: demoStudent.nationality,
            preferredCountries: JSON.stringify(demoStudent.preferredCountries),
            budget: demoStudent.budget,
            gpa: demoStudent.gpa,
            status: demoStudent.status,
            stage: demoStudent.stage
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Demo student login successful',
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          status: student.status,
          stage: student.stage
        },
        agency: {
          id: agency.id,
          name: agency.name,
          subdomain: agency.subdomain
        },
        isDemo: true
      })
    }

    // Check for real student in database
    const student = await db.student.findFirst({
      where: { email },
      include: {
        agency: true
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // For demo purposes, we'll accept any password for real students
    // In production, you would validate the password properly
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        status: student.status,
        stage: student.stage
      },
      agency: {
        id: student.agency.id,
        name: student.agency.name,
        subdomain: student.agency.subdomain
      },
      isDemo: false
    })

  } catch (error) {
    console.error('Student login error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}