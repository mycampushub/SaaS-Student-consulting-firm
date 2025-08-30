import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where = {
      agencyId: agency.id,
      ...(status && { status: status })
    }

    const [forms, total] = await Promise.all([
      db.form.findMany({
        where,
        include: {
          submissions: {
            take: 5,
            orderBy: { createdAt: "desc" }
          },
          landingPages: true
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.form.count({ where })
    ])

    return NextResponse.json({
      forms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching forms:", error)
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
    const {
      name,
      description,
      fields,
      submitButton,
      successMessage,
      redirectUrl,
      facebookLeadId,
      googleLeadId,
      webhookUrl
    } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const form = await db.form.create({
      data: {
        agencyId: agency.id,
        name,
        description,
        fields: JSON.stringify(fields),
        submitButton: submitButton || "Submit",
        successMessage: successMessage || "Thank you for your submission!",
        redirectUrl,
        facebookLeadId,
        googleLeadId,
        webhookUrl
      },
      include: {
        submissions: true,
        landingPages: true
      }
    })

    return NextResponse.json(form)
  } catch (error) {
    console.error("Error creating form:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}