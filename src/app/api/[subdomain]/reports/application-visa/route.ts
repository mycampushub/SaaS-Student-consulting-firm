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
    const reportType = searchParams.get("type") || "APPLICATION_PIPELINE"
    const pipelineId = searchParams.get("pipelineId")
    const consultantId = searchParams.get("consultantId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const destinationCountry = searchParams.get("destinationCountry")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    switch (reportType) {
      case "APPLICATION_PIPELINE":
        return await generateApplicationPipelineReport(agency, {
          pipelineId,
          consultantId,
          startDate,
          endDate,
          destinationCountry
        })
      
      case "VISA_PROCESS":
        return await generateVisaProcessReport(agency, {
          pipelineId,
          consultantId,
          startDate,
          endDate,
          destinationCountry
        })
      
      case "PROCESS_EFFICIENCY":
        return await generateProcessEfficiencyReport(agency, {
          startDate,
          endDate
        })
      
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error generating report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function generateApplicationPipelineReport(agency: any, filters: any) {
  const where: any = {
    agencyId: agency.id
  }

  if (filters.pipelineId) {
    where.pipelineId = filters.pipelineId
  }

  if (filters.consultantId) {
    where.assignedTo = filters.consultantId
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate)
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate)
    }
  }

  // Get pipeline entries with applications
  const pipelineEntries = await db.pipelineEntry.findMany({
    where,
    include: {
      pipeline: true,
      application: {
        include: {
          student: true,
          university: true
        }
      },
      assignedTo: true
    },
    orderBy: { createdAt: "desc" }
  })

  // Group by pipeline stage
  const stageStats = pipelineEntries.reduce((acc: any, entry) => {
    const stageName = entry.pipeline.name || "Unknown"
    if (!acc[stageName]) {
      acc[stageName] = {
        count: 0,
        averageDaysInStage: 0,
        applications: []
      }
    }
    acc[stageName].count++
    acc[stageName].applications.push(entry)
    
    // Calculate days in stage
    const daysInStage = Math.floor(
      (new Date().getTime() - new Date(entry.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    acc[stageName].averageDaysInStage += daysInStage
    
    return acc
  }, {})

  // Calculate averages
  Object.keys(stageStats).forEach(stage => {
    const stats = stageStats[stage]
    stats.averageDaysInStage = stats.count > 0 ? 
      Math.round(stats.averageDaysInStage / stats.count) : 0
  })

  // Filter by destination country if specified
  let filteredEntries = pipelineEntries
  if (filters.destinationCountry) {
    filteredEntries = pipelineEntries.filter(entry => 
      entry.application?.university?.country === filters.destinationCountry
    )
  }

  return NextResponse.json({
    type: "APPLICATION_PIPELINE",
    generatedAt: new Date(),
    filters,
    summary: {
      totalApplications: pipelineEntries.length,
      filteredApplications: filteredEntries.length,
      totalStages: Object.keys(stageStats).length
    },
    stageBreakdown: stageStats,
    bottleneckStages: Object.entries(stageStats)
      .filter(([_, stats]: any) => stats.averageDaysInStage > 30)
      .map(([stage, stats]: any) => ({
        stage,
        averageDaysInStage: stats.averageDaysInStage,
        count: stats.count
      })),
    entries: filteredEntries
  })
}

async function generateVisaProcessReport(agency: any, filters: any) {
  const where: any = {
    agencyId: agency.id
  }

  if (filters.consultantId) {
    where.assignedTo = filters.consultantId
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate)
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate)
    }
  }

  // Get students with visa-related applications
  const students = await db.student.findMany({
    where: {
      agencyId: agency.id,
      applications: {
        some: {
          university: {
            country: {
              in: ["USA", "UK", "Canada", "Australia", "New Zealand"] // Visa-required countries
            }
          }
        }
      }
    },
    include: {
      applications: {
        include: {
          university: true,
          pipelineEntries: {
            include: {
              pipeline: true,
              assignedTo: true
            }
          }
        }
      },
      documents: true
    }
  })

  // Analyze visa process stages
  const visaStatuses = {
    DOCUMENT_COLLECTION: 0,
    VISA_APPLICATION_SUBMITTED: 0,
    BIOMETRICS_COMPLETED: 0,
    INTERVIEW_SCHEDULED: 0,
    VISA_APPROVED: 0,
    VISA_REJECTED: 0,
    PENDING: 0
  }

  const visaApplications = students.map(student => {
    const visaApp = student.applications.find(app => 
      ["USA", "UK", "Canada", "Australia", "New Zealand"].includes(app.university.country)
    )
    
    if (!visaApp) return null

    // Determine visa status based on pipeline stages and documents
    let visaStatus = "PENDING"
    const pipelineStages = visaApp.pipelineEntries.map(entry => entry.pipeline.name)
    
    if (pipelineStages.includes("Visa Approved")) {
      visaStatus = "VISA_APPROVED"
    } else if (pipelineStages.includes("Visa Rejected")) {
      visaStatus = "VISA_REJECTED"
    } else if (pipelineStages.includes("Interview Scheduled")) {
      visaStatus = "INTERVIEW_SCHEDULED"
    } else if (pipelineStages.includes("Biometrics Completed")) {
      visaStatus = "BIOMETRICS_COMPLETED"
    } else if (pipelineStages.includes("Visa Application Submitted")) {
      visaStatus = "VISA_APPLICATION_SUBMITTED"
    } else if (student.documents?.length > 0) {
      visaStatus = "DOCUMENT_COLLECTION"
    }

    visaStatuses[visaStatus as keyof typeof visaStatuses]++

    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      university: visaApp.university.name,
      country: visaApp.university.country,
      visaStatus,
      applicationDate: visaApp.createdAt,
      daysInProcess: Math.floor(
        (new Date().getTime() - new Date(visaApp.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )
    }
  }).filter(Boolean)

  return NextResponse.json({
    type: "VISA_PROCESS",
    generatedAt: new Date(),
    filters,
    summary: {
      totalVisaApplications: visaApplications.length,
      approvalRate: visaStatuses.VISA_APPROVED / visaApplications.length * 100,
      rejectionRate: visaStatuses.VISA_REJECTED / visaApplications.length * 100,
      averageProcessingDays: visaApplications.reduce((sum, app) => sum + app.daysInProcess, 0) / visaApplications.length
    },
    statusBreakdown: visaStatuses,
    applications: visaApplications,
    recommendations: generateVisaRecommendations(visaStatuses, visaApplications)
  })
}

