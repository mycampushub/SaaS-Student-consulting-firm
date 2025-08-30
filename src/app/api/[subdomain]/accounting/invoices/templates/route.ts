import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const invoiceTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  serviceType: z.enum(["CONSULTATION", "VISA_PROCESSING", "DOCUMENT_REVIEW", "APPLICATION_FEE", "TUITION_FEE", "OTHER"]),
  items: z.array(z.object({
    description: z.string(),
    amount: z.number().positive(),
    isTaxable: z.boolean().default(true),
    category: z.string().optional()
  })).default([]),
  terms: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  autoGenerate: z.boolean().default(false),
  triggerConditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "contains", "greater_than", "less_than"]),
    value: z.any()
  })).optional()
})

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const serviceType = searchParams.get("serviceType")
    const isActive = searchParams.get("isActive")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const where: any = {
      agencyId: agency.id
    }

    if (serviceType) {
      where.serviceType = serviceType
    }

    if (isActive !== null) {
      where.isActive = isActive === "true"
    }

    const templates = await db.invoiceTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Error fetching invoice templates:", error)
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
    const validatedData = invoiceTemplateSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const template = await db.invoiceTemplate.create({
      data: {
        agencyId: agency.id,
        name: validatedData.name,
        description: validatedData.description,
        serviceType: validatedData.serviceType,
        items: JSON.stringify(validatedData.items),
        terms: validatedData.terms,
        notes: validatedData.notes,
        isActive: validatedData.isActive,
        autoGenerate: validatedData.autoGenerate,
        triggerConditions: validatedData.triggerConditions ? 
          JSON.stringify(validatedData.triggerConditions) : null
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error creating invoice template:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}