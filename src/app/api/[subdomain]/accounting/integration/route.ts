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
        accounting: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    if (!agency.accounting) {
      return NextResponse.json({ 
        isConnected: false,
        provider: null,
        syncStatus: "NOT_CONNECTED",
        lastSyncAt: null
      })
    }

    return NextResponse.json({
      isConnected: agency.accounting.isConnected,
      provider: agency.accounting.accountingProvider,
      syncStatus: agency.accounting.syncStatus,
      lastSyncAt: agency.accounting.lastSyncAt,
      config: agency.accounting.accountingConfig ? JSON.parse(agency.accounting.accountingConfig) : null
    })
  } catch (error) {
    console.error("Error fetching accounting integration:", error)
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
    const { provider, config, action } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    let accounting = await db.accounting.findUnique({
      where: { agencyId: agency.id }
    })

    if (!accounting) {
      accounting = await db.accounting.create({
        data: {
          agencyId: agency.id,
          currency: "USD",
          timezone: "UTC"
        }
      })
    }

    if (action === "connect") {
      // Validate connection with accounting software
      const isConnected = await validateAccountingConnection(provider, config)
      
      if (isConnected) {
        accounting = await db.accounting.update({
          where: { id: accounting.id },
          data: {
            accountingProvider: provider,
            accountingConfig: JSON.stringify(config),
            isConnected: true,
            syncStatus: "CONNECTED",
            lastSyncAt: new Date()
          }
        })

        // Initial sync
        await performInitialSync(agency.id, provider, config)
        
        return NextResponse.json({
          success: true,
          isConnected: true,
          provider: accounting.accountingProvider,
          syncStatus: accounting.syncStatus,
          lastSyncAt: accounting.lastSyncAt
        })
      } else {
        return NextResponse.json({ 
          error: "Failed to connect to accounting software" 
        }, { status: 400 })
      }
    } else if (action === "disconnect") {
      accounting = await db.accounting.update({
        where: { id: accounting.id },
        data: {
          accountingProvider: null,
          accountingConfig: null,
          isConnected: false,
          syncStatus: "NOT_CONNECTED",
          lastSyncAt: null
        }
      })

      return NextResponse.json({
        success: true,
        isConnected: false,
        provider: null,
        syncStatus: accounting.syncStatus
      })
    } else if (action === "sync") {
      if (!accounting.isConnected || !accounting.accountingProvider) {
        return NextResponse.json({ 
          error: "Accounting software not connected" 
        }, { status: 400 })
      }

      accounting = await db.accounting.update({
        where: { id: accounting.id },
        data: {
          syncStatus: "SYNCING"
        }
      })

      // Perform sync in background
      performSync(agency.id, accounting.accountingProvider, JSON.parse(accounting.accountingConfig || "{}"))
        .then(async (result) => {
          await db.accounting.update({
            where: { id: accounting.id },
            data: {
              syncStatus: result.success ? "SYNC_SUCCESS" : "SYNC_FAILED",
              lastSyncAt: new Date()
            }
          })
        })

      return NextResponse.json({
        success: true,
        syncStatus: "SYNCING",
        message: "Sync started"
      })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error managing accounting integration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper functions for accounting integration
async function validateAccountingConnection(provider: string, config: any): Promise<boolean> {
  // Simulate connection validation
  // In a real implementation, this would make API calls to the accounting software
  try {
    switch (provider) {
      case "QUICKBOOKS":
        // Validate QuickBooks connection
        return config?.accessToken && config?.realmId
      case "XERO":
        // Validate Xero connection
        return config?.accessToken && config?.tenantId
      case "WAVE":
        // Validate Wave connection
        return config?.apiKey && config?.businessId
      case "FRESHBOOKS":
        // Validate FreshBooks connection
        return config?.accessToken && config?.businessId
      case "ZOHO_BOOKS":
        // Validate Zoho Books connection
        return config?.accessToken && config?.organizationId
      case "SAGE":
        // Validate Sage connection
        return config?.apiKey && config?.companyId
      case "NETSUITE":
        // Validate NetSuite connection
        return config?.accountId && config?.consumerKey && config?.consumerSecret
      default:
        return false
    }
  } catch (error) {
    console.error("Error validating accounting connection:", error)
    return false
  }
}

async function performInitialSync(agencyId: string, provider: string, config: any) {
  // Simulate initial sync
  // In a real implementation, this would:
  // 1. Fetch existing invoices from accounting software
  // 2. Fetch existing transactions from accounting software
  // 3. Sync local data with accounting software
  
  console.log(`Performing initial sync for agency ${agencyId} with ${provider}`)
  
  // Simulate sync delay
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  console.log(`Initial sync completed for agency ${agencyId}`)
}

async function performSync(agencyId: string, provider: string, config: any): Promise<{ success: boolean; message?: string }> {
  try {
    // Get recent invoices and transactions
    const recentInvoices = await db.invoice.findMany({
      where: { 
        agencyId,
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }
    })

    const recentTransactions = await db.transaction.findMany({
      where: { 
        agencyId,
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }
    })

    // Sync with accounting software
    console.log(`Syncing ${recentInvoices.length} invoices and ${recentTransactions.length} transactions to ${provider}`)

    // Simulate sync process
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Update sync status
    return { success: true, message: "Sync completed successfully" }
  } catch (error) {
    console.error("Error performing sync:", error)
    return { success: false, message: "Sync failed" }
  }
}