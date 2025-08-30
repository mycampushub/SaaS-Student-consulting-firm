import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const paymentSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["STRIPE", "PAYPAL", "BANK_TRANSFER", "CASH"]),
  transactionId: z.string().optional(),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 })
    }

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: { accounting: true }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Get student's invoices
    const invoices = await db.invoice.findMany({
      where: {
        agencyId: agency.id,
        studentId: studentId
      },
      include: {
        transactions: true
      },
      orderBy: { createdAt: "desc" }
    })

    // Get student's transactions
    const transactions = await db.transaction.findMany({
      where: {
        agencyId: agency.id,
        studentId: studentId,
        type: "INCOME"
      },
      orderBy: { createdAt: "desc" }
    })

    // Calculate outstanding balance
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const totalPaid = transactions
      .filter(t => t.status === "COMPLETED")
      .reduce((sum, t) => sum + t.amount, 0)
    const outstandingBalance = totalInvoiced - totalPaid

    return NextResponse.json({
      invoices,
      transactions,
      summary: {
        totalInvoiced,
        totalPaid,
        outstandingBalance,
        currency: agency.accounting?.currency || "USD"
      }
    })
  } catch (error) {
    console.error("Error fetching student payment data:", error)
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
    const validatedData = paymentSchema.parse(body)

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

    // Validate invoice
    const invoice = await db.invoice.findFirst({
      where: {
        id: validatedData.invoiceId,
        agencyId: agency.id
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Check if payment amount exceeds invoice amount
    if (validatedData.amount > invoice.amount) {
      return NextResponse.json({ 
        error: "Payment amount cannot exceed invoice amount" 
      }, { status: 400 })
    }

    // Create transaction record
    const transaction = await db.transaction.create({
      data: {
        agencyId: agency.id,
        accountingId: agency.accounting.id,
        type: "INCOME",
        amount: validatedData.amount,
        currency: invoice.currency,
        description: `Payment for invoice ${invoice.invoiceNumber}`,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        status: "COMPLETED",
        paymentMethod: validatedData.paymentMethod,
        transactionId: validatedData.transactionId
      },
      include: {
        invoice: true,
        student: true
      }
    })

    // Update invoice status if fully paid
    const totalPaid = await db.transaction.aggregate({
      where: {
        invoiceId: invoice.id,
        status: "COMPLETED"
      },
      _sum: {
        amount: true
      }
    })

    const paidAmount = totalPaid._sum.amount || 0
    let invoiceStatus = invoice.status

    if (paidAmount >= invoice.amount) {
      invoiceStatus = "PAID"
    } else if (paidAmount > 0) {
      invoiceStatus = "PARTIALLY_PAID"
    }

    await db.invoice.update({
      where: { id: invoice.id },
      data: { 
        status: invoiceStatus,
        paidDate: invoiceStatus === "PAID" ? new Date() : null
      }
    })

    // Generate receipt
    const receipt = await generateReceipt(transaction, agency)

    // Send payment confirmation notification
    await sendPaymentConfirmation(transaction, agency, receipt)

    return NextResponse.json({
      transaction,
      receipt,
      invoiceStatus
    })
  } catch (error) {
    console.error("Error processing payment:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to generate receipt
async function generateReceipt(transaction: any, agency: any) {
  const receiptNumber = `REC-${String(Date.now()).slice(-6)}`
  
  return {
    receiptNumber,
    transactionId: transaction.id,
    invoiceNumber: transaction.invoice.invoiceNumber,
    amount: transaction.amount,
    currency: transaction.currency,
    paymentMethod: transaction.paymentMethod,
    transactionDate: transaction.createdAt,
    studentName: `${transaction.student.firstName} ${transaction.student.lastName}`,
    agencyName: agency.name,
    status: "COMPLETED"
  }
}

// Helper function to send payment confirmation
async function sendPaymentConfirmation(transaction: any, agency: any, receipt: any) {
  try {
    await db.notification.create({
      data: {
        agencyId: agency.id,
        type: "PAYMENT_CONFIRMATION",
        title: "Payment Confirmation",
        message: `Your payment of ${transaction.amount} ${transaction.currency} for invoice ${transaction.invoice.invoiceNumber} has been received.`,
        recipientType: "STUDENT",
        recipientId: transaction.studentId,
        channel: "EMAIL",
        priority: "MEDIUM",
        status: "PENDING",
        metadata: JSON.stringify({
          transactionId: transaction.id,
          receiptNumber: receipt.receiptNumber,
          amount: transaction.amount,
          invoiceNumber: transaction.invoice.invoiceNumber,
          paymentMethod: transaction.paymentMethod
        })
      }
    })
  } catch (error) {
    console.error("Error sending payment confirmation:", error)
  }
}