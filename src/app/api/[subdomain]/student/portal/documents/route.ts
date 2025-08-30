import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

export async function GET(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const type = searchParams.get("type")
    const category = searchParams.get("category")
    const isVerified = searchParams.get("isVerified")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    const where: any = {
      studentId: studentId,
      agencyId: agency.id,
      ...(type && { type: type }),
      ...(category && { category: category }),
      ...(isVerified !== null && { isVerified: isVerified === "true" })
    }

    const documents = await db.document.findMany({
      where,
      include: {
        verifiedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      },
      orderBy: { createdAt: "desc" }
    })

    // Process documents data
    const processedDocuments = documents.map(doc => ({
      id: doc.id,
      name: doc.name,
      description: doc.description,
      type: doc.type,
      category: doc.category,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      fileType: doc.fileType,
      fileUrl: doc.fileUrl,
      thumbnailUrl: doc.thumbnailUrl,
      isRequired: doc.isRequired,
      isVerified: doc.isVerified,
      verifiedAt: doc.verifiedAt,
      verifiedBy: doc.verifiedByUser,
      expiresAt: doc.expiresAt,
      downloadCount: doc.downloadCount,
      uploadedAt: doc.createdAt,
      activities: doc.activities,
      canDownload: doc.isPublic || doc.isVerified,
      status: getDocumentStatus(doc)
    }))

    // Group documents by type
    const documentsByType = {
      IDENTITY: processedDocuments.filter(doc => doc.type === "IDENTITY"),
      ACADEMIC: processedDocuments.filter(doc => doc.type === "ACADEMIC"),
      FINANCIAL: processedDocuments.filter(doc => doc.type === "FINANCIAL"),
      VISA: processedDocuments.filter(doc => doc.type === "VISA"),
      MEDICAL: processedDocuments.filter(doc => doc.type === "MEDICAL"),
      CUSTOM: processedDocuments.filter(doc => doc.type === "CUSTOM")
    }

    // Calculate document statistics
    const stats = {
      total: documents.length,
      verified: documents.filter(doc => doc.isVerified).length,
      pending: documents.filter(doc => !doc.isVerified).length,
      required: documents.filter(doc => doc.isRequired).length,
      requiredVerified: documents.filter(doc => doc.isRequired && doc.isVerified).length,
      requiredPending: documents.filter(doc => doc.isRequired && !doc.isVerified).length,
      expired: documents.filter(doc => doc.expiresAt && new Date(doc.expiresAt) < new Date()).length,
      expiringSoon: documents.filter(doc => 
        doc.expiresAt && 
        new Date(doc.expiresAt) > new Date() && 
        new Date(doc.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      ).length
    }

    return NextResponse.json({
      documents: processedDocuments,
      documentsByType,
      stats,
      categories: [...new Set(documents.map(doc => doc.category))].sort()
    })
  } catch (error) {
    console.error("Error fetching student documents:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get document status
function getDocumentStatus(document: any): string {
  if (document.expiresAt && new Date(document.expiresAt) < new Date()) {
    return "EXPIRED"
  }
  
  if (document.isVerified) {
    if (document.expiresAt && new Date(document.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      return "EXPIRING_SOON"
    }
    return "VERIFIED"
  }
  
  return "PENDING_VERIFICATION"
}