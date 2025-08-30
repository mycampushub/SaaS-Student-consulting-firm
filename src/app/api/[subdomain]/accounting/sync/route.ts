import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"

export async function POST(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const { dataType, ids, action } = body

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: {
        accounting: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    if (!agency.accounting || !agency.accounting.isConnected) {
      return NextResponse.json({ 
        error: "Accounting software not connected" 
      }, { status: 400 })
    }

    const config = JSON.parse(agency.accounting.accountingConfig || "{}")
    const provider = agency.accounting.accountingProvider

    if (action === "sync") {
      if (dataType === "invoices") {
        return await syncInvoices(agency.id, provider, config, ids)
      } else if (dataType === "transactions") {
        return await syncTransactions(agency.id, provider, config, ids)
      } else {
        return NextResponse.json({ error: "Invalid data type" }, { status: 400 })
      }
    } else if (action === "export") {
      if (dataType === "invoices") {
        return await exportInvoices(agency.id, provider, config, ids)
      } else if (dataType === "transactions") {
        return await exportTransactions(agency.id, provider, config, ids)
      } else {
        return NextResponse.json({ error: "Invalid data type" }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in accounting sync:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function syncInvoices(agencyId: string, provider: string, config: any, invoiceIds?: string[]) {
  try {
    let invoices
    if (invoiceIds && invoiceIds.length > 0) {
      invoices = await db.invoice.findMany({
        where: { 
          agencyId,
          id: { in: invoiceIds }
        }
      })
    } else {
      // Sync all unsynced or recently updated invoices
      invoices = await db.invoice.findMany({
        where: { 
          agencyId,
          OR: [
            { updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            { status: { in: ["PAID", "PARTIALLY_PAID"] } }
          ]
        }
      })
    }

    console.log(`Syncing ${invoices.length} invoices to ${provider}`)

    // Simulate syncing invoices to accounting software
    const syncResults = await Promise.all(
      invoices.map(async (invoice) => {
        try {
          // Simulate API call to accounting software
          await new Promise(resolve => setTimeout(resolve, 500))
          
          return {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            success: true,
            message: "Invoice synced successfully"
          }
        } catch (error) {
          return {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            success: false,
            message: "Failed to sync invoice"
          }
        }
      })
    )

    const successfulSyncs = syncResults.filter(r => r.success)
    const failedSyncs = syncResults.filter(r => !r.success)

    return NextResponse.json({
      success: true,
      message: `Synced ${successfulSyncs.length} invoices successfully`,
      results: syncResults,
      summary: {
        total: invoices.length,
        successful: successfulSyncs.length,
        failed: failedSyncs.length
      }
    })
  } catch (error) {
    console.error("Error syncing invoices:", error)
    return NextResponse.json({ 
      error: "Failed to sync invoices" 
    }, { status: 500 })
  }
}

async function syncTransactions(agencyId: string, provider: string, config: any, transactionIds?: string[]) {
  try {
    let transactions
    if (transactionIds && transactionIds.length > 0) {
      transactions = await db.transaction.findMany({
        where: { 
          agencyId,
          id: { in: transactionIds }
        }
      })
    } else {
      // Sync all recent transactions
      transactions = await db.transaction.findMany({
        where: { 
          agencyId,
          updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      })
    }

    console.log(`Syncing ${transactions.length} transactions to ${provider}`)

    // Simulate syncing transactions to accounting software
    const syncResults = await Promise.all(
      transactions.map(async (transaction) => {
        try {
          // Simulate API call to accounting software
          await new Promise(resolve => setTimeout(resolve, 300))
          
          return {
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            success: true,
            message: "Transaction synced successfully"
          }
        } catch (error) {
          return {
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            success: false,
            message: "Failed to sync transaction"
          }
        }
      })
    )

    const successfulSyncs = syncResults.filter(r => r.success)
    const failedSyncs = syncResults.filter(r => !r.success)

    return NextResponse.json({
      success: true,
      message: `Synced ${successfulSyncs.length} transactions successfully`,
      results: syncResults,
      summary: {
        total: transactions.length,
        successful: successfulSyncs.length,
        failed: failedSyncs.length
      }
    })
  } catch (error) {
    console.error("Error syncing transactions:", error)
    return NextResponse.json({ 
      error: "Failed to sync transactions" 
    }, { status: 500 })
  }
}

async function exportInvoices(agencyId: string, provider: string, config: any, invoiceIds?: string[]) {
  try {
    let invoices
    if (invoiceIds && invoiceIds.length > 0) {
      invoices = await db.invoice.findMany({
        where: { 
          agencyId,
          id: { in: invoiceIds }
        },
        include: {
          student: true
        }
      })
    } else {
      // Export all invoices
      invoices = await db.invoice.findMany({
        where: { agencyId },
        include: {
          student: true
        }
      })
    }

    // Generate export data in accounting software format
    const exportData = invoices.map(invoice => ({
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.issueDate.toISOString().split('T')[0],
      dueDate: invoice.dueDate.toISOString().split('T')[0],
      customerName: invoice.student ? `${invoice.student.firstName} ${invoice.student.lastName}` : "Unknown",
      customerEmail: invoice.student?.email || "",
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      items: JSON.parse(invoice.items),
      description: `Invoice for educational services`
    }))

    // Simulate export to accounting software
    console.log(`Exporting ${invoices.length} invoices to ${provider}`)
    await new Promise(resolve => setTimeout(resolve, 2000))

    return NextResponse.json({
      success: true,
      message: `Exported ${invoices.length} invoices successfully`,
      exportData,
      summary: {
        totalInvoices: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
        currency: invoices[0]?.currency || "USD"
      }
    })
  } catch (error) {
    console.error("Error exporting invoices:", error)
    return NextResponse.json({ 
      error: "Failed to export invoices" 
    }, { status: 500 })
  }
}

async function exportTransactions(agencyId: string, provider: string, config: any, transactionIds?: string[]) {
  try {
    let transactions
    if (transactionIds && transactionIds.length > 0) {
      transactions = await db.transaction.findMany({
        where: { 
          agencyId,
          id: { in: transactionIds }
        },
        include: {
          student: true,
          invoice: true
        }
      })
    } else {
      // Export all transactions
      transactions = await db.transaction.findMany({
        where: { agencyId },
        include: {
          student: true,
          invoice: true
        }
      })
    }

    // Generate export data in accounting software format
    const exportData = transactions.map(transaction => ({
      date: transaction.createdAt.toISOString().split('T')[0],
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description || `${transaction.type} transaction`,
      customerName: transaction.student ? `${transaction.student.firstName} ${transaction.student.lastName}` : "Unknown",
      invoiceNumber: transaction.invoice?.invoiceNumber || "",
      paymentMethod: transaction.paymentMethod || "",
      status: transaction.status
    }))

    // Simulate export to accounting software
    console.log(`Exporting ${transactions.length} transactions to ${provider}`)
    await new Promise(resolve => setTimeout(resolve, 1500))

    return NextResponse.json({
      success: true,
      message: `Exported ${transactions.length} transactions successfully`,
      exportData,
      summary: {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, trans) => sum + trans.amount, 0),
        currency: transactions[0]?.currency || "USD",
        byType: transactions.reduce((acc, trans) => {
          acc[trans.type] = (acc[trans.type] || 0) + trans.amount
          return acc
        }, {} as Record<string, number>)
      }
    })
  } catch (error) {
    console.error("Error exporting transactions:", error)
    return NextResponse.json({ 
      error: "Failed to export transactions" 
    }, { status: 500 })
  }
}