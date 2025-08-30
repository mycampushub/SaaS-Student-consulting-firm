import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "REFUND", "TRANSFER"]),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  description: z.string().optional(),
  invoiceId: z.string().optional(),
  studentId: z.string().optional(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "CANCELLED"]).default("COMPLETED"),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const invoiceId = searchParams.get("invoiceId")
    const studentId = searchParams.get("studentId")

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

    const where = {
      agencyId: agency.id,
      accountingId: agency.accounting.id,
      ...(type && { type: type }),
      ...(status && { status: status }),
      ...(invoiceId && { invoiceId: invoiceId }),
      ...(studentId && { studentId: studentId })
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          invoice: true,
          student: true
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.transaction.count({ where })
    ])

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
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
    const validatedData = transactionSchema.parse(body)

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

    // Validate invoiceId if provided
    if (validatedData.invoiceId) {
      const invoice = await db.invoice.findFirst({
        where: {
          id: validatedData.invoiceId,
          agencyId: agency.id
        }
      })

      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }
    }

    // Validate studentId if provided
    if (validatedData.studentId) {
      const student = await db.student.findFirst({
        where: {
          id: validatedData.studentId,
          agencyId: agency.id
        }
      })

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }
    }

    const transaction = await db.transaction.create({
      data: {
        agencyId: agency.id,
        accountingId: agency.accounting.id,
        type: validatedData.type,
        amount: validatedData.amount,
        currency: validatedData.currency,
        description: validatedData.description,
        invoiceId: validatedData.invoiceId,
        studentId: validatedData.studentId,
        status: validatedData.status,
        paymentMethod: validatedData.paymentMethod,
        transactionId: validatedData.transactionId
      },
      include: {
        invoice: true,
        student: true
      }
    })

    // Update accounting metrics
    await updateAccountingMetrics(agency.accounting.id)

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error creating transaction:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to update accounting metrics
async function updateAccountingMetrics(accountingId: string) {
  try {
    const transactions = await db.transaction.findMany({
      where: { accountingId }
    })

    const totalRevenue = transactions
      .filter(t => t.type === "INCOME" && t.status === "COMPLETED")
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = transactions
      .filter(t => t.type === "EXPENSE" && t.status === "COMPLETED")
      .reduce((sum, t) => sum + t.amount, 0)

    const currentMonth = new Date()
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    
    const monthlyRevenue = transactions
      .filter(t => 
        t.type === "INCOME" && 
        t.status === "COMPLETED" && 
        new Date(t.createdAt) >= startOfMonth
      )
      .reduce((sum, t) => sum + t.amount, 0)

    const monthlyExpenses = transactions
      .filter(t => 
        t.type === "EXPENSE" && 
        t.status === "COMPLETED" && 
        new Date(t.createdAt) >= startOfMonth
      )
      .reduce((sum, t) => sum + t.amount, 0)

    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    await db.accounting.update({
      where: { id: accountingId },
      data: {
        totalRevenue,
        totalExpenses,
        monthlyRevenue,
        monthlyExpenses,
        netProfit,
        profitMargin
      }
    })
  } catch (error) {
    console.error("Error updating accounting metrics:", error)
  }
}