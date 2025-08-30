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
    const reportType = searchParams.get("type") || "LEAD_CONVERSION_OVERVIEW"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const source = searchParams.get("source")
    const consultantId = searchParams.get("consultantId")

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    switch (reportType) {
      case "LEAD_CONVERSION_OVERVIEW":
        return await generateLeadConversionOverviewReport(agency, {
          startDate,
          endDate,
          source,
          consultantId
        })
      
      case "CHANNEL_PERFORMANCE":
        return await generateChannelPerformanceReport(agency, {
          startDate,
          endDate
        })
      
      case "CONVERSION_FUNNEL":
        return await generateConversionFunnelReport(agency, {
          startDate,
          endDate,
          source
        })
      
      case "ROI_ANALYSIS":
        return await generateROIAnalysisReport(agency, {
          startDate,
          endDate
        })
      
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error generating lead conversion report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function generateLeadConversionOverviewReport(agency: any, filters: any) {
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

  if (filters.source) {
    where.source = filters.source
  }

  if (filters.consultantId) {
    where.assignedTo = filters.consultantId
  }

  // Get all leads
  const leads = await db.lead.findMany({
    where,
    include: {
      student: true,
      campaign: true,
      assignedTo: true,
      formSubmissions: true
    },
    orderBy: { createdAt: "desc" }
  })

  // Calculate conversion metrics
  const totalLeads = leads.length
  const convertedLeads = leads.filter(lead => lead.converted)
  const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads * 100) : 0

  // Analyze by source
  const sourceStats = leads.reduce((acc: any, lead) => {
    const source = lead.source || "UNKNOWN"
    if (!acc[source]) {
      acc[source] = {
        total: 0,
        converted: 0,
        leads: []
      }
    }
    acc[source].total++
    acc[source].leads.push(lead)
    if (lead.converted) {
      acc[source].converted++
    }
    return acc
  }, {})

  // Calculate conversion rates by source
  Object.keys(sourceStats).forEach(source => {
    const stats = sourceStats[source]
    stats.conversionRate = stats.total > 0 ? (stats.converted / stats.total * 100) : 0
  })

  // Analyze by month
  const monthlyStats = leads.reduce((acc: any, lead) => {
    const month = new Date(lead.createdAt).toISOString().slice(0, 7)
    if (!acc[month]) {
      acc[month] = { total: 0, converted: 0 }
    }
    acc[month].total++
    if (lead.converted) {
      acc[month].converted++
    }
    return acc
  }, {})

  // Calculate monthly conversion rates
  Object.keys(monthlyStats).forEach(month => {
    const stats = monthlyStats[month]
    stats.conversionRate = stats.total > 0 ? (stats.converted / stats.total * 100) : 0
  })

  // Time to convert analysis
  const conversionTimes = convertedLeads
    .filter(lead => lead.convertedAt && lead.createdAt)
    .map(lead => {
      const days = Math.floor(
        (new Date(lead.convertedAt!).getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      return days
    })

  const averageConversionTime = conversionTimes.length > 0 ? 
    conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length : 0

  return NextResponse.json({
    type: "LEAD_CONVERSION_OVERVIEW",
    generatedAt: new Date(),
    filters,
    summary: {
      totalLeads,
      convertedLeads: convertedLeads.length,
      conversionRate: conversionRate.toFixed(2),
      averageConversionTime: averageConversionTime.toFixed(1)
    },
    sourceBreakdown: sourceStats,
    monthlyTrends: monthlyStats,
    topPerformingSources: Object.entries(sourceStats)
      .sort(([,a]: any, [,b]: any) => b.conversionRate - a.conversionRate)
      .slice(0, 5)
      .map(([source, stats]: any) => ({
        source,
        conversionRate: stats.conversionRate.toFixed(2),
        totalLeads: stats.total
      }))
  })
}

async function generateChannelPerformanceReport(agency: any, filters: any) {
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

  // Get leads with campaign data
  const leads = await db.lead.findMany({
    where,
    include: {
      campaign: true,
      student: true
    }
  })

  // Get marketing campaigns
  const campaigns = await db.marketingCampaign.findMany({
    where: {
      agencyId: agency.id,
      ...(filters.startDate || filters.endDate ? {
        createdAt: {}
      } : {})
    },
    include: {
      leads: true
    }
  })

  // Apply date filters to campaigns if specified
  if (filters.startDate) {
    campaigns.forEach(campaign => {
      if (campaign.createdAt < new Date(filters.startDate)) {
        campaigns.splice(campaigns.indexOf(campaign), 1)
      }
    })
  }

  if (filters.endDate) {
    campaigns.forEach(campaign => {
      if (campaign.createdAt > new Date(filters.endDate)) {
        campaigns.splice(campaigns.indexOf(campaign), 1)
      }
    })
  }

  // Analyze channel performance
  const channelStats = {}

  // Organic leads (no campaign)
  const organicLeads = leads.filter(lead => !lead.campaignId)
  if (organicLeads.length > 0) {
    channelStats["ORGANIC"] = {
      leads: organicLeads.length,
      converted: organicLeads.filter(l => l.converted).length,
      cost: 0,
      revenue: 0,
      campaign: null
    }
  }

  // Campaign-based leads
  for (const campaign of campaigns) {
    const campaignLeads = leads.filter(lead => lead.campaignId === campaign.id)
    const converted = campaignLeads.filter(l => l.converted)
    
    // Estimate revenue from converted leads
    const students = converted.map(l => l.student).filter(Boolean)
    const estimatedRevenue = students.length * 1000 // Placeholder - in real app, calculate from actual invoices

    channelStats[campaign.name] = {
      leads: campaignLeads.length,
      converted: converted.length,
      cost: campaign.budget || 0,
      spent: campaign.spent || 0,
      revenue: estimatedRevenue,
      campaign: {
        id: campaign.id,
        type: campaign.type,
        status: campaign.status
      }
    }
  }

  // Calculate metrics for each channel
  Object.keys(channelStats).forEach(channel => {
    const stats = channelStats[channel]
    stats.conversionRate = stats.leads > 0 ? (stats.converted / stats.leads * 100) : 0
    stats.costPerLead = stats.leads > 0 ? stats.cost / stats.leads : 0
    stats.costPerAcquisition = stats.converted > 0 ? stats.cost / stats.converted : 0
    stats.roi = stats.cost > 0 ? ((stats.revenue - stats.cost) / stats.cost * 100) : 0
  })

  // Find best and worst performing channels
  const channelsArray = Object.entries(channelStats).map(([channel, stats]: any) => ({
    channel,
    ...stats
  }))

  const bestByConversion = channelsArray.sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 3)
  const bestByROI = channelsArray.filter(c => c.roi > 0).sort((a, b) => b.roi - a.roi).slice(0, 3)

  return NextResponse.json({
    type: "CHANNEL_PERFORMANCE",
    generatedAt: new Date(),
    filters,
    summary: {
      totalChannels: Object.keys(channelStats).length,
      totalLeads: channelsArray.reduce((sum, c) => sum + c.leads, 0),
      totalConverted: channelsArray.reduce((sum, c) => sum + c.converted, 0),
      averageConversionRate: channelsArray.length > 0 ? 
        channelsArray.reduce((sum, c) => sum + c.conversionRate, 0) / channelsArray.length : 0,
      totalCost: channelsArray.reduce((sum, c) => sum + c.cost, 0),
      totalRevenue: channelsArray.reduce((sum, c) => sum + c.revenue, 0)
    },
    channelPerformance: channelStats,
    topPerformers: {
      byConversionRate: bestByConversion,
      byROI: bestByROI
    }
  })
}

async function generateConversionFunnelReport(agency: any, filters: any) {
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

  if (filters.source) {
    where.source = filters.source
  }

  // Get all leads
  const leads = await db.lead.findMany({
    where,
    include: {
      student: true,
      applications: {
        include: {
          pipelineEntries: {
            include: {
              pipeline: true
            }
          }
        }
      }
    }
  })

  // Define funnel stages
  const funnelStages = [
    { name: "LEAD_CAPTURED", description: "Initial lead captured" },
    { name: "CONTACTED", description: "Lead contacted by team" },
    { name: "CONSULTATION_SCHEDULED", description: "Consultation meeting scheduled" },
    { name: "APPLICATION_STARTED", description: "Application process started" },
    { name: "APPLICATION_SUBMITTED", description: "Application submitted to university" },
    { name: "OFFER_RECEIVED", description: "Offer received from university" },
    { name: "VISA_APPROVED", description: "Visa approved" },
    { name: "ENROLLED", description: "Student enrolled" }
  ]

  // Calculate funnel metrics
  const funnelData = funnelStages.map(stage => {
    let count = 0

    switch (stage.name) {
      case "LEAD_CAPTURED":
        count = leads.length
        break
      
      case "CONTACTED":
        count = leads.filter(lead => 
          lead.formSubmissions.length > 0 || lead.assignedTo
        ).length
        break
      
      case "CONSULTATION_SCHEDULED":
        count = leads.filter(lead => 
          lead.student?.appointments?.length > 0
        ).length
        break
      
      case "APPLICATION_STARTED":
        count = leads.filter(lead => 
          lead.student?.applications?.length > 0
        ).length
        break
      
      case "APPLICATION_SUBMITTED":
        count = leads.filter(lead => 
          lead.student?.applications?.some(app => 
            app.status === "SUBMITTED"
          )
        ).length
        break
      
      case "OFFER_RECEIVED":
        count = leads.filter(lead => 
          lead.student?.applications?.some(app => 
            app.pipelineEntries?.some(entry => 
              entry.pipeline.name.toLowerCase().includes("offer")
            )
          )
        ).length
        break
      
      case "VISA_APPROVED":
        count = leads.filter(lead => 
          lead.student?.applications?.some(app => 
            app.pipelineEntries?.some(entry => 
              entry.pipeline.name.toLowerCase().includes("visa approved")
            )
          )
        ).length
        break
      
      case "ENROLLED":
        count = leads.filter(lead => 
          lead.student?.applications?.some(app => 
            app.pipelineEntries?.some(entry => 
              entry.pipeline.name.toLowerCase().includes("enrolled") ||
              entry.pipeline.name.toLowerCase().includes("completed")
            )
          )
        ).length
        break
    }

    return {
      stage: stage.name,
      description: stage.description,
      count,
      conversionRate: 0 // Will be calculated below
    }
  })

  // Calculate conversion rates between stages
  const totalLeads = funnelData[0].count
  funnelData.forEach((stage, index) => {
    if (totalLeads > 0) {
      stage.conversionRate = (stage.count / totalLeads * 100)
    }
  })

  // Calculate drop-off rates
  const dropOffData = []
  for (let i = 0; i < funnelData.length - 1; i++) {
    const current = funnelData[i]
    const next = funnelData[i + 1]
    const dropOff = current.count - next.count
    const dropOffRate = current.count > 0 ? (dropOff / current.count * 100) : 0

    dropOffData.push({
      fromStage: current.stage,
      toStage: next.stage,
      dropOff,
      dropOffRate: dropOffRate.toFixed(2)
    })
  }

  return NextResponse.json({
    type: "CONVERSION_FUNNEL",
    generatedAt: new Date(),
    filters,
    summary: {
      totalLeads: funnelData[0].count,
      finalConversions: funnelData[funnelData.length - 1].count,
      overallConversionRate: totalLeads > 0 ? 
        (funnelData[funnelData.length - 1].count / totalLeads * 100) : 0,
      averageDropOffRate: dropOffData.length > 0 ? 
        dropOffData.reduce((sum, d) => sum + parseFloat(d.dropOffRate), 0) / dropOffData.length : 0
    },
    funnelData,
    dropOffAnalysis: dropOffData,
    biggestDropOffs: dropOffData
      .sort((a, b) => parseFloat(b.dropOffRate) - parseFloat(a.dropOffRate))
      .slice(0, 3)
  })
}

async function generateROIAnalysisReport(agency: any, filters: any) {
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

  // Get marketing campaigns
  const campaigns = await db.marketingCampaign.findMany({
    where,
    include: {
      leads: {
        include: {
          student: true
        }
      }
    }
  })

  // Get leads and their conversion data
  const allLeads = await db.lead.findMany({
    where,
    include: {
      student: {
        include: {
          invoices: {
            include: {
              transactions: true
            }
          }
        }
      },
      campaign: true
    }
  })

  // Calculate ROI for each campaign
  const campaignROI = []

  for (const campaign of campaigns) {
    const campaignLeads = allLeads.filter(lead => lead.campaignId === campaign.id)
    const convertedLeads = campaignLeads.filter(lead => lead.converted)
    
    // Calculate actual revenue from converted leads
    const students = convertedLeads.map(lead => lead.student).filter(Boolean)
    const revenue = students.reduce((sum, student) => {
      const transactions = student.invoices?.flatMap(inv => inv.transactions).filter(t => t.status === "COMPLETED") || []
      return sum + transactions.reduce((transSum, trans) => transSum + trans.amount, 0)
    }, 0)

    const cost = campaign.budget || 0
    const spent = campaign.spent || 0
    const profit = revenue - spent
    const roi = spent > 0 ? (profit / spent * 100) : 0

    campaignROI.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      campaignType: campaign.type,
      budget: cost,
      spent,
      leads: campaignLeads.length,
      convertedLeads: convertedLeads.length,
      conversionRate: campaignLeads.length > 0 ? (convertedLeads.length / campaignLeads.length * 100) : 0,
      revenue,
      profit,
      roi: roi.toFixed(2)
    })
  }

  // Calculate overall ROI
  const totalBudget = campaignROI.reduce((sum, c) => sum + c.budget, 0)
  const totalSpent = campaignROI.reduce((sum, c) => sum + c.spent, 0)
  const totalRevenue = campaignROI.reduce((sum, c) => sum + c.revenue, 0)
  const totalProfit = totalRevenue - totalSpent
  const overallROI = totalSpent > 0 ? (totalProfit / totalSpent * 100) : 0

  // Analyze by campaign type
  const typeROI = campaignROI.reduce((acc: any, campaign) => {
    const type = campaign.campaignType
    if (!acc[type]) {
      acc[type] = {
        totalBudget: 0,
        totalSpent: 0,
        totalRevenue: 0,
        campaigns: []
      }
    }
    acc[type].totalBudget += campaign.budget
    acc[type].totalSpent += campaign.spent
    acc[type].totalRevenue += campaign.revenue
    acc[type].campaigns.push(campaign)
    return acc
  }, {})

  // Calculate ROI for each type
  Object.keys(typeROI).forEach(type => {
    const stats = typeROI[type]
    stats.profit = stats.totalRevenue - stats.totalSpent
    stats.roi = stats.totalSpent > 0 ? (stats.profit / stats.totalSpent * 100) : 0
    stats.averageROI = stats.campaigns.length > 0 ? 
      stats.campaigns.reduce((sum, c) => sum + parseFloat(c.roi), 0) / stats.campaigns.length : 0
  })

  return NextResponse.json({
    type: "ROI_ANALYSIS",
    generatedAt: new Date(),
    filters,
    summary: {
      totalCampaigns: campaigns.length,
      totalBudget,
      totalSpent,
      totalRevenue,
      totalProfit,
      overallROI: overallROI.toFixed(2)
    },
    campaignROI,
    typeAnalysis: typeROI,
    bestPerformingCampaigns: campaignROI
      .sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi))
      .slice(0, 5),
    recommendations: generateROIRecommendations(campaignROI, typeROI)
  })
}

