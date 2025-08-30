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
    const includeUnavailable = searchParams.get("includeUnavailable") === "true"

    const agency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 })
    }

    // Get all consultants
    const consultants = await db.user.findMany({
      where: {
        agencyId: agency.id,
        role: "CONSULTANT",
        status: "ACTIVE"
      },
      include: {
        assignedTasks: {
          where: {
            status: {
              in: ["PENDING", "IN_PROGRESS"]
            }
          }
        },
        assignedLeads: {
          where: {
            status: {
              in: ["NEW", "CONTACTED", "QUALIFIED", "NURTURING"]
            }
          }
        },
        appointments: {
          where: {
            status: {
              in: ["SCHEDULED", "CONFIRMED"]
            },
            startTime: {
              gte: new Date()
            }
          }
        }
      }
    })

    // Calculate availability and load for each consultant
    const consultantData = await Promise.all(
      consultants.map(async (consultant) => {
        const availability = await calculateConsultantAvailability(consultant)
        const load = await calculateConsultantLoad(consultant)
        
        return {
          id: consultant.id,
          name: consultant.name,
          email: consultant.email,
          title: consultant.title,
          department: consultant.department,
          phone: consultant.phone,
          avatar: consultant.avatar,
          availability,
          load,
          stats: {
            activeTasks: consultant.assignedTasks.length,
            activeLeads: consultant.assignedLeads.length,
            upcomingAppointments: consultant.appointments.length
          },
          lastActivity: consultant.updatedAt
        }
      })
    )

    // Filter by availability if requested
    const filteredConsultants = includeUnavailable 
      ? consultantData 
      : consultantData.filter(c => c.availability.isAvailable)

    // Sort by availability and load
    filteredConsultants.sort((a, b) => {
      // Available consultants come first
      if (a.availability.isAvailable && !b.availability.isAvailable) return -1
      if (!a.availability.isAvailable && b.availability.isAvailable) return 1
      
      // Then sort by load (ascending)
      return a.load.score - b.load.score
    })

    return NextResponse.json({
      consultants: filteredConsultants,
      summary: {
        total: consultants.length,
        available: consultantData.filter(c => c.availability.isAvailable).length,
        unavailable: consultantData.filter(c => !c.availability.isAvailable).length,
        averageLoad: consultantData.reduce((sum, c) => sum + c.load.score, 0) / consultantData.length
      }
    })
  } catch (error) {
    console.error("Error fetching consultant availability:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to calculate consultant availability
async function calculateConsultantAvailability(consultant: any): Promise<any> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  // Check today's appointments
  const todayAppointments = consultant.appointments.filter((apt: any) => {
    const aptDate = new Date(apt.startTime)
    return aptDate >= today && aptDate < tomorrow
  })

  // Check working hours (simplified - 9 AM to 6 PM)
  const currentHour = now.getHours()
  const isWorkingHours = currentHour >= 9 && currentHour < 18
  const isWeekday = now.getDay() >= 1 && now.getDay() <= 5

  // Calculate availability score
  let availabilityScore = 100
  
  // Reduce score based on appointments today
  availabilityScore -= todayAppointments.length * 15
  
  // Reduce score based on current load
  const currentLoad = consultant.assignedTasks.length + consultant.assignedLeads.length
  availabilityScore -= currentLoad * 5
  
  // Check if consultant is at capacity
  const maxDailyAppointments = 8
  const maxConcurrentLoad = 30
  
  const isAtCapacity = todayAppointments.length >= maxDailyAppointments || currentLoad >= maxConcurrentLoad
  
  // Determine availability status
  let status = "AVAILABLE"
  if (isAtCapacity) {
    status = "UNAVAILABLE"
  } else if (availabilityScore < 50) {
    status = "LIMITED"
  } else if (!isWorkingHours || !isWeekday) {
    status = "OFF_HOURS"
  }

  return {
    isAvailable: status === "AVAILABLE",
    status,
    score: Math.max(0, availabilityScore),
    reasons: {
      appointmentsToday: todayAppointments.length,
      currentLoad,
      isWorkingHours,
      isWeekday,
      isAtCapacity
    },
    nextAvailable: await calculateNextAvailableTime(consultant)
  }
}

// Helper function to calculate consultant load
async function calculateConsultantLoad(consultant: any): Promise<any> {
  const activeTasks = consultant.assignedTasks.length
  const activeLeads = consultant.assignedLeads.length
  const upcomingAppointments = consultant.appointments.length
  
  // Calculate weighted load score
  const taskWeight = 2
  const leadWeight = 1
  const appointmentWeight = 3
  
  const loadScore = (activeTasks * taskWeight) + (activeLeads * leadWeight) + (upcomingAppointments * appointmentWeight)
  
  // Determine load level
  let loadLevel = "LOW"
  if (loadScore > 60) {
    loadLevel = "HIGH"
  } else if (loadScore > 30) {
    loadLevel = "MEDIUM"
  }
  
  // Calculate capacity percentage
  const maxCapacity = 100
  const capacityPercentage = Math.min(100, (loadScore / maxCapacity) * 100)
  
  return {
    score: loadScore,
    level: loadLevel,
    capacityPercentage: Math.round(capacityPercentage),
    breakdown: {
      activeTasks,
      activeLeads,
      upcomingAppointments
    }
  }
}

// Helper function to calculate next available time
async function calculateNextAvailableTime(consultant: any): Promise<string | null> {
  const now = new Date()
  
  // Get today's appointments
  const todayAppointments = consultant.appointments
    .filter((apt: any) => {
      const aptDate = new Date(apt.startTime)
      return aptDate.toDateString() === now.toDateString()
    })
    .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  
  // Find the first gap in appointments
  for (let i = 0; i < todayAppointments.length - 1; i++) {
    const currentEnd = new Date(todayAppointments[i].endTime)
    const nextStart = new Date(todayAppointments[i + 1].startTime)
    
    const gap = nextStart.getTime() - currentEnd.getTime()
    
    // If there's a gap of at least 30 minutes
    if (gap >= 30 * 60 * 1000) {
      return currentEnd.toISOString()
    }
  }
  
  // If no gap found today, check tomorrow
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  tomorrow.setHours(9, 0, 0, 0) // Start of working day
  
  return tomorrow.toISOString()
}