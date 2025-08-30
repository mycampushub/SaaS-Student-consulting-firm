import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const signupSchema = z.object({
  agencyName: z.string().min(2, 'Agency name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  subdomain: z.string().min(3, 'Subdomain must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
  adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
  phone: z.string().optional(),
  country: z.string().min(2, 'Country is required')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Check if subdomain is already taken
    const existingAgency = await db.agency.findUnique({
      where: { subdomain: validatedData.subdomain }
    })

    if (existingAgency) {
      return NextResponse.json(
        { error: 'Subdomain is already taken' },
        { status: 400 }
      )
    }

    // Check if email is already registered
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Create agency
    const agency = await db.agency.create({
      data: {
        name: validatedData.agencyName,
        subdomain: validatedData.subdomain,
        status: 'PENDING',
        plan: 'FREE'
      }
    })

    // Create brand settings
    await db.brandSettings.create({
      data: {
        agencyId: agency.id
      }
    })

    // Create billing record
    await db.billing.create({
      data: {
        agencyId: agency.id,
        plan: 'FREE'
      }
    })

    // Create admin user
    const adminUser = await db.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.adminName,
        password: hashedPassword,
        role: 'AGENCY_ADMIN',
        status: 'ACTIVE',
        agencyId: agency.id,
        phone: validatedData.phone,
        emailVerified: false
      }
    })

    // Log activity
    await db.activityLog.create({
      data: {
        agencyId: agency.id,
        userId: adminUser.id,
        action: 'AGENCY_CREATED',
        entityType: 'Agency',
        entityId: agency.id,
        changes: JSON.stringify({
          agencyName: validatedData.agencyName,
          subdomain: validatedData.subdomain,
          adminEmail: validatedData.email
        }),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Agency created successfully',
      agency: {
        id: agency.id,
        name: agency.name,
        subdomain: agency.subdomain,
        status: agency.status
      },
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role
      }
    })

  } catch (error) {
    console.error('Signup error:', error)
    
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