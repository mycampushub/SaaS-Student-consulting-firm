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
    const status = searchParams.get("status") || "PENDING"
    const type = searchParams.get("type")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where: any = {
      agencyId: agency.id,
      status: status,
      ...(type && { type: type })
    }

    const reminders = await db.notification.findMany({
      where,
      include: {
        student: true
      },
      orderBy: { scheduledAt: "asc" }
    })

    return NextResponse.json({ reminders })
  } catch (error) {
    console.error("Error fetching payment reminders:", error)
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
      invoiceId, 
      studentId, 
      reminderType, 
      message, 
      scheduledAt,
      channel = "EMAIL" 
    } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Validate invoice exists
    const invoice = await db.invoice.findFirst({
      where: {
        id: invoiceId,
        agencyId: agency.id
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Create payment reminder
    const reminder = await db.notification.create({
      data: {
        agencyId: agency.id,
        type: "PAYMENT_REMINDER",
        title: "Payment Reminder",
        message: message || `Reminder: Invoice ${invoice.invoiceNumber} payment is ${reminderType?.toLowerCase() || "due"}.`,
        recipientType: "STUDENT",
        recipientId: studentId,
        channel: channel.toUpperCase(),
        priority: reminderType === "OVERDUE" ? "HIGH" : "MEDIUM",
        status: scheduledAt ? "SCHEDULED" : "PENDING",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        metadata: JSON.stringify({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          dueDate: invoice.dueDate,
          reminderType: reminderType || "GENERAL"
        })
      }
    })

    return NextResponse.json(reminder)
  } catch (error) {
    console.error("Error creating payment reminder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Process scheduled reminders (could be called by a cron job)
export async function PUT(request: NextRequest) {
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

    const now = new Date()
    
    // Find scheduled reminders that are due
    const scheduledReminders = await db.notification.findMany({
      where: {
        agencyId: agency.id,
        status: "SCHEDULED",
        scheduledAt: {
          lte: now
        }
      }
    })

    const processedReminders = []

    for (const reminder of scheduledReminders) {
      try {
        // Process the reminder (send email/SMS)
        await processReminder(reminder, agency)
        
        // Update reminder status
        const updatedReminder = await db.notification.update({
          where: { id: reminder.id },
          data: { status: "SENT" }
        })

        processedReminders.push(updatedReminder)
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error)
        
        // Mark as failed
        await db.notification.update({
          where: { id: reminder.id },
          data: { status: "FAILED" }
        })
      }
    }

    return NextResponse.json({
      processed: processedReminders.length,
      reminders: processedReminders
    })
  } catch (error) {
    console.error("Error processing payment reminders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to process a reminder
async function processReminder(reminder: any, agency: any) {
  const metadata = JSON.parse(reminder.metadata || "{}")
  
  // Here you would integrate with email/SMS services
  // For now, we'll just log the reminder
  console.log(`Processing ${reminder.channel} reminder for invoice ${metadata.invoiceNumber}`)
  
  // In a real implementation, you would:
  // 1. Send email via SendGrid/Resend/etc.
  // 2. Send SMS via Twilio/etc.
  // 3. Update invoice status if overdue
  // 4. Log the communication
  
  // If invoice is overdue and this is an overdue reminder, update invoice status
  if (metadata.reminderType === "OVERDUE") {
    await db.invoice.update({
      where: { id: metadata.invoiceId },
      data: { status: "OVERDUE" }
    })
  }
}