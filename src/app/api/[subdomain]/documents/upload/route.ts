import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const uploadSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  description: z.string().optional(),
  type: z.enum(["IDENTITY", "ACADEMIC", "FINANCIAL", "VISA", "MEDICAL", "CUSTOM"]),
  category: z.string().min(1, "Category is required"),
  studentId: z.string().optional(),
  leadId: z.string().optional(),
  applicationId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  expiresAt: z.date().optional()
})

export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const metadata = JSON.parse(formData.get("metadata") as string)

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate metadata
    const validatedData = uploadSchema.parse(metadata)

    // Validate associated entities exist and belong to agency
    if (validatedData.studentId) {
      const student = await db.student.findFirst({
        where: { id: validatedData.studentId, agencyId: agency.id }
      })
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }
    }

    if (validatedData.leadId) {
      const lead = await db.lead.findFirst({
        where: { id: validatedData.leadId, agencyId: agency.id }
      })
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 })
      }
    }

    if (validatedData.applicationId) {
      const application = await db.application.findFirst({
        where: { id: validatedData.applicationId, agencyId: agency.id }
      })
      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 })
      }
    }

    // Generate file URLs (in a real implementation, you would upload to cloud storage)
    const fileUrl = await uploadFileToStorage(file, agency.id)
    const thumbnailUrl = await generateThumbnail(file, agency.id)

    // Create document record
    const document = await db.document.create({
      data: {
        agencyId: agency.id,
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        category: validatedData.category,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl: fileUrl,
        thumbnailUrl: thumbnailUrl,
        studentId: validatedData.studentId,
        leadId: validatedData.leadId,
        applicationId: validatedData.applicationId,
        tags: validatedData.tags ? JSON.stringify(validatedData.tags) : null,
        isRequired: validatedData.isRequired ?? false,
        isVerified: false,
        isPublic: validatedData.isPublic ?? false,
        downloadCount: 0,
        expiresAt: validatedData.expiresAt,
        metadata: JSON.stringify({
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          lastModified: file.lastModified,
          uploadedAt: new Date().toISOString()
        })
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        application: {
          select: {
            id: true,
            studentId: true,
            universityId: true,
            status: true
          }
        }
      }
    })

    // Create document activity log
    await db.documentActivity.create({
      data: {
        agencyId: agency.id,
        documentId: document.id,
        action: "UPLOADED",
        userId: "SYSTEM", // This would be the actual user in a real implementation
        changes: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        })
      }
    })

    // Send notifications if document is required
    if (validatedData.isRequired) {
      await sendRequiredDocumentNotification(document, agency.id)
    }

    // Parse JSON fields for response
    const processedDocument = {
      ...document,
      tags: document.tags ? JSON.parse(document.tags) : [],
      metadata: document.metadata ? JSON.parse(document.metadata) : null
    }

    return NextResponse.json({
      success: true,
      document: processedDocument,
      message: "Document uploaded successfully"
    })
  } catch (error) {
    console.error("Error uploading document:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to simulate file upload to storage
async function uploadFileToStorage(file: File, agencyId: string): Promise<string> {
  // In a real implementation, you would:
  // 1. Upload the file to cloud storage (AWS S3, Google Cloud Storage, etc.)
  // 2. Generate a secure URL
  // 3. Store the file metadata
  
  const timestamp = Date.now()
  const fileExtension = file.name.split('.').pop()
  const fileName = `${agencyId}_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`
  
  // Simulate cloud storage URL
  return `https://storage.example.com/documents/${agencyId}/${fileName}`
}

// Helper function to generate thumbnail
async function generateThumbnail(file: File, agencyId: string): Promise<string | null> {
  // In a real implementation, you would:
  // 1. Check if file type supports thumbnails (images, PDFs, etc.)
  // 2. Generate thumbnail using image processing library
  // 3. Upload thumbnail to storage
  // 4. Return thumbnail URL
  
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const pdfTypes = ['application/pdf']
  
  if (!imageTypes.includes(file.type) && !pdfTypes.includes(file.type)) {
    return null
  }
  
  const timestamp = Date.now()
  const fileExtension = file.type.startsWith('image/') ? 'jpg' : 'png'
  const fileName = `${agencyId}_${timestamp}_thumb.${fileExtension}`
  
  // Simulate thumbnail URL
  return `https://storage.example.com/thumbnails/${agencyId}/${fileName}`
}

// Helper function to send required document notification
async function sendRequiredDocumentNotification(document: any, agencyId: string) {
  const recipientId = document.studentId || document.leadId
  const recipientType = document.studentId ? "STUDENT" : "LEAD"

  if (!recipientId) return

  await db.notification.create({
    data: {
      agencyId,
      type: "INFO",
      title: "Required Document Uploaded",
      message: `Your required document "${document.name}" has been uploaded successfully`,
      recipientId: recipientId,
      recipientType: recipientType,
      channel: "IN_APP",
      status: "PENDING",
      priority: "MEDIUM",
      data: JSON.stringify({
        documentId: document.id,
        documentName: document.name,
        documentType: document.type
      })
    }
  })
}