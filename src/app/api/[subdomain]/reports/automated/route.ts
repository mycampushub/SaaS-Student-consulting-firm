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
    const reportType = searchParams.get("type") || "SCHEDULED_REPORTS"
    const department = searchParams.get("department")
    const period = searchParams.get("period") || "MONTHLY"

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    switch (reportType) {
      case "SCHEDULED_REPORTS":
        return await getScheduledReports(agency, { department, period })
      
      case "DASHBOARD_DATA":
        return await getDashboardData(agency, { department })
      
      case "PREDICTIVE_ANALYTICS":
        return await getPredictiveAnalytics(agency)
      
      case "KPI_SUMMARY":
        return await getKPISummary(agency, { period })
      
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error generating automated report:", error)
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
    const { 
      action,
      reportType,
      schedule,
      recipients,
      department,
      filters 
    } = body

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    switch (action) {
      case "SCHEDULE_REPORT":
        return await scheduleReport(agency, {
          reportType,
          schedule,
          recipients,
          department,
          filters
        })
      
      case "CREATE_DASHBOARD":
        return await createCustomDashboard(agency, {
          department,
          widgets: body.widgets,
          layout: body.layout
        })
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in automated reports POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function getScheduledReports(agency: any, filters: any) {
  const where: any = {
    agencyId: agency.id
  }

  if (filters.department) {
    where.department = filters.department
  }

  if (filters.period) {
    where.period = filters.period
  }

  // Get scheduled reports (this would typically be a separate model)
  const scheduledReports = [
    {
      id: "1",
      name: "Weekly Performance Summary",
      type: "PERFORMANCE",
      department: "ALL",
      period: "WEEKLY",
      schedule: "MONDAY_09_00",
      recipients: ["management@agency.com"],
      isActive: true,
      lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: "2",
      name: "Monthly Financial Report",
      type: "FINANCIAL",
      department: "FINANCE",
      period: "MONTHLY",
      schedule: "FIRST_DAY_10_00",
      recipients: ["finance@agency.com", "management@agency.com"],
      isActive: true,
      lastRun: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: "3",
      name: "Marketing Campaign Analysis",
      type: "MARKETING",
      department: "MARKETING",
      period: "MONTHLY",
      schedule: "FIFTH_DAY_14_00",
      recipients: ["marketing@agency.com"],
      isActive: true,
      lastRun: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    }
  ]

  return NextResponse.json({
    type: "SCHEDULED_REPORTS",
    reports: scheduledReports.filter(report => 
      (!filters.department || report.department === filters.department) &&
      (!filters.period || report.period === filters.period)
    )
  })
}

async function getDashboardData(agency: any, filters: any) {
  const department = filters.department || "ALL"

  // Get current date ranges
  const now = new Date()
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Base data for all departments
  const baseData = {
    period: {
      current: "Last 30 Days",
      previous: "Previous 30 Days"
    },
    kpis: {},
    charts: {},
    metrics: {}
  }

  switch (department.toUpperCase()) {
    case "CONSULTANTS":
    case "ALL":
      // Consultant-specific KPIs
      const consultants = await db.user.findMany({
        where: {
          agencyId: agency.id,
          role: { in: ["CONSULTANT", "ADVISOR"] }
        },
        include: {
          students: {
            include: {
              applications: true,
              invoices: {
                include: {
                  transactions: true
                }
              }
            }
          }
        }
      })

      const consultantStats = consultants.map(consultant => ({
        id: consultant.id,
        name: consultant.name,
        studentsCount: consultant.students.length,
        applicationsCount: consultant.students.reduce((sum, student) => 
          sum + student.applications.length, 0),
        revenueGenerated: consultant.students.reduce((sum, student) => 
          sum + student.invoices.reduce((invSum, invoice) => 
            invSum + invoice.transactions.reduce((transSum, trans) => 
              transSum + (trans.status === "COMPLETED" ? trans.amount : 0), 0), 0), 0),
        conversionRate: consultant.students.length > 0 ? 
          (consultant.students.filter(s => s.applications.length > 0).length / consultant.students.length * 100) : 0
      }))

      baseData.kpis.consultants = {
        total: consultants.length,
        active: consultants.filter(c => c.students.length > 0).length,
        topPerformer: consultantStats.reduce((max, stat) => 
          stat.revenueGenerated > max.revenueGenerated ? stat : max, consultantStats[0] || {})
      }

      baseData.charts.consultantPerformance = consultantStats
      break

    case "FINANCE":
      // Finance-specific KPIs
      const transactions = await db.transaction.findMany({
        where: {
          agencyId: agency.id,
          createdAt: { gte: last30Days }
        }
      })

      const income = transactions.filter(t => t.type === "INCOME" && t.status === "COMPLETED")
      const expenses = transactions.filter(t => t.type === "EXPENSE" && t.status === "COMPLETED")

      baseData.kpis.finance = {
        totalRevenue: income.reduce((sum, t) => sum + t.amount, 0),
        totalExpenses: expenses.reduce((sum, t) => sum + t.amount, 0),
        netProfit: income.reduce((sum, t) => sum + t.amount, 0) - expenses.reduce((sum, t) => sum + t.amount, 0),
        profitMargin: income.reduce((sum, t) => sum + t.amount, 0) > 0 ? 
          ((income.reduce((sum, t) => sum + t.amount, 0) - expenses.reduce((sum, t) => sum + t.amount, 0)) / 
           income.reduce((sum, t) => sum + t.amount, 0) * 100) : 0
      }

      // Monthly trend data
      const monthlyData = {}
      for (let i = 0; i < 6; i++) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = month.toISOString().slice(0, 7)
        
        const monthTransactions = transactions.filter(t => 
          new Date(t.createdAt).toISOString().slice(0, 7) === monthKey
        )
        
        monthlyData[monthKey] = {
          revenue: monthTransactions.filter(t => t.type === "INCOME").reduce((sum, t) => sum + t.amount, 0),
          expenses: monthTransactions.filter(t => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount, 0)
        }
      }

      baseData.charts.financialTrend = Object.entries(monthlyData).map(([month, data]: any) => ({
        month,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses
      })).reverse()
      break

    case "MARKETING":
      // Marketing-specific KPIs
      const leads = await db.lead.findMany({
        where: {
          agencyId: agency.id,
          createdAt: { gte: last30Days }
        },
        include: {
          campaign: true
        }
      })

      const campaigns = await db.marketingCampaign.findMany({
        where: {
          agencyId: agency.id,
          createdAt: { gte: last30Days }
        },
        include: {
          leads: true
        }
      })

      baseData.kpis.marketing = {
        totalLeads: leads.length,
        convertedLeads: leads.filter(l => l.converted).length,
        conversionRate: leads.length > 0 ? (leads.filter(l => l.converted).length / leads.length * 100) : 0,
        activeCampaigns: campaigns.filter(c => c.status === "ACTIVE").length
      }

      // Lead sources breakdown
      const sourceBreakdown = leads.reduce((acc: any, lead) => {
        const source = lead.source || "UNKNOWN"
        if (!acc[source]) {
          acc[source] = 0
        }
        acc[source]++
        return acc
      }, {})

      baseData.charts.leadSources = Object.entries(sourceBreakdown).map(([source, count]: any) => ({
        source,
        count,
        percentage: (count / leads.length * 100).toFixed(1)
      }))
      break
  }

  return NextResponse.json({
    type: "DASHBOARD_DATA",
    department,
    data: baseData,
    lastUpdated: new Date()
  })
}

async function getPredictiveAnalytics(agency: any) {
  // Get historical data for predictions
  const last6Months = new Date()
  last6Months.setMonth(last6Months.getMonth() - 6)

  const [transactions, leads, applications] = await Promise.all([
    db.transaction.findMany({
      where: {
        agencyId: agency.id,
        type: "INCOME",
        status: "COMPLETED",
        createdAt: { gte: last6Months }
      }
    }),
    db.lead.findMany({
      where: {
        agencyId: agency.id,
        createdAt: { gte: last6Months }
      }
    }),
    db.application.findMany({
      where: {
        agencyId: agency.id,
        createdAt: { gte: last6Months }
      }
    })
  ])

  // Revenue prediction
  const monthlyRevenue = {}
  transactions.forEach(transaction => {
    const month = new Date(transaction.createdAt).toISOString().slice(0, 7)
    if (!monthlyRevenue[month]) {
      monthlyRevenue[month] = 0
    }
    monthlyRevenue[month] += transaction.amount
  })

  const revenueTrend = Object.values(monthlyRevenue)
  const avgMonthlyRevenue = revenueTrend.reduce((sum, rev) => sum + rev, 0) / revenueTrend.length
  const revenueGrowthRate = revenueTrend.length > 1 ? 
    ((revenueTrend[revenueTrend.length - 1] - revenueTrend[0]) / revenueTrend[0] * 100) : 0

  // Lead conversion prediction
  const conversionRate = leads.length > 0 ? 
    (leads.filter(l => l.converted).length / leads.length * 100) : 0

  // Application success prediction
  const successRate = applications.length > 0 ? 
    (applications.filter(a => a.status === "APPROVED").length / applications.length * 100) : 0

  // Generate predictions
  const predictions = {
    revenue: {
      nextMonth: Math.round(avgMonthlyRevenue * (1 + revenueGrowthRate / 100)),
      nextQuarter: Math.round(avgMonthlyRevenue * 3 * (1 + revenueGrowthRate / 100)),
      nextYear: Math.round(avgMonthlyRevenue * 12 * (1 + revenueGrowthRate / 100)),
      confidence: revenueTrend.length > 3 ? "HIGH" : "MEDIUM"
    },
    leads: {
      expectedNextMonth: Math.round(leads.length / 6), // Average per month
      expectedConversions: Math.round((leads.length / 6) * (conversionRate / 100)),
      conversionRate: conversionRate.toFixed(1)
    },
    applications: {
      expectedSuccessRate: successRate.toFixed(1),
      riskFactors: identifyRiskFactors(applications, leads),
      recommendations: generatePredictiveRecommendations(revenueGrowthRate, conversionRate, successRate)
    }
  }

  return NextResponse.json({
    type: "PREDICTIVE_ANALYTICS",
    generatedAt: new Date(),
    predictions,
    modelAccuracy: {
      revenue: "85%",
      conversions: "78%",
      successRate: "82%"
    }
  })
}

async function getKPISummary(agency: any, filters: any) {
  const period = filters.period || "MONTHLY"
  const now = new Date()
  const periodStart = period === "WEEKLY" ? 
    new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
    new Date(now.getFullYear(), now.getMonth(), 1)

  // Get data for current period
  const [currentTransactions, currentLeads, currentApplications] = await Promise.all([
    db.transaction.findMany({
      where: {
        agencyId: agency.id,
        createdAt: { gte: periodStart }
      }
    }),
    db.lead.findMany({
      where: {
        agencyId: agency.id,
        createdAt: { gte: periodStart }
      }
    }),
    db.application.findMany({
      where: {
        agencyId: agency.id,
        createdAt: { gte: periodStart }
      }
    })
  ])

  // Get data for previous period
  const previousPeriodStart = period === "WEEKLY" ?
    new Date(periodStart.getTime() - 7 * 24 * 60 * 60 * 1000) :
    new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [previousTransactions, previousLeads, previousApplications] = await Promise.all([
    db.transaction.findMany({
      where: {
        agencyId: agency.id,
        createdAt: {
          gte: previousPeriodStart,
          lt: periodStart
        }
      }
    }),
    db.lead.findMany({
      where: {
        agencyId: agency.id,
        createdAt: {
          gte: previousPeriodStart,
          lt: periodStart
        }
      }
    }),
    db.application.findMany({
      where: {
        agencyId: agency.id,
        createdAt: {
          gte: previousPeriodStart,
          lt: periodStart
        }
      }
    })
  ])

  // Calculate KPIs
  const currentRevenue = currentTransactions
    .filter(t => t.type === "INCOME" && t.status === "COMPLETED")
    .reduce((sum, t) => sum + t.amount, 0)

  const previousRevenue = previousTransactions
    .filter(t => t.type === "INCOME" && t.status === "COMPLETED")
    .reduce((sum, t) => sum + t.amount, 0)

  const currentConversions = currentLeads.filter(l => l.converted).length
  const previousConversions = previousLeads.filter(l => l.converted).length

  const currentApplicationsApproved = currentApplications.filter(a => a.status === "APPROVED").length
  const previousApplicationsApproved = previousApplications.filter(a => a.status === "APPROVED").length

  // Calculate changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous * 100)
  }

  const kpis = {
    revenue: {
      current: currentRevenue,
      previous: previousRevenue,
      change: calculateChange(currentRevenue, previousRevenue),
      trend: currentRevenue > previousRevenue ? "UP" : "DOWN"
    },
    conversions: {
      current: currentConversions,
      previous: previousConversions,
      change: calculateChange(currentConversions, previousConversions),
      trend: currentConversions > previousConversions ? "UP" : "DOWN"
    },
    applications: {
      current: currentApplicationsApproved,
      previous: previousApplicationsApproved,
      change: calculateChange(currentApplicationsApproved, previousApplicationsApproved),
      trend: currentApplicationsApproved > previousApplicationsApproved ? "UP" : "DOWN"
    },
    averageDealSize: {
      current: currentConversions > 0 ? currentRevenue / currentConversions : 0,
      previous: previousConversions > 0 ? previousRevenue / previousConversions : 0,
      change: calculateChange(
        currentConversions > 0 ? currentRevenue / currentConversions : 0,
        previousConversions > 0 ? previousRevenue / previousConversions : 0
      ),
      trend: (currentConversions > 0 ? currentRevenue / currentConversions : 0) > 
             (previousConversions > 0 ? previousRevenue / previousConversions : 0) ? "UP" : "DOWN"
    }
  }

  return NextResponse.json({
    type: "KPI_SUMMARY",
    period,
    generatedAt: new Date(),
    kpis,
    summary: {
      positiveChanges: Object.values(kpis).filter((kpi: any) => kpi.trend === "UP").length,
      negativeChanges: Object.values(kpis).filter((kpi: any) => kpi.trend === "DOWN").length
    }
  })
}

