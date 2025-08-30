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

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          student: true
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.invoice.count({ where })
    ])

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching invoices:", error)
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
      studentId,
      amount,
      currency,
      issueDate,
      dueDate,
      items,
      paymentMethod
    } = body

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: { accounting: true }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    if (!agency.accounting) {
      return NextResponse.json({ error: "Accounting module not initialized" }, { status: 400 })
    }

    // Generate invoice number
    const invoiceCount = await db.invoice.count({
      where: { agencyId: agency.id }
    })
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`

    const invoice = await db.invoice.create({
      data: {
        agencyId: agency.id,
        accountingId: agency.accounting.id,
        invoiceNumber,
        studentId,
        amount,
        currency: currency || "USD",
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        items: JSON.stringify(items || []),
        paymentMethod
      },
      include: {
        student: true
      }
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}