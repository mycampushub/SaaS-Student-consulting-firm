import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const subscriptionSchema = z.object({
  plan: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  currentPeriodStart: z.string().optional(),
  currentPeriodEnd: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        billing: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    if (!agency.billing) {
      // Create default billing record
      const billing = await db.billing.create({
        data: {
          agencyId: agency.id,
          plan: agency.plan,
          studentCount: 0,
          userCount: 1, // At least the admin
          storageUsed: 0
        }
      })

      return NextResponse.json({
        subscription: {
          plan: billing.plan,
          status: "ACTIVE",
          currentPeriodStart: billing.currentPeriodStart,
          currentPeriodEnd: billing.currentPeriodEnd,
          stripeSubscriptionId: billing.stripeSubscriptionId
        },
        billing
      })
    }

    return NextResponse.json({
      subscription: {
        plan: agency.billing.plan,
        status: "ACTIVE",
        currentPeriodStart: agency.billing.currentPeriodStart,
        currentPeriodEnd: agency.billing.currentPeriodEnd,
        stripeSubscriptionId: agency.billing.stripeSubscriptionId
      },
      billing: agency.billing
    })
  } catch (error) {
    console.error("Error fetching subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = subscriptionSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const updateData: any = {
      plan: validatedData.plan,
      stripeCustomerId: validatedData.stripeCustomerId,
      stripeSubscriptionId: validatedData.stripeSubscriptionId
    }

    // Handle date conversions
    if (validatedData.currentPeriodStart) {
      updateData.currentPeriodStart = new Date(validatedData.currentPeriodStart)
    }
    if (validatedData.currentPeriodEnd) {
      updateData.currentPeriodEnd = new Date(validatedData.currentPeriodEnd)
    }

    const billing = await db.billing.upsert({
      where: { agencyId: agency.id },
      update: updateData,
      create: {
        agencyId: agency.id,
        plan: validatedData.plan,
        stripeCustomerId: validatedData.stripeCustomerId,
        stripeSubscriptionId: validatedData.stripeSubscriptionId,
        currentPeriodStart: validatedData.currentPeriodStart ? new Date(validatedData.currentPeriodStart) : new Date(),
        currentPeriodEnd: validatedData.currentPeriodEnd ? new Date(validatedData.currentPeriodEnd) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        studentCount: 0,
        userCount: 1,
        storageUsed: 0
      }
    })

    // Update agency plan as well
    await db.agency.update({
      where: { id: agency.id },
      data: { plan: validatedData.plan }
    })

    return NextResponse.json({
      subscription: {
        plan: billing.plan,
        status: "ACTIVE",
        currentPeriodStart: billing.currentPeriodStart,
        currentPeriodEnd: billing.currentPeriodEnd,
        stripeSubscriptionId: billing.stripeSubscriptionId
      },
      billing
    })
  } catch (error) {
    console.error("Error updating subscription:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}