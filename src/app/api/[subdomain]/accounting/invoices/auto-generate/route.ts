import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const autoGenerateSchema = z.object({
  studentId: z.string().optional(),
  serviceType: z.enum(["CONSULTATION", "VISA_PROCESSING", "DOCUMENT_REVIEW", "APPLICATION_FEE", "TUITION_FEE", "OTHER"]),
  templateId: z.string().optional(),
  customItems: z.array(z.object({
    description: z.string(),
    amount: z.number().positive(),
    isTaxable: z.boolean().default(true),
    category: z.string().optional()
  })).optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = autoGenerateSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: { 
        accounting: true,
        brandSettings: true
      }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    if (!agency.accounting) {
      return NextResponse.json({ error: "Accounting module not initialized" }, { status: 400 })
    }

    let template = null
    let items = []

    // Use template if provided, otherwise find active template for service type
    if (validatedData.templateId) {
      template = await db.invoiceTemplate.findFirst({
        where: {
          id: validatedData.templateId,
          agencyId: agency.id,
          isActive: true
        }
      })
    } else {
      template = await db.invoiceTemplate.findFirst({
        where: {
          agencyId: agency.id,
          serviceType: validatedData.serviceType,
          isActive: true
        }
      })
    }

    if (template) {
      items = JSON.parse(template.items)
    } else if (validatedData.customItems) {
      items = validatedData.customItems
    } else {
      return NextResponse.json({ error: "No template or custom items provided" }, { status: 400 })
    }

    // Calculate total amount
    const amount = items.reduce((sum, item) => sum + item.amount, 0)

    // Set dates
    const issueDate = validatedData.issueDate ? new Date(validatedData.issueDate) : new Date()
    const dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : 
      new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from issue date

    // Generate invoice number
    const invoiceCount = await db.invoice.count({
      where: { agencyId: agency.id }
    })
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`

    // Create invoice
    const invoice = await db.invoice.create({
      data: {
        agencyId: agency.id,
        accountingId: agency.accounting.id,
        invoiceNumber,
        studentId: validatedData.studentId,
        amount,
        currency: agency.accounting.currency,
        issueDate,
        dueDate,
        items: JSON.stringify(items),
        status: "DRAFT"
      },
      include: {
        student: true
      }
    })

    // Auto-send invoice if configured
    if (template?.autoGenerate && validatedData.studentId) {
      await sendInvoiceNotification(invoice, agency)
      await db.invoice.update({
        where: { id: invoice.id },
        data: { status: "SENT" }
      })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error auto-generating invoice:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to send invoice notification
async function sendInvoiceNotification(invoice: any, agency: any) {
  try {
    // Create notification for invoice
    await db.notification.create({
      data: {
        agencyId: agency.id,
        type: "INVOICE_GENERATED",
        title: "New Invoice Generated",
        message: `Invoice ${invoice.invoiceNumber} for ${invoice.amount} ${invoice.currency} has been generated.`,
        recipientType: "STUDENT",
        recipientId: invoice.studentId,
        channel: "EMAIL",
        priority: "MEDIUM",
        status: "PENDING",
        metadata: JSON.stringify({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          dueDate: invoice.dueDate
        })
      }
    })

    // Schedule payment reminders
    await schedulePaymentReminders(invoice, agency)
  } catch (error) {
    console.error("Error sending invoice notification:", error)
  }
}

// Helper function to schedule payment reminders
async function schedulePaymentReminders(invoice: any, agency: any) {
  try {
    const dueDate = new Date(invoice.dueDate)
    const reminders = [
      // 7 days before due
      new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      // 1 day before due
      new Date(dueDate.getTime() - 1 * 24 * 60 * 60 * 1000),
      // 1 day after due (overdue)
      new Date(dueDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      // 3 days after due (overdue)
      new Date(dueDate.getTime() + 3 * 24 * 60 * 60 * 1000)
    ]

    for (const reminderDate of reminders) {
      if (reminderDate > new Date()) {
        await db.notification.create({
          data: {
            agencyId: agency.id,
            type: "PAYMENT_REMINDER",
            title: "Payment Reminder",
            message: `Reminder: Invoice ${invoice.invoiceNumber} is due on ${dueDate.toDateString()}.`,
            recipientType: "STUDENT",
            recipientId: invoice.studentId,
            channel: "EMAIL",
            priority: "HIGH",
            status: "SCHEDULED",
            scheduledAt: reminderDate,
            metadata: JSON.stringify({
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.amount,
              dueDate: invoice.dueDate,
              reminderType: reminderDate < dueDate ? "PRE_DUE" : "OVERDUE"
            })
          }
        })
      }
    }
  } catch (error) {
    console.error("Error scheduling payment reminders:", error)
  }
}