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
    const status = searchParams.get("status")
    const universityId = searchParams.get("universityId")

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
      ...(status && { status: status }),
      ...(universityId && { universityId: universityId })
    }

    const applications = await db.application.findMany({
      where,
      include: {
        university: {
          select: {
            id: true,
            name: true,
            country: true,
            city: true,
            logo: true,
            website: true,
            description: true
          }
        },
        documents: {
          include: {
            document: {
              select: {
                id: true,
                name: true,
                type: true,
                fileName: true,
                isVerified: true,
                uploadedAt: true
              }
            }
          }
        },
        pipelineEntries: {
          include: {
            pipeline: {
              select: {
                id: true,
                name: true,
                type: true,
                stages: true
              }
            }
          },
          orderBy: { enteredAt: "desc" },
          take: 1
        },
        tasks: {
          where: {
            status: {
              in: ["PENDING", "IN_PROGRESS"]
            }
          },
          orderBy: { dueDate: "asc" },
          take: 5
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
          take: 3
        }
      },
      orderBy: { createdAt: "desc" }
    })

    // Process applications data
    const processedApplications = applications.map(app => {
      const pipelineEntry = app.pipelineEntries[0]
      const pipelineStages = pipelineEntry?.pipeline?.stages ? JSON.parse(pipelineEntry.pipeline.stages) : []
      const currentStage = pipelineEntry?.currentStage
      const currentStageInfo = pipelineStages.find((stage: any) => stage.id === currentStage)
      
      return {
        id: app.id,
        university: app.university,
        status: app.status,
        submittedAt: app.submittedAt,
        updatedAt: app.updatedAt,
        progress: pipelineEntry ? Math.round(pipelineEntry.progress * 100) : 0,
        currentStage: currentStageInfo?.name || "Not Started",
        currentStageDescription: currentStageInfo?.description || "",
        pipelineName: pipelineEntry?.pipeline?.name || "",
        documents: app.documents.map(ad => ad.document),
        pendingTasks: app.tasks.length,
        upcomingAppointments: app.appointments.length,
        nextMilestone: getNextMilestone(pipelineStages, currentStage),
        estimatedCompletion: getEstimatedCompletion(app.status, pipelineEntry?.progress || 0)
      }
    })

    return NextResponse.json({
      applications: processedApplications,
      summary: {
        total: applications.length,
        pending: applications.filter(app => app.status === "PENDING").length,
        underReview: applications.filter(app => app.status === "UNDER_REVIEW").length,
        inProgress: applications.filter(app => app.status === "IN_PROGRESS").length,
        completed: applications.filter(app => ["COMPLETED", "ACCEPTED"].includes(app.status)).length,
        rejected: applications.filter(app => app.status === "REJECTED").length
      }
    })
  } catch (error) {
    console.error("Error fetching student applications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get next milestone
function getNextMilestone(stages: any[], currentStageId: string): string | null {
  if (!stages.length || !currentStageId) return null
  
  const currentIndex = stages.findIndex((stage: any) => stage.id === currentStageId)
  if (currentIndex === -1 || currentIndex === stages.length - 1) return null
  
  return stages[currentIndex + 1].name
}

// Helper function to get estimated completion
function getEstimatedCompletion(status: string, progress: number): string | null {
  if (["COMPLETED", "ACCEPTED", "REJECTED"].includes(status)) {
    return null
  }
  
  if (progress < 0.3) return "Several weeks"
  if (progress < 0.6) return "Few weeks"
  if (progress < 0.9) return "Week"
  return "Days"
}