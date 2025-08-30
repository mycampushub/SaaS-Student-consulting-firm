import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const settingsSchema = z.object({
  distributionMethod: z.enum(["ROUND_ROBIN", "LOAD_BALANCED", "BASED_ON_EXPERTISE", "MANUAL"]),
  maxActiveTasks: z.number().int().min(1).max(100).optional(),
  maxActiveLeads: z.number().int().min(1).max(200).optional(),
  maxDailyAppointments: z.number().int().min(1).max(20).optional(),
  workingHours: z.object({
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timezone: z.string().default("UTC")
  }).optional(),
  autoAssignment: z.boolean().optional(),
  roundRobinSettings: z.object({
    includeUnavailable: z.boolean().default(false),
    resetFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("DAILY")
  }).optional(),
  loadBalancingSettings: z.object({
    taskWeight: z.number().min(0).max(10).default(2),
    leadWeight: z.number().min(0).max(10).default(1),
    appointmentWeight: z.number().min(0).max(10).default(3)
  }).optional(),
  expertiseSettings: z.object({
    enableDepartmentMatching: z.boolean().default(true),
    enableTitleMatching: z.boolean().default(true),
    customCriteria: z.array(z.any()).optional()
  }).optional()
})

export async function GET(request: NextRequest) {
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

    // Get distribution settings (stored in brand settings or a separate settings table)
    // For this example, we'll use default settings
    const settings = {
      distributionMethod: "ROUND_ROBIN",
      maxActiveTasks: 20,
      maxActiveLeads: 50,
      maxDailyAppointments: 8,
      workingHours: {
        start: "09:00",
        end: "18:00",
        timezone: "UTC"
      },
      autoAssignment: true,
      roundRobinSettings: {
        includeUnavailable: false,
        resetFrequency: "DAILY"
      },
      loadBalancingSettings: {
        taskWeight: 2,
        leadWeight: 1,
        appointmentWeight: 3
      },
      expertiseSettings: {
        enableDepartmentMatching: true,
        enableTitleMatching: true,
        customCriteria: []
      }
    }

    // Get distribution statistics
    const stats = await getDistributionStatistics(agency.id)

    return NextResponse.json({
      settings,
      stats,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error fetching distribution settings:", error)
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
    const validatedData = settingsSchema.parse(body)

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // In a real implementation, you would save these settings to the database
    // For this example, we'll just return the updated settings
    const updatedSettings = {
      ...validatedData,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: "Distribution settings updated successfully"
    })
  } catch (error) {
    console.error("Error updating distribution settings:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get distribution statistics
async function getDistributionStatistics(agencyId: string): Promise<any> {
  // Get all consultants
  const consultants = await db.user.findMany({
    where: {
      agencyId: agencyId,
      role: "CONSULTANT",
      status: "ACTIVE"
    }
  })

  // Get all leads
  const leads = await db.lead.findMany({
    where: {
      agencyId: agencyId
    }
  })

  // Get all tasks
  const tasks = await db.task.findMany({
    where: {
      agencyId: agencyId
    }
  })

  // Calculate statistics
  const totalConsultants = consultants.length
  const totalLeads = leads.length
  const totalTasks = tasks.length

  // Assignment statistics
  const assignedLeads = leads.filter(lead => lead.assignedTo).length
  const unassignedLeads = totalLeads - assignedLeads

  // Load distribution
  const consultantLoads = await Promise.all(
    consultants.map(async (consultant) => {
      const consultantLeads = leads.filter(lead => lead.assignedTo === consultant.id).length
      const consultantTasks = tasks.filter(task => task.assignedTo === consultant.id).length
      
      return {
        consultantId: consultant.id,
        consultantName: consultant.name,
        leads: consultantLeads,
        tasks: consultantTasks,
        totalLoad: consultantLeads + consultantTasks
      }
    })
  )

  // Calculate distribution metrics
  const averageLoad = totalConsultants > 0 ? consultantLoads.reduce((sum, c) => sum + c.totalLoad, 0) / totalConsultants : 0
  const maxLoad = Math.max(...consultantLoads.map(c => c.totalLoad))
  const minLoad = Math.min(...consultantLoads.map(c => c.totalLoad))
  const loadVariance = maxLoad - minLoad

  // Assignment efficiency
  const assignmentRate = totalLeads > 0 ? (assignedLeads / totalLeads) * 100 : 0

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentLeads = leads.filter(lead => new Date(lead.createdAt) >= sevenDaysAgo).length
  const recentAssignments = leads.filter(lead => 
    lead.assignedTo && new Date(lead.updatedAt) >= sevenDaysAgo
  ).length

  return {
    overview: {
      totalConsultants,
      totalLeads,
      totalTasks,
      assignedLeads,
      unassignedLeads,
      assignmentRate: Math.round(assignmentRate * 100) / 100
    },
    loadDistribution: {
      averageLoad: Math.round(averageLoad * 100) / 100,
      maxLoad,
      minLoad,
      loadVariance,
      consultantLoads
    },
    recentActivity: {
      recentLeads,
      recentAssignments,
      assignmentRateRecent: recentLeads > 0 ? (recentAssignments / recentLeads) * 100 : 0
    },
    efficiency: {
      loadBalance: loadVariance === 0 ? 100 : Math.max(0, 100 - (loadVariance / averageLoad) * 100),
      assignmentEfficiency: assignmentRate,
      consultantUtilization: totalConsultants > 0 ? (consultantLoads.filter(c => c.totalLoad > 0).length / totalConsultants) * 100 : 0
    }
  }
}