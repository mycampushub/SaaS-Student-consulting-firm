import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const updateDocumentSchema = z.object({
  name: z.string().min(1, "Document name is required").optional(),
  description: z.string().optional(),
  type: z.enum(["IDENTITY", "ACADEMIC", "FINANCIAL", "VISA", "MEDICAL", "CUSTOM"]).optional(),
  category: z.string().min(1, "Category is required").optional(),
  fileName: z.string().min(1, "File name is required").optional(),
  fileSize: z.number().int().min(0).optional(),
  fileType: z.string().min(1, "File type is required").optional(),
  fileUrl: z.string().url("File URL is required").optional(),
  thumbnailUrl: z.string().url("Thumbnail URL is required").optional(),
  studentId: z.string().optional(),
  leadId: z.string().optional(),
  applicationId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  verifiedBy: z.string().optional(),
  verifiedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  isPublic: z.boolean().optional(),
  metadata: z.any().optional()
})

const verifyDocumentSchema = z.object({
  isVerified: z.boolean(),
  verificationNotes: z.string().optional(),
  expiresAt: z.date().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const document = await db.document.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
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
        },
        verifiedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 10
        }
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Parse JSON fields
    const processedDocument = {
      ...document,
      tags: document.tags ? JSON.parse(document.tags) : [],
      metadata: document.metadata ? JSON.parse(document.metadata) : null
    }

    return NextResponse.json(processedDocument)
  } catch (error) {
    console.error("Error fetching document:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    const { action } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    const existingDocument = await db.document.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!existingDocument) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (action === "verify") {
      const validatedData = verifyDocumentSchema.parse(body)
      return await handleVerify(existingDocument, validatedData, agency.id)
    } else if (action === "download") {
      return await handleDownload(existingDocument, agency.id)
    } else if (action === "share") {
      return await handleShare(existingDocument, body, agency.id)
    } else {
      const validatedData = updateDocumentSchema.parse(body)
      return await handleUpdate(existingDocument, validatedData, agency.id)
    }
  } catch (error) {
    console.error("Error updating document:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existingDocument = await db.document.findFirst({
      where: {
        id: params.id,
        agencyId: agency.id
      }
    })

    if (!existingDocument) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Delete associated activities
    await db.documentActivity.deleteMany({
      where: {
        agencyId: agency.id,
        documentId: params.id
      }
    })

    // Delete document
    await db.document.delete({
      where: { id: params.id }
    })

    // Send deletion notifications
    await sendDeletionNotifications(existingDocument, agency.id)

    return NextResponse.json({ success: true, message: "Document deleted successfully" })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handleUpdate(document: any, data: any, agencyId: string) {
  // Update document
  const updatedDocument = await db.document.update({
    where: { id: document.id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      ...(data.type && { type: data.type }),
      ...(data.category && { category: data.category }),
      ...(data.fileName && { fileName: data.fileName }),
      ...(data.fileSize && { fileSize: data.fileSize }),
      ...(data.fileType && { fileType: data.fileType }),
      ...(data.fileUrl && { fileUrl: data.fileUrl }),
      ...(data.thumbnailUrl && { thumbnailUrl: data.thumbnailUrl }),
      ...(data.studentId && { studentId: data.studentId }),
      ...(data.leadId && { leadId: data.leadId }),
      ...(data.applicationId && { applicationId: data.applicationId }),
      ...(data.tags !== undefined && { tags: data.tags ? JSON.stringify(data.tags) : null }),
      ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
      ...(data.isVerified !== undefined && { isVerified: data.isVerified }),
      ...(data.verifiedBy && { verifiedBy: data.verifiedBy }),
      ...(data.verifiedAt && { verifiedAt: data.verifiedAt }),
      ...(data.expiresAt && { expiresAt: data.expiresAt }),
      ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
      ...(data.metadata !== undefined && { metadata: data.metadata ? JSON.stringify(data.metadata) : null })
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
      },
      verifiedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true
        }
      }
    }
  })

  // Create activity log
  await db.documentActivity.create({
    data: {
      agencyId: agencyId,
      documentId: document.id,
      action: "UPDATED",
      userId: "SYSTEM",
      changes: JSON.stringify(data)
    }
  })

  // Parse JSON fields for response
  const processedDocument = {
    ...updatedDocument,
    tags: updatedDocument.tags ? JSON.parse(updatedDocument.tags) : [],
    metadata: updatedDocument.metadata ? JSON.parse(updatedDocument.metadata) : null
  }

  return NextResponse.json(processedDocument)
}