async function generateProcessEfficiencyReport(agency: any, filters: any) {
  const where: any = {
    agencyId: agency.id
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate)
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate)
    }
  }

  // Get all pipeline entries
  const pipelineEntries = await db.pipelineEntry.findMany({
    where,
    include: {
      pipeline: true,
      application: {
        include: {
          student: true
        }
      },
      assignedTo: true
    }
  })

  // Calculate efficiency metrics
  const consultantStats = pipelineEntries.reduce((acc: any, entry) => {
    const consultantId = entry.assignedTo?.id || "unassigned"
    if (!acc[consultantId]) {
      acc[consultantId] = {
        consultantName: entry.assignedTo?.name || "Unassigned",
        totalEntries: 0,
        completedEntries: 0,
        averageDaysPerStage: 0,
        totalDays: 0
      }
    }
    
    acc[consultantId].totalEntries++
    acc[consultantId].totalDays += Math.floor(
      (new Date().getTime() - new Date(entry.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (entry.pipeline.name.includes("Completed") || entry.pipeline.name.includes("Approved")) {
      acc[consultantId].completedEntries++
    }
    
    return acc
  }, {})

  // Calculate averages
  Object.keys(consultantStats).forEach(consultantId => {
    const stats = consultantStats[consultantId]
    stats.averageDaysPerStage = stats.totalEntries > 0 ? 
      Math.round(stats.totalDays / stats.totalEntries) : 0
    stats.completionRate = stats.totalEntries > 0 ? 
      (stats.completedEntries / stats.totalEntries * 100).toFixed(1) : 0
  })

  // Calculate overall efficiency
  const totalEntries = pipelineEntries.length
  const completedEntries = pipelineEntries.filter(entry => 
    entry.pipeline.name.includes("Completed") || entry.pipeline.name.includes("Approved")
  ).length

  return NextResponse.json({
    type: "PROCESS_EFFICIENCY",
    generatedAt: new Date(),
    filters,
    summary: {
      totalEntries,
      completedEntries,
      overallCompletionRate: totalEntries > 0 ? (completedEntries / totalEntries * 100).toFixed(1) : 0,
      averageDaysPerStage: totalEntries > 0 ? 
        Math.round(pipelineEntries.reduce((sum, entry) => 
          sum + Math.floor((new Date().getTime() - new Date(entry.createdAt).getTime()) / (1000 * 60 * 60 * 24)), 0) / totalEntries
        ) : 0
    },
    consultantPerformance: consultantStats,
    recommendations: generateEfficiencyRecommendations(consultantStats)
  })
}

function generateVisaRecommendations(statuses: any, applications: any[]) {
  const recommendations = []
  
  if (statuses.DOCUMENT_COLLECTION > 0) {
    recommendations.push({
      priority: "HIGH",
      issue: "Document Collection Bottleneck",
      recommendation: "Implement automated document collection system with checklist reminders"
    })
  }
  
  if (statuses.INTERVIEW_SCHEDULED > 0) {
    recommendations.push({
      priority: "MEDIUM",
      issue: "Interview Preparation Needed",
      recommendation: "Create interview preparation materials and schedule mock interviews"
    })
  }
  
  const avgProcessingDays = applications.reduce((sum, app) => sum + app.daysInProcess, 0) / applications.length
  if (avgProcessingDays > 60) {
    recommendations.push({
      priority: "HIGH",
      issue: "Long Processing Times",
      recommendation: "Review and optimize visa application workflow, consider premium processing options"
    })
  }
  
  return recommendations
}

function generateEfficiencyRecommendations(consultantStats: any) {
  const recommendations = []
  const consultantList = Object.values(consultantStats) as any[]
  
  const avgCompletionRate = consultantList.reduce((sum, consultant) => 
    sum + parseFloat(consultant.completionRate), 0) / consultantList.length
  
  const underperformingConsultants = consultantList.filter(consultant => 
    parseFloat(consultant.completionRate) < avgCompletionRate - 20
  )
  
  if (underperformingConsultants.length > 0) {
    recommendations.push({
      priority: "MEDIUM",
      issue: "Underperforming Consultants",
      recommendation: `Provide additional training for: ${underperformingConsultants.map(c => c.consultantName).join(", ")}`
    })
  }
  
  const slowConsultants = consultantList.filter(consultant => 
    consultant.averageDaysPerStage > 30
  )
  
  if (slowConsultants.length > 0) {
    recommendations.push({
      priority: "HIGH",
      issue: "Slow Processing Times",
      recommendation: `Review workload and processes for: ${slowConsultants.map(c => c.consultantName).join(", ")}`
    })
  }
  
  return recommendations
}