import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const updateInvoiceSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"]).optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  paidDate: z.string().optional(),
  items: z.array(z.any()).optional(),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
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

    const invoice = await db.invoice.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      },
      include: {
        student: true,
        transactions: {
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Parse JSON fields for response
    const processedInvoice = {
      ...invoice,
      items: invoice.items ? JSON.parse(invoice.items) : []
    }

    return NextResponse.json(processedInvoice)
  } catch (error) {
    console.error("Error fetching invoice:", error)
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
    const validatedData = updateInvoiceSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if invoice exists and belongs to agency
    const existingInvoice = await db.invoice.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const updateData: any = { ...validatedData }

    // Handle date conversions
    if (validatedData.issueDate) {
      updateData.issueDate = new Date(validatedData.issueDate)
    }
    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate)
    }
    if (validatedData.paidDate) {
      updateData.paidDate = new Date(validatedData.paidDate)
    }

    // Handle JSON field updates
    if (validatedData.items) {
      updateData.items = JSON.stringify(validatedData.items)
    }

    const invoice = await db.invoice.update({
      where: { id: params.id },
      data: updateData,
      include: {
        student: true,
        transactions: {
          orderBy: { createdAt: "desc" }
        }
      }
    })

    // Parse JSON fields for response
    const processedInvoice = {
      ...invoice,
      items: invoice.items ? JSON.parse(invoice.items) : []
    }

    return NextResponse.json(processedInvoice)
  } catch (error) {
    console.error("Error updating invoice:", error)
    
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

    // Check if invoice exists and belongs to agency
    const invoice = await db.invoice.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    await db.invoice.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Invoice deleted successfully" })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}