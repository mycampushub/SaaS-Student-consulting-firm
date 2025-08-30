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
    const {
      formId,
      data,
      source,
      sourceUrl,
      ipAddress,
      userAgent
    } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Get the form
    const form = await db.form.findUnique({
      where: { id: formId, agencyId: agency.id }
    })

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    if (form.status !== "ACTIVE") {
      return NextResponse.json({ error: "Form is not active" }, { status: 400 })
    }

    // Create form submission
    const submission = await db.formSubmission.create({
      data: {
        agencyId: agency.id,
        formId,
        data: JSON.stringify(data),
        source,
        sourceUrl,
        ipAddress,
        userAgent
      }
    })

    // Update form submission count
    await db.form.update({
      where: { id: formId },
      data: {
        submissionCount: {
          increment: 1
        }
      }
    })

    // Create or update lead if email is provided
    const email = data.email || data.Email || data.EMAIL
    if (email) {
      const leadData = {
        firstName: data.firstName || data.FirstName || data.FIRST_NAME,
        lastName: data.lastName || data.LastName || data.LAST_NAME,
        email,
        phone: data.phone || data.Phone || data.PHONE,
        source: source || "form",
        customFields: JSON.stringify(data)
      }

      const lead = await db.lead.upsert({
        where: {
          agencyId_email: {
            agencyId: agency.id,
            email
          }
        },
        update: leadData,
        create: {
          agencyId: agency.id,
          ...leadData
        }
      })

      // Link submission to lead
      await db.formSubmission.update({
        where: { id: submission.id },
        data: { leadId: lead.id }
      })

      // If Facebook/Google integration is enabled, send data
      if (form.facebookLeadId) {
        // TODO: Implement Facebook Lead Ads integration
        console.log("Facebook Lead Ads integration:", { facebookLeadId: form.facebookLeadId, data })
      }

      if (form.googleLeadId) {
        // TODO: Implement Google Lead Form integration
        console.log("Google Lead Form integration:", { googleLeadId: form.googleLeadId, data })
      }

      if (form.webhookUrl) {
        // TODO: Implement webhook integration
        console.log("Webhook integration:", { webhookUrl: form.webhookUrl, data })
      }
    }

    return NextResponse.json({
      success: true,
      message: form.successMessage,
      redirectUrl: form.redirectUrl
    })
  } catch (error) {
    console.error("Error submitting form:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}