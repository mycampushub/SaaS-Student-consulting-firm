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

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    // Get student data
    const student = await db.student.findFirst({
      where: {
        id: studentId,
        agencyId: agency.id
      },
      include: {
        applications: {
          include: {
            university: {
              select: {
                id: true,
                name: true,
                country: true,
                logo: true
              }
            },
            documents: true,
            pipelineEntries: {
              include: {
                pipeline: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        documents: {
          orderBy: { createdAt: "desc" },
          take: 10
        },
        appointments: {
          where: {
            startTime: {
              gte: new Date()
            },
            status: {
              in: ["SCHEDULED", "CONFIRMED"]
            }
          },
          orderBy: { startTime: "asc" },
          take: 5
        },
        tasks: {
          where: {
            status: {
              in: ["PENDING", "IN_PROGRESS"]
            }
          },
          orderBy: { dueDate: "asc" },
          take: 10
        },
        notifications: {
          where: {
            status: "PENDING"
          },
          orderBy: { createdAt: "desc" },
          take: 10
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Calculate portal statistics
    const stats = {
      totalApplications: student.applications.length,
      activeApplications: student.applications.filter(app => 
        ["PENDING", "UNDER_REVIEW", "IN_PROGRESS"].includes(app.status)
      ).length,
      completedApplications: student.applications.filter(app => 
        ["COMPLETED", "ACCEPTED"].includes(app.status)
      ).length,
      totalDocuments: student.documents.length,
      verifiedDocuments: student.documents.filter(doc => doc.isVerified).length,
      pendingTasks: student.tasks.filter(task => 
        ["PENDING", "IN_PROGRESS"].includes(task.status)
      ).length,
      upcomingAppointments: student.appointments.length,
      unreadNotifications: student.notifications.length
    }

    // Get application progress summary
    const applicationProgress = student.applications.map(app => {
      const pipelineEntry = app.pipelineEntries[0]
      const progress = pipelineEntry ? pipelineEntry.progress : 0
      
      return {
        id: app.id,
        universityName: app.university.name,
        status: app.status,
        progress: Math.round(progress * 100),
        currentStage: pipelineEntry?.currentStage || "Not Started",
        lastUpdated: app.updatedAt
      }
    })

    // Get recent activity
    const recentActivity = await getStudentRecentActivity(studentId, agency.id)

    // Get required documents checklist
    const requiredDocuments = await getRequiredDocumentsChecklist(studentId, agency.id)

    return NextResponse.json({
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        avatar: student.avatar,
        status: student.status,
        currentEducation: student.currentEducation,
        nationality: student.nationality,
        dateOfBirth: student.dateOfBirth
      },
      stats,
      applicationProgress,
      recentActivity,
      requiredDocuments,
      upcomingAppointments: student.appointments,
      pendingTasks: student.tasks,
      unreadNotifications: student.notifications
    })
  } catch (error) {
    console.error("Error fetching student portal data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get student recent activity
async function getStudentRecentActivity(studentId: string, agencyId: string) {
  const activities = await Promise.all([
    // Get application activities
    db.application.findMany({
      where: {
        studentId: studentId,
        agencyId: agencyId
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        university: {
          select: {
            name: true
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    // Get document activities
    db.documentActivity.findMany({
      where: {
        document: {
          studentId: studentId,
          agencyId: agencyId
        }
      },
      select: {
        action: true,
        createdAt: true,
        document: {
          select: {
            name: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    // Get appointment activities
    db.appointment.findMany({
      where: {
        studentId: studentId,
        agencyId: agencyId
      },
      select: {
        title: true,
        status: true,
        startTime: true,
        endTime: true
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    })
  ])

  // Combine and format activities
  const allActivities = []
  
  // Application activities
  activities[0].forEach(app => {
    allActivities.push({
      id: `app_${app.id}`,
      type: "APPLICATION",
      action: "STATUS_UPDATE",
      title: `Application to ${app.university.name}`,
      description: `Status updated to ${app.status}`,
      timestamp: app.updatedAt,
      icon: "university"
    })
  })

  // Document activities
  activities[1].forEach(docActivity => {
    allActivities.push({
      id: `doc_${docActivity.createdAt.getTime()}`,
      type: "DOCUMENT",
      action: docActivity.action,
      title: `${docActivity.action.toLowerCase()}: ${docActivity.document.name}`,
      description: `${docActivity.document.type} document`,
      timestamp: docActivity.createdAt,
      icon: "document"
    })
  })

  // Appointment activities
  activities[2].forEach(appointment => {
    allActivities.push({
      id: `apt_${appointment.startTime.getTime()}`,
      type: "APPOINTMENT",
      action: "SCHEDULED",
      title: appointment.title,
      description: `Scheduled for ${appointment.startTime.toLocaleString()}`,
      timestamp: appointment.startTime,
      icon: "calendar"
    })
  })

  // Sort by timestamp and return recent activities
  return allActivities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10)
}

// Helper function to get required documents checklist
async function getRequiredDocumentsChecklist(studentId: string, agencyId: string) {
  // Get all required document types for the agency
  const requiredDocumentTypes = [
    { type: "IDENTITY", name: "Identity Document", required: true },
    { type: "ACADEMIC", name: "Academic Transcripts", required: true },
    { type: "FINANCIAL", name: "Financial Documents", required: true },
    { type: "VISA", name: "Visa Documents", required: false },
    { type: "MEDICAL", name: "Medical Documents", required: false }
  ]

  // Get student's documents
  const studentDocuments = await db.document.findMany({
    where: {
      studentId: studentId,
      agencyId: agencyId
    }
  })

  // Create checklist
  const checklist = requiredDocumentTypes.map(docType => {
    const documentsOfType = studentDocuments.filter(doc => doc.type === docType.type)
    const uploadedCount = documentsOfType.length
    const verifiedCount = documentsOfType.filter(doc => doc.isVerified).length

    return {
      type: docType.type,
      name: docType.name,
      required: docType.required,
      uploadedCount,
      verifiedCount,
      status: uploadedCount > 0 ? (verifiedCount === uploadedCount ? "COMPLETED" : "PARTIAL") : "MISSING",
      documents: documentsOfType.map(doc => ({
        id: doc.id,
        name: doc.name,
        fileName: doc.fileName,
        isVerified: doc.isVerified,
        uploadedAt: doc.createdAt
      }))
    }
  })

  return checklist
}