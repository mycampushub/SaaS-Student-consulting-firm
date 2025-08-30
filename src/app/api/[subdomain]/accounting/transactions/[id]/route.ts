import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const updateTransactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "REFUND", "TRANSFER"]).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
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

    const transaction = await db.transaction.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      },
      include: {
        invoice: true,
        student: true
      }
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error fetching transaction:", error)
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
    const validatedData = updateTransactionSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Check if transaction exists and belongs to agency
    const existingTransaction = await db.transaction.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!existingTransaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const transaction = await db.transaction.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        invoice: true,
        student: true
      }
    })

    // Update accounting metrics
    if (agency.accounting) {
      await updateAccountingMetrics(agency.accounting.id)
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error updating transaction:", error)
    
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

    // Check if transaction exists and belongs to agency
    const transaction = await db.transaction.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    await db.transaction.delete({
      where: { id: params.id }
    })

    // Update accounting metrics
    if (agency.accounting) {
      await updateAccountingMetrics(agency.accounting.id)
    }

    return NextResponse.json({ message: "Transaction deleted successfully" })
  } catch (error) {
    console.error("Error deleting transaction:", error)
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