// Helper function to generate ROI recommendations
function generateROIRecommendations(campaignROI: any[], typeROI: any) {
  const recommendations = []
  
  // Find underperforming campaigns
  const underperforming = campaignROI.filter(c => parseFloat(c.roi) < 50)
  if (underperforming.length > 0) {
    recommendations.push({
      priority: "HIGH",
      issue: "Low ROI Campaigns",
      recommendation: `Review and optimize ${underperforming.length} underperforming campaigns with ROI < 50%`
    })
  }
  
  // Find best performing campaign types
  const bestTypes = Object.entries(typeROI)
    .sort(([,a]: any, [,b]: any) => b.roi - a.roi)
    .slice(0, 2)
  
  if (bestTypes.length > 0) {
    recommendations.push({
      priority: "MEDIUM",
      issue: "Investment Opportunity",
      recommendation: `Consider increasing budget for high-performing campaign types: ${bestTypes.map(([type]: any) => type).join(", ")}`
    })
  }
  
  // Check budget utilization
  const totalBudget = campaignROI.reduce((sum, c) => sum + c.budget, 0)
  const totalSpent = campaignROI.reduce((sum, c) => sum + c.spent, 0)
  const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget * 100) : 0
  
  if (utilizationRate < 70) {
    recommendations.push({
      priority: "LOW",
      issue: "Low Budget Utilization",
      recommendation: "Consider reallocating unused budget to better-performing campaigns"
    })
  }
  
  return recommendations
}