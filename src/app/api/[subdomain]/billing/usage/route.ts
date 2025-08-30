import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"

interface PlanLimits {
  FREE: { students: number; users: number; storage: number }
  STARTER: { students: number; users: number; storage: number }
  PROFESSIONAL: { students: number; users: number; storage: number }
  ENTERPRISE: { students: number; users: number; storage: number }
}

const planLimits: PlanLimits = {
  FREE: { students: 10, users: 3, storage: 1000 }, // 1000 MB = 1GB
  STARTER: { students: 50, users: 5, storage: 5000 }, // 5000 MB = 5GB
  PROFESSIONAL: { students: 200, users: 10, storage: 20000 }, // 20000 MB = 20GB
  ENTERPRISE: { students: -1, users: -1, storage: -1 } // Unlimited
}

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        billing: true,
        _count: {
          select: {
            students: true,
            users: true
          }
        }
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const plan = agency.billing?.plan || agency.plan || "FREE"
    const limits = planLimits[plan]

    // Get actual counts
    const studentCount = agency._count.students
    const userCount = agency._count.users
    const storageUsed = agency.billing?.storageUsed || 0

    const usage = {
      students: {
        used: studentCount,
        limit: limits.students,
        percentage: limits.students === -1 ? 0 : Math.min((studentCount / limits.students) * 100, 100)
      },
      users: {
        used: userCount,
        limit: limits.users,
        percentage: limits.users === -1 ? 0 : Math.min((userCount / limits.users) * 100, 100)
      },
      storage: {
        used: storageUsed,
        limit: limits.storage,
        percentage: limits.storage === -1 ? 0 : Math.min((storageUsed / limits.storage) * 100, 100)
      }
    }

    return NextResponse.json({
      plan,
      usage,
      limits,
      billing: agency.billing
    })
  } catch (error) {
    console.error("Error fetching usage:", error)
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
    const { storageUsed } = body

    if (typeof storageUsed !== 'number' || storageUsed < 0) {
      return NextResponse.json({ error: "Invalid storage value" }, { status: 400 })
    }

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const billing = await db.billing.upsert({
      where: { agencyId: agency.id },
      update: { storageUsed },
      create: {
        agencyId: agency.id,
        plan: agency.plan,
        storageUsed,
        studentCount: 0,
        userCount: 1
      }
    })

    return NextResponse.json({ billing })
  } catch (error) {
    console.error("Error updating usage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}