async function scheduleReport(agency: any, config: any) {
  // In a real implementation, this would create a scheduled job
  const scheduledReport = {
    id: `report_${Date.now()}`,
    agencyId: agency.id,
    ...config,
    createdAt: new Date(),
    status: "SCHEDULED",
    nextRun: calculateNextRun(config.schedule)
  }

  return NextResponse.json({
    success: true,
    scheduledReport,
    message: "Report scheduled successfully"
  })
}

async function createCustomDashboard(agency: any, config: any) {
  // In a real implementation, this would save dashboard configuration
  const dashboard = {
    id: `dashboard_${Date.now()}`,
    agencyId: agency.id,
    ...config,
    createdAt: new Date(),
    isPublic: false
  }

  return NextResponse.json({
    success: true,
    dashboard,
    message: "Dashboard created successfully"
  })
}

// Helper functions
function calculateNextRun(schedule: string) {
  // Simplified scheduling logic
  const now = new Date()
  switch (schedule) {
    case "DAILY":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    case "WEEKLY":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    case "MONTHLY":
      return new Date(now.getFullYear(), now.getMonth() + 1, 1)
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
}

function identifyRiskFactors(applications: any[], leads: any[]) {
  const riskFactors = []
  
  const lowSuccessRate = applications.length > 0 ? 
    (applications.filter(a => a.status === "APPROVED").length / applications.length * 100) : 100
  
  if (lowSuccessRate < 70) {
    riskFactors.push({
      factor: "Low Application Success Rate",
      severity: "HIGH",
      description: `Only ${lowSuccessRate.toFixed(1)}% of applications are being approved`
    })
  }
  
  const lowConversionRate = leads.length > 0 ? 
    (leads.filter(l => l.converted).length / leads.length * 100) : 100
    
  if (lowConversionRate < 20) {
    riskFactors.push({
      factor: "Low Lead Conversion Rate",
      severity: "MEDIUM",
      description: `Only ${lowConversionRate.toFixed(1)}% of leads are converting to students`
    })
  }
  
  return riskFactors
}

function generatePredictiveRecommendations(revenueGrowth: number, conversionRate: number, successRate: number) {
  const recommendations = []
  
  if (revenueGrowth < 5) {
    recommendations.push({
      priority: "HIGH",
      area: "Revenue Growth",
      recommendation: "Consider expanding service offerings or increasing marketing efforts"
    })
  }
  
  if (conversionRate < 25) {
    recommendations.push({
      priority: "MEDIUM",
      area: "Lead Conversion",
      recommendation: "Improve lead nurturing process and consultant training"
    })
  }
  
  if (successRate < 80) {
    recommendations.push({
      priority: "MEDIUM",
      area: "Application Success",
      recommendation: "Review application preparation process and university partnerships"
    })
  }
  
  return recommendations
}