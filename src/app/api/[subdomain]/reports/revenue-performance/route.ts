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
    const reportType = searchParams.get("type") || "REVENUE_OVERVIEW"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const consultantId = searchParams.get("consultantId")
    const serviceType = searchParams.get("serviceType")

    const agency = await db.agency.findUnique({
      where: { subdomain },
      include: { accounting: true }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    switch (reportType) {
      case "REVENUE_OVERVIEW":
        return await generateRevenueOverviewReport(agency, {
          startDate,
          endDate,
          serviceType
        })
      
      case "CONSULTANT_PERFORMANCE":
        return await generateConsultantPerformanceReport(agency, {
          startDate,
          endDate,
          consultantId
        })
      
      case "PROFIT_ANALYSIS":
        return await generateProfitAnalysisReport(agency, {
          startDate,
          endDate
        })
      
      case "SERVICE_TYPE_REVENUE":
        return await generateServiceTypeRevenueReport(agency, {
          startDate,
          endDate
        })
      
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error generating revenue report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function generateRevenueOverviewReport(agency: any, filters: any) {
  const where: any = {
    agencyId: agency.id,
    type: "INCOME",
    status: "COMPLETED"
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

  // Get all income transactions
  const transactions = await db.transaction.findMany({
    where,
    include: {
      invoice: {
        include: {
          student: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  // Calculate revenue by month
  const monthlyRevenue = transactions.reduce((acc: any, transaction) => {
    const month = new Date(transaction.createdAt).toISOString().slice(0, 7) // YYYY-MM
    if (!acc[month]) {
      acc[month] = 0
    }
    acc[month] += transaction.amount
    return acc
  }, {})

  // Calculate revenue by service type (based on invoice items)
  const serviceTypeRevenue = {}
  for (const transaction of transactions) {
    if (transaction.invoice) {
      const items = JSON.parse(transaction.invoice.items || "[]")
      for (const item of items) {
        const category = item.category || "OTHER"
        if (!serviceTypeRevenue[category]) {
          serviceTypeRevenue[category] = 0
        }
        serviceTypeRevenue[category] += item.amount
      }
    }
  }

  // Calculate growth metrics
  const months = Object.keys(monthlyRevenue).sort()
  let totalGrowth = 0
  if (months.length > 1) {
    const currentMonth = monthlyRevenue[months[months.length - 1]]
    const previousMonth = monthlyRevenue[months[months.length - 2]]
    totalGrowth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth * 100) : 0
  }

  return NextResponse.json({
    type: "REVENUE_OVERVIEW",
    generatedAt: new Date(),
    filters,
    summary: {
      totalRevenue: transactions.reduce((sum, t) => sum + t.amount, 0),
      transactionCount: transactions.length,
      averageTransactionValue: transactions.length > 0 ? 
        transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length : 0,
      monthlyGrowth: totalGrowth.toFixed(2)
    },
    monthlyBreakdown: monthlyRevenue,
    serviceTypeBreakdown: serviceTypeRevenue,
    recentTransactions: transactions.slice(0, 10)
  })
}

async function generateConsultantPerformanceReport(agency: any, filters: any) {
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

  // Get all users (consultants)
  const consultants = await db.user.findMany({
    where: {
      agencyId: agency.id,
      role: { in: ["AGENCY_ADMIN", "CONSULTANT", "ADVISOR"] }
    }
  })

  // Get students assigned to consultants
  const students = await db.student.findMany({
    where,
    include: {
      applications: {
        include: {
          university: true,
          pipelineEntries: {
            include: {
              pipeline: true
            }
          }
        }
      },
      invoices: {
        include: {
          transactions: true
        }
      }
    }
  })

  // Calculate performance metrics for each consultant
  const consultantStats = {}
  
  for (const consultant of consultants) {
    const consultantStudents = students.filter(s => s.assignedTo === consultant.id)
    
    const totalStudents = consultantStudents.length
    const applications = consultantStudents.flatMap(s => s.applications)
    const totalApplications = applications.length
    
    // Calculate successful applications
    const successfulApplications = applications.filter(app => 
      app.pipelineEntries.some(entry => 
        entry.pipeline.name.toLowerCase().includes("approved") || 
        entry.pipeline.name.toLowerCase().includes("completed")
      )
    ).length

    // Calculate revenue generated
    const invoices = consultantStudents.flatMap(s => s.invoices)
    const transactions = invoices.flatMap(inv => inv.transactions).filter(t => t.status === "COMPLETED")
    const revenueGenerated = transactions.reduce((sum, t) => sum + t.amount, 0)

    // Calculate success rate
    const successRate = totalApplications > 0 ? (successfulApplications / totalApplications * 100) : 0

    consultantStats[consultant.id] = {
      consultantName: consultant.name,
      consultantEmail: consultant.email,
      totalStudents,
      totalApplications,
      successfulApplications,
      successRate: successRate.toFixed(1),
      revenueGenerated,
      averageRevenuePerStudent: totalStudents > 0 ? revenueGenerated / totalStudents : 0
    }
  }

  // Find top performers
  const statsArray = Object.values(consultantStats) as any[]
  const topByRevenue = statsArray.sort((a, b) => b.revenueGenerated - a.revenueGenerated).slice(0, 5)
  const topBySuccessRate = statsArray.sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate)).slice(0, 5)

  return NextResponse.json({
    type: "CONSULTANT_PERFORMANCE",
    generatedAt: new Date(),
    filters,
    summary: {
      totalConsultants: consultants.length,
      totalRevenue: statsArray.reduce((sum, stat) => sum + stat.revenueGenerated, 0),
      averageSuccessRate: statsArray.length > 0 ? 
        statsArray.reduce((sum, stat) => sum + parseFloat(stat.successRate), 0) / statsArray.length : 0,
      averageRevenuePerConsultant: statsArray.length > 0 ? 
        statsArray.reduce((sum, stat) => sum + stat.revenueGenerated, 0) / statsArray.length : 0
    },
    consultantPerformance: consultantStats,
    topPerformers: {
      byRevenue: topByRevenue,
      bySuccessRate: topBySuccessRate
    }
  })
}

async function generateProfitAnalysisReport(agency: any, filters: any) {
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

  // Get all transactions
  const transactions = await db.transaction.findMany({
    where,
    include: {
      invoice: true
    }
  })

  // Separate income and expenses
  const income = transactions.filter(t => t.type === "INCOME" && t.status === "COMPLETED")
  const expenses = transactions.filter(t => t.type === "EXPENSE" && t.status === "COMPLETED")

  const totalRevenue = income.reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0

  // Analyze expenses by category
  const expenseCategories = expenses.reduce((acc: any, expense) => {
    const category = expense.description?.split(" ")[0] || "OTHER"
    if (!acc[category]) {
      acc[category] = { amount: 0, count: 0 }
    }
    acc[category].amount += expense.amount
    acc[category].count += 1
    return acc
  }, {})

  // Calculate monthly trends
  const monthlyData = {}
  const allTransactions = [...income, ...expenses]
  
  for (const transaction of allTransactions) {
    const month = new Date(transaction.createdAt).toISOString().slice(0, 7)
    if (!monthlyData[month]) {
      monthlyData[month] = { revenue: 0, expenses: 0 }
    }
    
    if (transaction.type === "INCOME") {
      monthlyData[month].revenue += transaction.amount
    } else {
      monthlyData[month].expenses += transaction.amount
    }
  }

  // Calculate monthly profits
  const monthlyProfits = Object.entries(monthlyData).map(([month, data]: any) => ({
    month,
    revenue: data.revenue,
    expenses: data.expenses,
    profit: data.revenue - data.expenses,
    profitMargin: data.revenue > 0 ? ((data.revenue - data.expenses) / data.revenue * 100) : 0
  }))

  return NextResponse.json({
    type: "PROFIT_ANALYSIS",
    generatedAt: new Date(),
    filters,
    summary: {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: profitMargin.toFixed(2),
      totalTransactions: transactions.length
    },
    expenseBreakdown: expenseCategories,
    monthlyTrends: monthlyProfits,
    recommendations: generateProfitRecommendations(totalRevenue, totalExpenses, profitMargin, expenseCategories)
  })
}

async function generateServiceTypeRevenueReport(agency: any, filters: any) {
  const where: any = {
    agencyId: agency.id,
    type: "INCOME",
    status: "COMPLETED"
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

  // Get transactions with invoice details
  const transactions = await db.transaction.findMany({
    where,
    include: {
      invoice: {
        include: {
          student: true
        }
      }
    }
  })

  // Analyze revenue by service type based on invoice items
  const serviceTypeStats = {}
  const studentCategoryStats = {}

  for (const transaction of transactions) {
    if (transaction.invoice) {
      const items = JSON.parse(transaction.invoice.items || "[]")
      
      // Service type analysis
      for (const item of items) {
        const serviceType = item.category || "OTHER"
        if (!serviceTypeStats[serviceType]) {
          serviceTypeStats[serviceType] = {
            revenue: 0,
            count: 0,
            transactions: []
          }
        }
        serviceTypeStats[serviceType].revenue += item.amount
        serviceTypeStats[serviceType].count += 1
        serviceTypeStats[serviceType].transactions.push({
          id: transaction.id,
          amount: item.amount,
          date: transaction.createdAt,
          studentName: `${transaction.invoice.student.firstName} ${transaction.invoice.student.lastName}`
        })
      }

      // Student category analysis (based on budget/preferences)
      const student = transaction.invoice.student
      const category = getStudentCategory(student)
      if (!studentCategoryStats[category]) {
        studentCategoryStats[category] = {
          revenue: 0,
          count: 0,
          students: new Set()
        }
      }
      studentCategoryStats[category].revenue += transaction.amount
      studentCategoryStats[category].count += 1
      studentCategoryStats[category].students.add(student.id)
    }
  }

  // Convert Set to count for student categories
  Object.keys(studentCategoryStats).forEach(category => {
    const stats = studentCategoryStats[category]
    stats.studentCount = stats.students.size
    delete stats.students
  })

  // Calculate top performing service types
  const serviceTypesArray = Object.entries(serviceTypeStats).map(([type, stats]: any) => ({
    type,
    revenue: stats.revenue,
    count: stats.count,
    averageRevenue: stats.revenue / stats.count
  }))

  const topServiceTypes = serviceTypesArray.sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  return NextResponse.json({
    type: "SERVICE_TYPE_REVENUE",
    generatedAt: new Date(),
    filters,
    summary: {
      totalRevenue: transactions.reduce((sum, t) => sum + t.amount, 0),
      totalTransactions: transactions.length,
      serviceTypesCount: Object.keys(serviceTypeStats).length,
      studentCategoriesCount: Object.keys(studentCategoryStats).length
    },
    serviceTypeBreakdown: serviceTypeStats,
    studentCategoryBreakdown: studentCategoryStats,
    topServiceTypes
  })
}

// Helper function to categorize students
function getStudentCategory(student: any) {
  if (student.budget) {
    if (student.budget >= 50000) return "HIGH_BUDGET"
    if (student.budget >= 20000) return "MEDIUM_BUDGET"
    return "LOW_BUDGET"
  }
  
  if (student.preferredCountries) {
    const countries = JSON.parse(student.preferredCountries || "[]")
    if (countries.includes("USA") || countries.includes("UK")) {
      return "PREMIUM_DESTINATION"
    }
  }
  
  return "STANDARD"
}

// Helper function to generate profit recommendations
function generateProfitRecommendations(revenue: number, expenses: number, margin: number, expenseCategories: any) {
  const recommendations = []
  
  if (margin < 20) {
    recommendations.push({
      priority: "HIGH",
      issue: "Low Profit Margin",
      recommendation: "Review pricing strategy and identify opportunities to increase revenue or reduce costs"
    })
  }
  
  if (expenses > revenue * 0.8) {
    recommendations.push({
      priority: "MEDIUM",
      issue: "High Expense Ratio",
      recommendation: "Analyze expense categories and identify areas for cost optimization"
    })
  }
  
  const topExpenseCategory = Object.entries(expenseCategories)
    .sort(([,a]: any, [,b]: any) => b.amount - a.amount)[0]
  
  if (topExpenseCategory) {
    const [category, stats]: any = topExpenseCategory
    if (stats.amount > expenses * 0.5) {
      recommendations.push({
        priority: "MEDIUM",
        issue: `High ${category} Expenses`,
        recommendation: `Review ${category.toLowerCase()} expenses and explore cost-saving alternatives`
      })
    }
  }
  
  return recommendations
}