async function handleVerify(document: any, data: any, agencyId: string) {
  const { isVerified, verificationNotes, expiresAt } = data

  // Update document verification status
  const updatedDocument = await db.document.update({
    where: { id: document.id },
    data: {
      isVerified,
      verifiedAt: isVerified ? new Date() : null,
      verifiedBy: isVerified ? "SYSTEM" : null,
      expiresAt: expiresAt || document.expiresAt
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
      },
      verifiedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true
        }
      }
    }
  })

  // Create activity log
  await db.documentActivity.create({
    data: {
      agencyId: agencyId,
      documentId: document.id,
      action: isVerified ? "VERIFIED" : "UNVERIFIED",
      userId: "SYSTEM",
      changes: JSON.stringify({
        isVerified,
        verificationNotes,
        expiresAt
      })
    }
  })

  // Send verification notifications
  await sendVerificationNotifications(updatedDocument, isVerified, agencyId)

  return NextResponse.json({
    success: true,
    document: updatedDocument,
    message: `Document ${isVerified ? "verified" : "unverified"} successfully`
  })
}

async function handleDownload(document: any, agencyId: string) {
  // Increment download count
  await db.document.update({
    where: { id: document.id },
    data: {
      downloadCount: {
        increment: 1
      }
    }
  })

  // Create activity log
  await db.documentActivity.create({
    data: {
      agencyId: agencyId,
      documentId: document.id,
      action: "DOWNLOADED",
      userId: "SYSTEM"
    }
  })

  return NextResponse.json({
    success: true,
    downloadUrl: document.fileUrl,
    message: "Download URL generated"
  })
}

async function handleShare(document: any, data: any, agencyId: string) {
  const { recipientId, recipientType, expiresAt } = data

  // Create document share
  const share = await db.documentShare.create({
    data: {
      agencyId: agencyId,
      documentId: document.id,
      recipientId,
      recipientType,
      expiresAt,
      token: generateShareToken(),
      status: "ACTIVE"
    }
  })

  // Create activity log
  await db.documentActivity.create({
    data: {
      agencyId: agencyId,
      documentId: document.id,
      action: "SHARED",
      userId: "SYSTEM",
      changes: JSON.stringify({
        recipientId,
        recipientType,
        expiresAt
      })
    }
  })

  // Send share notification
  await sendShareNotification(document, share, agencyId)

  return NextResponse.json({
    success: true,
    share,
    message: "Document shared successfully"
  })
}

// Helper functions
function generateShareToken(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`
}

async function sendVerificationNotifications(document: any, isVerified: boolean, agencyId: string) {
  const recipientId = document.studentId || document.leadId
  const recipientType = document.studentId ? "STUDENT" : "LEAD"

  if (!recipientId) return

  await db.notification.create({
    data: {
      agencyId,
      type: isVerified ? "SUCCESS" : "WARNING",
      title: `Document ${isVerified ? "Verified" : "Requires Attention"}`,
      message: `Your document "${document.name}" has been ${isVerified ? "verified" : "marked as requiring attention"}`,
      recipientId: recipientId,
      recipientType: recipientType,
      channel: "IN_APP",
      status: "PENDING",
      priority: isVerified ? "LOW" : "HIGH",
      data: JSON.stringify({
        documentId: document.id,
        documentName: document.name,
        isVerified
      })
    }
  })
}

async function sendDeletionNotifications(document: any, agencyId: string) {
  const recipientId = document.studentId || document.leadId
  const recipientType = document.studentId ? "STUDENT" : "LEAD"

  if (recipientId) {
    await db.notification.create({
      data: {
        agencyId,
        type: "WARNING",
        title: "Document Deleted",
        message: `Your document "${document.name}" has been deleted`,
        recipientId: recipientId,
        recipientType: recipientType,
        channel: "IN_APP",
        status: "PENDING",
        priority: "MEDIUM",
        data: JSON.stringify({
          documentId: document.id,
          documentName: document.name
        })
      }
    })
  }
}

async function sendShareNotification(document: any, share: any, agencyId: string) {
  await db.notification.create({
    data: {
      agencyId,
      type: "INFO",
      title: "Document Shared",
      message: `A document "${document.name}" has been shared with you`,
      recipientId: share.recipientId,
      recipientType: share.recipientType,
      channel: "IN_APP",
      status: "PENDING",
      priority: "MEDIUM",
      data: JSON.stringify({
        documentId: document.id,
        documentName: document.name,
        shareToken: share.token,
        expiresAt: share.expiresAt
      })
    }
  })
}