import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSubdomain } from "@/lib/utils"
import { z } from "zod"

const distributeLeadSchema = z.object({
  leadId: z.string(),
  distributionMethod: z.enum(["ROUND_ROBIN", "LOAD_BALANCED", "BASED_ON_EXPERTISE", "MANUAL"]),
  preferredConsultantId: z.string().optional(),
  criteria: z.any().optional()
})

const manualAssignmentSchema = z.object({
  leadId: z.string(),
  consultantId: z.string(),
  reason: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const subdomain = getSubdomain(request)
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain required" }, { status: 400 })
    }

    const body = await request.json()
    
    // Check if this is a manual assignment or automatic distribution
    if (body.consultantId && body.leadId) {
      const validatedData = manualAssignmentSchema.parse(body)
      return await handleManualAssignment(subdomain, validatedData)
    } else {
      const validatedData = distributeLeadSchema.parse(body)
      return await handleAutomaticDistribution(subdomain, validatedData)
    }
  } catch (error) {
    console.error("Error in lead distribution:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handleManualAssignment(subdomain: string, data: any) {
  const agency = await db.agency.findUnique({
    where: { subdomain }
  })

  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 })
  }

  // Validate lead exists and belongs to agency
  const lead = await db.lead.findFirst({
    where: {
      id: data.leadId,
      agencyId: agency.id
    }
  })

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  // Validate consultant exists and belongs to agency
  const consultant = await db.user.findFirst({
    where: {
      id: data.consultantId,
      agencyId: agency.id,
      role: "CONSULTANT",
      status: "ACTIVE"
    }
  })

  if (!consultant) {
    return NextResponse.json({ error: "Consultant not found or inactive" }, { status: 404 })
  }

  // Check if consultant is available
  const isAvailable = await checkConsultantAvailability(consultant.id)
  if (!isAvailable) {
    return NextResponse.json({ error: "Consultant is not available for new assignments" }, { status: 400 })
  }

  // Assign lead to consultant
  const updatedLead = await db.lead.update({
    where: { id: data.leadId },
    data: {
      assignedTo: data.consultantId
    },
    include: {
      consultant: true,
      campaign: true,
      formSubmissions: true
    }
  })

  // Create notification for consultant
  await db.notification.create({
    data: {
      agencyId: agency.id,
      type: "INFO",
      title: "New Lead Assigned",
      message: `A new lead has been assigned to you`,
      recipientId: data.consultantId,
      recipientType: "USER",
      channel: "IN_APP",
      status: "PENDING",
      priority: "HIGH",
      data: JSON.stringify({
        leadId: data.leadId,
        assignmentType: "MANUAL",
        reason: data.reason || "Manual assignment"
      })
    }
  })

  // Create follow-up task for consultant
  await db.task.create({
    data: {
      agencyId: agency.id,
      title: "Follow up with new lead",
      description: `Contact the newly assigned lead within 24 hours`,
      type: "FOLLOW_UP",
      category: "LEAD",
      assignedTo: data.consultantId,
      leadId: data.leadId,
      status: "PENDING",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
      metadata: JSON.stringify({
        assignmentType: "MANUAL",
        reason: data.reason || "Manual assignment"
      })
    }
  })

  return NextResponse.json({
    success: true,
    lead: updatedLead,
    assignment: {
      consultantId: data.consultantId,
      consultantName: consultant.name,
      method: "MANUAL",
      reason: data.reason || "Manual assignment",
      assignedAt: new Date().toISOString()
    }
  })
}

async function handleAutomaticDistribution(subdomain: string, data: any) {
  const agency = await db.agency.findUnique({
    where: { subdomain }
  })

  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 })
  }

  // Validate lead exists and belongs to agency
  const lead = await db.lead.findFirst({
    where: {
      id: data.leadId,
      agencyId: agency.id
    }
  })

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  // Get available consultants
  const consultants = await db.user.findMany({
    where: {
      agencyId: agency.id,
      role: "CONSULTANT",
      status: "ACTIVE"
    }
  })

  if (consultants.length === 0) {
    return NextResponse.json({ error: "No available consultants found" }, { status: 404 })
  }

  // Filter available consultants
  const availableConsultants = []
  for (const consultant of consultants) {
    const isAvailable = await checkConsultantAvailability(consultant.id)
    if (isAvailable) {
      const currentLoad = await getConsultantCurrentLoad(consultant.id)
      availableConsultants.push({
        ...consultant,
        currentLoad
      })
    }
  }

  if (availableConsultants.length === 0) {
    return NextResponse.json({ error: "No consultants are currently available" }, { status: 400 })
  }

  // Select consultant based on distribution method
  let selectedConsultant = null
  
  switch (data.distributionMethod) {
    case "ROUND_ROBIN":
      selectedConsultant = await selectByRoundRobin(agency.id, availableConsultants)
      break
    case "LOAD_BALANCED":
      selectedConsultant = await selectByLoadBalancing(availableConsultants)
      break
    case "BASED_ON_EXPERTISE":
      selectedConsultant = await selectByExpertise(availableConsultants, lead, data.criteria)
      break
    case "MANUAL":
      if (data.preferredConsultantId) {
        selectedConsultant = availableConsultants.find(c => c.id === data.preferredConsultantId)
      }
      break
    default:
      selectedConsultant = await selectByRoundRobin(agency.id, availableConsultants)
  }

  if (!selectedConsultant) {
    return NextResponse.json({ error: "Could not select a suitable consultant" }, { status: 400 })
  }

  // Assign lead to selected consultant
  const updatedLead = await db.lead.update({
    where: { id: data.leadId },
    data: {
      assignedTo: selectedConsultant.id
    },
    include: {
      consultant: true,
      campaign: true,
      formSubmissions: true
    }
  })

  // Update round-robin counter
  await updateRoundRobinCounter(agency.id, selectedConsultant.id)

  // Create notification for consultant
  await db.notification.create({
    data: {
      agencyId: agency.id,
      type: "INFO",
      title: "New Lead Assigned",
      message: `A new lead has been automatically assigned to you`,
      recipientId: selectedConsultant.id,
      recipientType: "USER",
      channel: "IN_APP",
      status: "PENDING",
      priority: "HIGH",
      data: JSON.stringify({
        leadId: data.leadId,
        assignmentType: "AUTOMATIC",
        method: data.distributionMethod
      })
    }
  })

  // Create follow-up task for consultant
  await db.task.create({
    data: {
      agencyId: agency.id,
      title: "Follow up with new lead",
      description: `Contact the newly assigned lead within 24 hours`,
      type: "FOLLOW_UP",
      category: "LEAD",
      assignedTo: selectedConsultant.id,
      leadId: data.leadId,
      status: "PENDING",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
      metadata: JSON.stringify({
        assignmentType: "AUTOMATIC",
        method: data.distributionMethod
      })
    }
  })

  return NextResponse.json({
    success: true,
    lead: updatedLead,
    assignment: {
      consultantId: selectedConsultant.id,
      consultantName: selectedConsultant.name,
      method: data.distributionMethod,
      assignedAt: new Date().toISOString(),
      currentLoad: selectedConsultant.currentLoad
    }
  })
}

