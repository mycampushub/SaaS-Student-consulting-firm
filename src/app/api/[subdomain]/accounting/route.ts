import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        accounting: true,
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 10
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20
        }
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    return NextResponse.json(agency)
  } catch (error) {
    console.error("Error fetching accounting data:", error)
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
    const { currency, timezone } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const accounting = await db.accounting.upsert({
      where: { agencyId: agency.id },
      update: { currency, timezone },
      create: {
        agencyId: agency.id,
        currency: currency || "USD",
        timezone: timezone || "UTC"
      }
    })

    return NextResponse.json(accounting)
  } catch (error) {
    console.error("Error creating/updating accounting:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}