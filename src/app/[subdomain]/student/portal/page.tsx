"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Calendar, FileText, MessageSquare, Bell, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: string
  currentEducation: string
  gpa?: number
  nationality: string
  country: string
}

interface Application {
  id: string
  university: string
  program: string
  status: string
  submittedAt: string
  updatedAt: string
  progress: number
  documents: Document[]
  pipelineEntries: PipelineEntry[]
}

interface Document {
  id: string
  name: string
  category: string
  type: string
  status: string
  uploadedAt: string
  fileSize: number
  fileUrl: string
}

interface PipelineEntry {
  id: string
  pipeline: {
    name: string
    type: string
  }
  currentStage: string
  progress: number
  enteredAt: string
  movedAt?: string
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  readAt?: string
  priority: string
}

interface Message {
  id: string
  message: string
  channel: string
  direction: string
  createdAt: string
  readAt?: string
}

interface Appointment {
  id: string
  title: string
  type: string
  startTime: string
  endTime: string
  status: string
  location?: string
  virtualMeetingUrl?: string
}

export default function StudentPortal() {
  const [student, setStudent] = useState<Student | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchStudentData()
  }, [])

  const fetchStudentData = async () => {
    try {
      // In a real implementation, this would fetch from the API
      // For now, we'll use mock data
      const mockStudent: Student = {
        id: "1",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1234567890",
        status: "ACTIVE",
        currentEducation: "Bachelor's Degree",
        gpa: 3.8,
        nationality: "United States",
        country: "United States"
      }

      const mockApplications: Application[] = [
        {
          id: "1",
          university: "Harvard University",
          program: "Computer Science",
          status: "UNDER_REVIEW",
          submittedAt: "2024-01-15",
          updatedAt: "2024-01-20",
          progress: 65,
          documents: [
            {
              id: "1",
              name: "Transcript",
              category: "ACADEMIC",
              type: "PDF",
              status: "APPROVED",
              uploadedAt: "2024-01-10",
              fileSize: 2048000,
              fileUrl: "/files/transcript.pdf"
            },
            {
              id: "2",
              name: "Personal Statement",
              category: "PERSONAL",
              type: "PDF",
              status: "PENDING",
              uploadedAt: "2024-01-12",
              fileSize: 1024000,
              fileUrl: "/files/statement.pdf"
            }
          ],
          pipelineEntries: [
            {
              id: "1",
              pipeline: {
                name: "Application Process",
                type: "APPLICATION_PROCESSING"
              },
              currentStage: "Document Review",
              progress: 0.65,
              enteredAt: "2024-01-15",
              movedAt: "2024-01-18"
            }
          ]
        }
      ]

      const mockNotifications: Notification[] = [
        {
          id: "1",
          type: "INFO",
          title: "Document Approved",
          message: "Your transcript has been approved",
          createdAt: "2024-01-18T10:00:00Z",
          priority: "MEDIUM"
        },
        {
          id: "2",
          type: "TASK",
          title: "Missing Document",
          message: "Please upload your recommendation letter",
          createdAt: "2024-01-17T14:30:00Z",
          priority: "HIGH"
        }
      ]

      const mockMessages: Message[] = [
        {
          id: "1",
          message: "Your application is under review. We'll update you soon.",
          channel: "EMAIL",
          direction: "INBOUND",
          createdAt: "2024-01-16T09:00:00Z"
        }
      ]

      const mockAppointments: Appointment[] = [
        {
          id: "1",
          title: "Application Review Meeting",
          type: "CONSULTATION",
          startTime: "2024-01-25T14:00:00Z",
          endTime: "2024-01-25T15:00:00Z",
          status: "SCHEDULED",
          virtualMeetingUrl: "https://meet.example.com/john-doe"
        }
      ]

      setStudent(mockStudent)
      setApplications(mockApplications)
      setNotifications(mockNotifications)
      setMessages(mockMessages)
      setAppointments(mockAppointments)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load student data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "approved":
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
      case "under_review":
        return "bg-yellow-100 text-yellow-800"
      case "rejected":
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "approved":
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "pending":
      case "under_review":
        return <Clock className="h-4 w-4" />
      case "rejected":
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const unreadNotifications = notifications.filter(n => !n.readAt).length
  const unreadMessages = messages.filter(m => !m.readAt && m.direction === "INBOUND").length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Portal</h1>
          <p className="text-gray-600">
            Welcome back, {student?.firstName} {student?.lastName}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Bell className="h-6 w-6" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </div>
          <div className="relative">
            <MessageSquare className="h-6 w-6" />
            {unreadMessages > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Student Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Overview</CardTitle>
          <CardDescription>Your academic profile and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Status</p>
              <Badge className={getStatusColor(student?.status || "")}>
                {getStatusIcon(student?.status || "")}
                <span className="ml-2">{student?.status}</span>
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Education</p>
              <p className="font-medium">{student?.currentEducation}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">GPA</p>
              <p className="font-medium">{student?.gpa || "N/A"}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Nationality</p>
              <p className="font-medium">{student?.nationality}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {applications.map((application) => (
              <Card key={application.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{application.university}</CardTitle>
                      <CardDescription>{application.program}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(application.status)}>
                      {application.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Application Progress</span>
                      <span>{Math.round(application.progress * 100)}%</span>
                    </div>
                    <Progress value={application.progress * 100} className="h-2" />
                  </div>

                  {application.pipelineEntries.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Current Stage</p>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{application.pipelineEntries[0].currentStage}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Submitted: {new Date(application.submittedAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(application.updatedAt).toLocaleDateString()}</span>
                  </div>

                  <Button className="w-full" variant="outline">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {applications.flatMap(app => app.documents).map((document) => (
              <Card key={document.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{document.name}</CardTitle>
                    <Badge className={getStatusColor(document.status)}>
                      {document.status}
                    </Badge>
                  </div>
                  <CardDescription>{document.category}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Type: {document.type}</span>
                    <span>{(document.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
                  </div>
                  <Button className="w-full" variant="outline" size="sm">
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="communications" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Recent updates and alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                    <div className="flex-shrink-0">
                      {notification.priority === "HIGH" ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Bell className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.readAt && (
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>Recent conversations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                    <div className="flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {message.message}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {message.channel}
                        </Badge>
                        <Badge 
                          variant={message.direction === "INBOUND" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {message.direction}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!message.readAt && message.direction === "INBOUND" && (
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {appointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{appointment.title}</CardTitle>
                      <CardDescription>{appointment.type}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      {new Date(appointment.startTime).toLocaleDateString()} at{" "}
                      {new Date(appointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {appointment.location && (
                    <div className="text-sm">
                      <span className="font-medium">Location:</span> {appointment.location}
                    </div>
                  )}

                  {appointment.virtualMeetingUrl && (
                    <div className="text-sm">
                      <span className="font-medium">Virtual Meeting:</span>{" "}
                      <a href={appointment.virtualMeetingUrl} className="text-blue-600 hover:underline">
                        Join Meeting
                      </a>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button className="flex-1" variant="outline">
                      View Details
                    </Button>
                    {appointment.status === "SCHEDULED" && (
                      <Button variant="destructive" size="sm">
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}