// Helper function to check consultant availability
async function checkConsultantAvailability(consultantId: string): Promise<boolean> {
  // Check if consultant has too many active tasks
  const activeTasksCount = await db.task.count({
    where: {
      assignedTo: consultantId,
      status: {
        in: ["PENDING", "IN_PROGRESS"]
      },
      dueDate: {
        gte: new Date()
      }
    }
  })

  // Check if consultant has too many active leads
  const activeLeadsCount = await db.lead.count({
    where: {
      assignedTo: consultantId,
      status: {
        in: ["NEW", "CONTACTED", "QUALIFIED", "NURTURING"]
      }
    }
  })

  // Define thresholds (these could be configurable per agency)
  const maxActiveTasks = 20
  const maxActiveLeads = 50

  return activeTasksCount < maxActiveTasks && activeLeadsCount < maxActiveLeads
}

// Helper function to get consultant's current load
async function getConsultantCurrentLoad(consultantId: string): Promise<number> {
  const activeTasksCount = await db.task.count({
    where: {
      assignedTo: consultantId,
      status: {
        in: ["PENDING", "IN_PROGRESS"]
      }
    }
  })

  const activeLeadsCount = await db.lead.count({
    where: {
      assignedTo: consultantId,
      status: {
        in: ["NEW", "CONTACTED", "QUALIFIED", "NURTURING"]
      }
    }
  })

  // Calculate load score (weighted sum)
  const loadScore = (activeTasksCount * 2) + activeLeadsCount
  return loadScore
}

// Helper function to select consultant by round-robin
async function selectByRoundRobin(agencyId: string, consultants: any[]): Promise<any> {
  // Get or create round-robin counter for agency
  let counter = await db.agency.findUnique({
    where: { id: agencyId },
    select: { id: true }
  })

  // For simplicity, we'll use a timestamp-based selection
  // In a real implementation, you'd store and update a counter
  const timestamp = Date.now()
  const index = timestamp % consultants.length
  
  return consultants[index]
}

// Helper function to select consultant by load balancing
async function selectByLoadBalancing(consultants: any[]): Promise<any> {
  // Sort by current load (ascending)
  consultants.sort((a, b) => a.currentLoad - b.currentLoad)
  
  // Return the consultant with the lowest load
  return consultants[0]
}

// Helper function to select consultant by expertise
async function selectByExpertise(consultants: any[], lead: any, criteria?: any): Promise<any> {
  // For this example, we'll use simple matching based on lead source and consultant department/title
  const availableConsultants = []
  
  for (const consultant of consultants) {
    let matchScore = 0
    
    // Check if consultant's department/title matches lead source
    if (lead.source && consultant.department) {
      if (lead.source.toLowerCase().includes(consultant.department.toLowerCase())) {
        matchScore += 3
      }
    }
    
    // Check if consultant's title matches lead criteria
    if (criteria && criteria.preferredSpecialization && consultant.title) {
      if (consultant.title.toLowerCase().includes(criteria.preferredSpecialization.toLowerCase())) {
        matchScore += 5
      }
    }
    
    // Check consultant's current load (lower load is better)
    const loadPenalty = Math.floor(consultant.currentLoad / 10)
    matchScore = Math.max(0, matchScore - loadPenalty)
    
    if (matchScore > 0) {
      availableConsultants.push({
        ...consultant,
        matchScore
      })
    }
  }
  
  if (availableConsultants.length === 0) {
    // Fallback to load balancing if no expertise match
    return await selectByLoadBalancing(consultants)
  }
  
  // Sort by match score (descending)
  availableConsultants.sort((a, b) => b.matchScore - a.matchScore)
  
  return availableConsultants[0]
}

// Helper function to update round-robin counter
async function updateRoundRobinCounter(agencyId: string, consultantId: string): Promise<void> {
  // In a real implementation, you would update a counter stored in the database
  // For this example, we'll just log the assignment
  console.log(`Lead assigned to consultant ${consultantId} for agency ${agencyId}`)
}