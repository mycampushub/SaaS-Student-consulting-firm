"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Star,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  UserPlus,
  Settings,
  BarChart3,
  GraduationCap,
  Globe,
  FileText,
  MessageSquare,
  Bell,
  Activity,
  Target,
  Award,
  BookOpen,
  CreditCard,
  Database,
  Folder,
  File,
  Download,
  Unlock,
  Lock,
  Workflow,
  Layout,
  MousePointer2,
  Grid,
  Facebook,
  Chrome
} from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: 'AGENCY_ADMIN' | 'CONSULTANT' | 'SUPPORT' | 'STUDENT'
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  title?: string
  department?: string
  lastLogin?: string
  avatar?: string
}

interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  status: 'PROSPECT' | 'APPLIED' | 'ACCEPTED' | 'ENROLLED' | 'GRADUATED' | 'WITHDRAWN'
  stage: 'INQUIRY' | 'CONSULTATION' | 'APPLICATION' | 'DOCUMENTATION' | 'VISA_PROCESSING' | 'PRE_DEPARTURE' | 'POST_ARRIVAL'
  nationality?: string
  assignedTo?: string
  createdAt: string
  lastActivity?: string
}

interface University {
  id: string
  name: string
  country: string
  city: string
  partnershipLevel: 'NONE' | 'BASIC' | 'PREMIUM' | 'STRATEGIC'
  isPartner: boolean
  worldRanking?: number
  website?: string
}

interface DashboardStats {
  totalStudents: number
  activeApplications: number
  totalUniversities: number
  partnerUniversities: number
  monthlyRevenue: number
  teamMembers: number
  conversionRate: number
  avgProcessingTime: number
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah@agency.com",
    role: "AGENCY_ADMIN",
    status: "ACTIVE",
    title: "CEO",
    department: "Executive",
    lastLogin: "2024-01-20T10:30:00Z"
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "michael@agency.com",
    role: "CONSULTANT",
    status: "ACTIVE",
    title: "Senior Education Consultant",
    department: "Consulting",
    lastLogin: "2024-01-20T09:15:00Z"
  },
  {
    id: "3",
    name: "Emma Rodriguez",
    email: "emma@agency.com",
    role: "CONSULTANT",
    status: "ACTIVE",
    title: "Education Consultant",
    department: "Consulting",
    lastLogin: "2024-01-19T16:45:00Z"
  },
  {
    id: "4",
    name: "David Kim",
    email: "david@agency.com",
    role: "SUPPORT",
    status: "ACTIVE",
    title: "Support Specialist",
    department: "Operations",
    lastLogin: "2024-01-20T11:20:00Z"
  }
]

const mockStudents: Student[] = [
  {
    id: "1",
    firstName: "Alex",
    lastName: "Thompson",
    email: "alex.thompson@email.com",
    status: "PROSPECT",
    stage: "CONSULTATION",
    nationality: "Canadian",
    assignedTo: "2",
    createdAt: "2024-01-15",
    lastActivity: "2024-01-20T10:30:00Z"
  },
  {
    id: "2",
    lastName: "Garcia",
    firstName: "Maria",
    email: "maria.garcia@email.com",
    status: "APPLIED",
    stage: "APPLICATION",
    nationality: "Spanish",
    assignedTo: "3",
    createdAt: "2024-01-10",
    lastActivity: "2024-01-20T09:15:00Z"
  },
  {
    id: "3",
    firstName: "James",
    lastName: "Wilson",
    email: "james.wilson@email.com",
    status: "ACCEPTED",
    stage: "DOCUMENTATION",
    nationality: "British",
    assignedTo: "2",
    createdAt: "2024-01-08",
    lastActivity: "2024-01-19T16:45:00Z"
  },
  {
    id: "4",
    firstName: "Priya",
    lastName: "Patel",
    email: "priya.patel@email.com",
    status: "PROSPECT",
    stage: "INQUIRY",
    nationality: "Indian",
    assignedTo: "3",
    createdAt: "2024-01-18",
    lastActivity: "2024-01-20T11:20:00Z"
  },
  {
    id: "5",
    firstName: "Liu",
    lastName: "Wei",
    email: "liu.wei@email.com",
    status: "ENROLLED",
    stage: "PRE_DEPARTURE",
    nationality: "Chinese",
    assignedTo: "2",
    createdAt: "2023-12-15",
    lastActivity: "2024-01-19T14:30:00Z"
  }
]

const mockUniversities: University[] = [
  {
    id: "1",
    name: "Harvard University",
    country: "United States",
    city: "Cambridge",
    partnershipLevel: "STRATEGIC",
    isPartner: true,
    worldRanking: 1,
    website: "https://harvard.edu"
  },
  {
    id: "2",
    name: "University of Oxford",
    country: "United Kingdom",
    city: "Oxford",
    partnershipLevel: "PREMIUM",
    isPartner: true,
    worldRanking: 2,
    website: "https://ox.ac.uk"
  },
  {
    id: "3",
    name: "Stanford University",
    country: "United States",
    city: "Stanford",
    partnershipLevel: "STRATEGIC",
    isPartner: true,
    worldRanking: 3,
    website: "https://stanford.edu"
  },
  {
    id: "4",
    name: "MIT",
    country: "United States",
    city: "Cambridge",
    partnershipLevel: "PREMIUM",
    isPartner: true,
    worldRanking: 4,
    website: "https://mit.edu"
  },
  {
    id: "5",
    name: "University of Toronto",
    country: "Canada",
    city: "Toronto",
    partnershipLevel: "BASIC",
    isPartner: true,
    worldRanking: 25,
    website: "https://utoronto.ca"
  }
]

const mockStats: DashboardStats = {
  totalStudents: 45,
  activeApplications: 28,
  totalUniversities: 150,
  partnerUniversities: 85,
  monthlyRevenue: 12500,
  teamMembers: 4,
  conversionRate: 68,
  avgProcessingTime: 14
}

const recentActivities = [
  {
    id: "1",
    type: "student",
    action: "New student registered",
    student: "Priya Patel",
    user: "Emma Rodriguez",
    timestamp: "2 hours ago"
  },
  {
    id: "2",
    type: "application",
    action: "Application submitted to Oxford",
    student: "Maria Garcia",
    user: "Michael Chen",
    timestamp: "4 hours ago"
  },
  {
    id: "3",
    type: "university",
    action: "New partnership established",
    university: "University of Toronto",
    user: "Sarah Johnson",
    timestamp: "1 day ago"
  },
  {
    id: "4",
    type: "student",
    action: "Student consultation completed",
    student: "Alex Thompson",
    user: "Michael Chen",
    timestamp: "1 day ago"
  },
  {
    id: "5",
    type: "document",
    action: "Documents uploaded",
    student: "James Wilson",
    user: "Emma Rodriguez",
    timestamp: "2 days ago"
  }
]

export default function AgencyDashboard() {
  const params = useParams()
  const router = useRouter()
  const subdomain = params.subdomain as string
  
  const [users] = useState<User[]>(mockUsers)
  const [students] = useState<Student[]>(mockStudents)
  const [universities] = useState<University[]>(mockUniversities)
  const [stats] = useState<DashboardStats>(mockStats)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [isAddUniversityOpen, setIsAddUniversityOpen] = useState(false)
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false)
  const [notifications] = useState([
    { id: 1, type: 'info', title: 'New student inquiry', message: 'Alex Thompson submitted an inquiry', time: '2 hours ago', read: false },
    { id: 2, type: 'success', title: 'Application approved', message: 'Maria Garcia accepted to Oxford', time: '4 hours ago', read: false },
    { id: 3, type: 'warning', title: 'Document pending', message: 'James Wilson needs to upload passport', time: '1 day ago', read: true },
  ])

  // Simulate real-time updates
  const [liveStats, setLiveStats] = useState({
    onlineUsers: Math.floor(Math.random() * 10) + 5,
    activeApplications: Math.floor(Math.random() * 5) + 25,
    todayActivities: Math.floor(Math.random() * 20) + 10,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats({
        onlineUsers: Math.floor(Math.random() * 10) + 5,
        activeApplications: Math.floor(Math.random() * 5) + 25,
        todayActivities: Math.floor(Math.random() * 20) + 10,
      })
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const getRoleColor = (role: string) => {
    switch (role) {
      case "AGENCY_ADMIN": return "bg-purple-100 text-purple-800"
      case "CONSULTANT": return "bg-blue-100 text-blue-800"
      case "SUPPORT": return "bg-green-100 text-green-800"
      case "STUDENT": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800"
      case "PENDING": return "bg-yellow-100 text-yellow-800"
      case "INACTIVE": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStudentStatusColor = (status: string) => {
    switch (status) {
      case "PROSPECT": return "bg-blue-100 text-blue-800"
      case "APPLIED": return "bg-yellow-100 text-yellow-800"
      case "ACCEPTED": return "bg-green-100 text-green-800"
      case "ENROLLED": return "bg-purple-100 text-purple-800"
      case "GRADUATED": return "bg-gray-100 text-gray-800"
      case "WITHDRAWN": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getPartnershipColor = (level: string) => {
    switch (level) {
      case "STRATEGIC": return "bg-purple-100 text-purple-800"
      case "PREMIUM": return "bg-blue-100 text-blue-800"
      case "BASIC": return "bg-green-100 text-green-800"
      case "NONE": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">EA</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Agency Dashboard</h1>
                <p className="text-sm text-muted-foreground">{subdomain}.eduagency.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="relative">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Notifications</DialogTitle>
                    <DialogDescription>Recent updates and alerts</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className={`p-3 rounded-lg border ${
                        notification.read ? 'bg-muted/30' : 'bg-primary/5 border-primary/20'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'info' ? 'bg-blue-500' :
                            notification.type === 'success' ? 'bg-green-500' :
                            notification.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{notification.title}</p>
                            <p className="text-xs text-muted-foreground">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/student')}>
                <GraduationCap className="h-4 w-4 mr-2" />
                Student Portal
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-13">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="universities">Universities</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="accounting">Accounting</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="landing-pages">Landing Pages</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Live Stats Alert */}
            <Alert className="border-blue-200 bg-blue-50">
              <Activity className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Live Activity:</strong> {liveStats.onlineUsers} users online, {liveStats.activeApplications} active applications, {liveStats.todayActivities} activities today
              </AlertDescription>
            </Alert>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalStudents}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeApplications} active applications
                  </p>
                  <div className="mt-2">
                    <Progress value={(stats.activeApplications / stats.totalStudents) * 100} className="h-1" />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.teamMembers}</div>
                  <p className="text-xs text-muted-foreground">
                    {liveStats.onlineUsers} currently online
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">All systems operational</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Partner Universities</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.partnerUniversities}</div>
                  <p className="text-xs text-muted-foreground">
                    of {stats.totalUniversities} total
                  </p>
                  <div className="mt-2">
                    <Progress value={(stats.partnerUniversities / stats.totalUniversities) * 100} className="h-1" />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.conversionRate}% conversion rate
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">+12% from last month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest activities in your agency</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {activity.type === 'student' && <Users className="h-4 w-4 text-primary" />}
                          {activity.type === 'application' && <FileText className="h-4 w-4 text-primary" />}
                          {activity.type === 'university' && <Globe className="h-4 w-4 text-primary" />}
                          {activity.type === 'document' && <BookOpen className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.student || activity.university} • {activity.user}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activity.timestamp}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Common tasks and actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full justify-start">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add New Student
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Student</DialogTitle>
                        <DialogDescription>Create a new student profile</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" placeholder="Enter first name" />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" placeholder="Enter last name" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" placeholder="student@email.com" />
                        </div>
                        <div>
                          <Label htmlFor="nationality">Nationality</Label>
                          <Input id="nationality" placeholder="Country" />
                        </div>
                        <div>
                          <Label htmlFor="assignedTo">Assigned To</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select consultant" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.filter(u => u.role === 'CONSULTANT').map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name} - {user.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button onClick={() => setIsAddStudentOpen(false)}>Cancel</Button>
                          <Button className="flex-1">Add Student</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Create Application
                  </Button>
                  
                  <Dialog open={isAddUniversityOpen} onOpenChange={setIsAddUniversityOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Globe className="h-4 w-4 mr-2" />
                        Add University
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New University</DialogTitle>
                        <DialogDescription>Add a university to your partnership network</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="universityName">University Name</Label>
                          <Input id="universityName" placeholder="Enter university name" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="country">Country</Label>
                            <Input id="country" placeholder="Country" />
                          </div>
                          <div>
                            <Label htmlFor="city">City</Label>
                            <Input id="city" placeholder="City" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="website">Website</Label>
                          <Input id="website" placeholder="https://university.edu" />
                        </div>
                        <div>
                          <Label htmlFor="partnershipLevel">Partnership Level</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select partnership level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">None</SelectItem>
                              <SelectItem value="BASIC">Basic</SelectItem>
                              <SelectItem value="PREMIUM">Premium</SelectItem>
                              <SelectItem value="STRATEGIC">Strategic</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button variant="outline" onClick={() => setIsAddUniversityOpen(false)}>Cancel</Button>
                          <Button className="flex-1">Add University</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Communication
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Student Management</CardTitle>
                    <CardDescription>Manage your student pipeline and applications</CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="rounded-md border">
                  <div className="grid grid-cols-12 gap-4 p-4 bg-muted font-medium text-sm">
                    <div className="col-span-3">Student</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Stage</div>
                    <div className="col-span-2">Assigned To</div>
                    <div className="col-span-2">Last Activity</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                  <div className="divide-y">
                    {students.map((student) => (
                      <div key={student.id} className="grid grid-cols-12 gap-4 p-4 items-center">
                        <div className="col-span-3">
                          <div>
                            <p className="font-medium">{student.firstName} {student.lastName}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                            {student.nationality && (
                              <p className="text-xs text-muted-foreground">{student.nationality}</p>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Badge className={getStudentStatusColor(student.status)}>
                            {student.status}
                          </Badge>
                        </div>
                        <div className="col-span-2">
                          <Badge variant="outline">
                            {student.stage.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="col-span-2">
                          <div className="text-sm">
                            {users.find(u => u.id === student.assignedTo)?.name || 'Unassigned'}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-sm text-muted-foreground">
                            {student.lastActivity ? 'Recently' : 'Never'}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Team Management</CardTitle>
                    <CardDescription>Manage your agency team members and permissions</CardDescription>
                  </div>
                  <Dialog open={isInviteMemberOpen} onOpenChange={setIsInviteMemberOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                        <DialogDescription>Send an invitation to join your agency team</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="memberEmail">Email Address</Label>
                          <Input id="memberEmail" type="email" placeholder="colleague@agency.com" />
                        </div>
                        <div>
                          <Label htmlFor="memberRole">Role</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AGENCY_ADMIN">Agency Admin</SelectItem>
                              <SelectItem value="CONSULTANT">Education Consultant</SelectItem>
                              <SelectItem value="SUPPORT">Support Specialist</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="memberTitle">Title</Label>
                          <Input id="memberTitle" placeholder="Job title" />
                        </div>
                        <div>
                          <Label htmlFor="memberDepartment">Department</Label>
                          <Input id="memberDepartment" placeholder="Department" />
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button variant="outline" onClick={() => setIsInviteMemberOpen(false)}>Cancel</Button>
                          <Button className="flex-1">Send Invitation</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.map((user) => (
                    <Card key={user.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <Badge className={getRoleColor(user.role)}>
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          {user.title && (
                            <div>
                              <p className="text-sm font-medium">{user.title}</p>
                              <p className="text-xs text-muted-foreground">{user.department}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(user.status)}>
                              {user.status}
                            </Badge>
                            {user.lastLogin && (
                              <span className="text-xs text-muted-foreground">
                                Last: {new Date(user.lastLogin).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="universities" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>University Partnerships</CardTitle>
                    <CardDescription>Manage your university partnerships and collaborations</CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add University
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {universities.map((university) => (
                    <Card key={university.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{university.name}</CardTitle>
                            <CardDescription>{university.city}, {university.country}</CardDescription>
                          </div>
                          {university.isPartner && (
                            <Award className="h-5 w-5 text-yellow-500" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Partnership</span>
                            <Badge className={getPartnershipColor(university.partnershipLevel)}>
                              {university.partnershipLevel}
                            </Badge>
                          </div>
                          {university.worldRanking && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">World Ranking</span>
                              <span className="text-sm font-medium">#{university.worldRanking}</span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Applications</h2>
                <p className="text-muted-foreground">
                  Manage student applications and track progress
                </p>
              </div>
              <Button onClick={() => router.push('/applications')}>
                <FileText className="mr-2 h-4 w-4" />
                View All Applications
              </Button>
            </div>

            {/* Application Stats */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeApplications}</div>
                  <p className="text-xs text-muted-foreground">
                    +2 from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Under Review</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    Pending decisions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-xs text-muted-foreground">
                    Successful applications
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.conversionRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    Approval rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Applications */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>
                  Latest student applications and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      id: '1',
                      student: 'John Doe',
                      university: 'Harvard University',
                      program: 'Computer Science',
                      status: 'UNDER_REVIEW',
                      date: '2024-01-20'
                    },
                    {
                      id: '2',
                      student: 'Jane Smith',
                      university: 'University of Oxford',
                      program: 'Business Administration',
                      status: 'APPROVED',
                      date: '2024-01-18'
                    },
                    {
                      id: '3',
                      student: 'Mike Johnson',
                      university: 'University of Toronto',
                      program: 'Engineering',
                      status: 'DRAFT',
                      date: '2024-01-15'
                    }
                  ].map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{app.student}</p>
                          <p className="text-sm text-muted-foreground">
                            {app.university} - {app.program}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge className={
                          app.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          app.status === 'UNDER_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {app.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{app.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Billing & Subscription</h2>
                <p className="text-muted-foreground">
                  Manage your subscription, usage, and billing information
                </p>
              </div>
              <Button onClick={() => router.push('/billing')}>
                <CreditCard className="mr-2 h-4 w-4" />
                Manage Billing
              </Button>
            </div>

            {/* Billing Stats */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Professional</div>
                  <p className="text-xs text-muted-foreground">
                    $299/month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.monthlyRevenue}</div>
                  <p className="text-xs text-muted-foreground">
                    +12% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usage</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">45/200</div>
                  <p className="text-xs text-muted-foreground">
                    Students used
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Next Invoice</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$299</div>
                  <p className="text-xs text-muted-foreground">
                    Due Feb 1, 2024
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Usage Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Overview</CardTitle>
                <CardDescription>Your current resource usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Students</span>
                      <span className="text-sm text-green-600">45/200</span>
                    </div>
                    <Progress value={22.5} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Team Members</span>
                      <span className="text-sm text-green-600">4/10</span>
                    </div>
                    <Progress value={40} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Storage</span>
                      <span className="text-sm text-yellow-600">8.5GB/20GB</span>
                    </div>
                    <Progress value={42.5} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Invoices */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Your latest billing history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      id: '1',
                      number: 'INV-2024-001',
                      amount: 299,
                      status: 'PAID',
                      date: '2024-01-01'
                    },
                    {
                      id: '2',
                      number: 'INV-2024-002',
                      amount: 299,
                      status: 'PENDING',
                      date: '2024-02-01'
                    }
                  ].map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.number}</p>
                          <p className="text-sm text-muted-foreground">{invoice.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge className={
                          invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {invoice.status}
                        </Badge>
                        <span className="font-medium">${invoice.amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Communications</h2>
                <p className="text-muted-foreground">
                  Manage emails, SMS, and notifications
                </p>
              </div>
              <Button onClick={() => router.push('/communications')}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Manage Communications
              </Button>
            </div>

            {/* Communications Stats */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground">
                    +12 from yesterday
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">SMS Sent</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">89</div>
                  <p className="text-xs text-muted-foreground">
                    +5 from yesterday
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">78%</div>
                  <p className="text-xs text-muted-foreground">
                    Email open rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Templates</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    Active templates
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Communications */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Emails</CardTitle>
                  <CardDescription>Latest email communications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        id: '1',
                        to: 'john.doe@email.com',
                        subject: 'Application Status Update',
                        status: 'OPENED',
                        date: '2024-01-20'
                      },
                      {
                        id: '2',
                        to: 'jane.smith@email.com',
                        subject: 'Document Submission Reminder',
                        status: 'DELIVERED',
                        date: '2024-01-19'
                      },
                      {
                        id: '3',
                        to: 'mike.johnson@email.com',
                        subject: 'Consultation Scheduled',
                        status: 'SENT',
                        date: '2024-01-18'
                      }
                    ].map((email) => (
                      <div key={email.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Mail className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{email.subject}</p>
                            <p className="text-xs text-muted-foreground">{email.to}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={
                            email.status === 'OPENED' ? 'bg-green-100 text-green-800' :
                            email.status === 'DELIVERED' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {email.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{email.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Notifications</CardTitle>
                  <CardDescription>Latest system notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        id: '1',
                        title: 'New Student Inquiry',
                        message: 'Alex Thompson submitted a new inquiry',
                        type: 'INFO',
                        date: '2024-01-20'
                      },
                      {
                        id: '2',
                        title: 'Application Approved',
                        message: 'Maria Garcia\'s application to Oxford was approved',
                        type: 'SUCCESS',
                        date: '2024-01-19'
                      },
                      {
                        id: '3',
                        title: 'Document Pending',
                        message: 'James Wilson needs to submit passport documents',
                        type: 'WARNING',
                        date: '2024-01-18'
                      }
                    ].map((notification) => (
                      <div key={notification.id} className="flex items-start space-x-3 p-3 border rounded">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.type === 'INFO' ? 'bg-blue-500' :
                          notification.type === 'SUCCESS' ? 'bg-green-500' :
                          'bg-yellow-500'
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notification.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Document Management</h2>
                <p className="text-muted-foreground">
                  Upload, organize, and manage all your documents
                </p>
              </div>
              <Button onClick={() => router.push('/documents')}>
                <FileText className="mr-2 h-4 w-4" />
                Manage Documents
              </Button>
            </div>

            {/* Document Stats */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">89</div>
                  <p className="text-xs text-muted-foreground">
                    +5 from yesterday
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2.4GB</div>
                  <p className="text-xs text-muted-foreground">
                    of 20GB total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Folders</CardTitle>
                  <Folder className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    Document folders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Templates</CardTitle>
                  <File className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-xs text-muted-foreground">
                    Available templates
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Documents */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Documents</CardTitle>
                  <CardDescription>Latest uploaded documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        id: '1',
                        name: 'John_Doe_Transcript.pdf',
                        category: 'Academic',
                        size: '2.0MB',
                        uploaded: '2024-01-20'
                      },
                      {
                        id: '2',
                        name: 'Maria_Garcia_Passport.jpg',
                        category: 'Identification',
                        size: '1.0MB',
                        uploaded: '2024-01-19'
                      },
                      {
                        id: '3',
                        name: 'University_Oxford_Brochure.pdf',
                        category: 'University',
                        size: '4.9MB',
                        uploaded: '2024-01-18'
                      }
                    ].map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">{doc.category} • {doc.size}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">{doc.uploaded}</span>
                          <Button variant="ghost" size="sm">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Document Folders</CardTitle>
                  <CardDescription>Your document organization</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        id: '1',
                        name: 'Student Documents',
                        count: 45,
                        size: '195MB',
                        isPublic: false
                      },
                      {
                        id: '2',
                        name: 'University Materials',
                        count: 23,
                        size: '146MB',
                        isPublic: true
                      },
                      {
                        id: '3',
                        name: 'Templates',
                        count: 12,
                        size: '49MB',
                        isPublic: true
                      }
                    ].map((folder) => (
                      <div key={folder.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Folder className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{folder.name}</p>
                            <p className="text-xs text-muted-foreground">{folder.count} documents • {folder.size}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {folder.isPublic ? (
                            <Unlock className="h-3 w-3 text-green-500" />
                          ) : (
                            <Lock className="h-3 w-3 text-gray-500" />
                          )}
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Student Pipeline</CardTitle>
                  <CardDescription>Student conversion funnel</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Inquiry</span>
                        <span>45 students</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Consultation</span>
                        <span>38 students</span>
                      </div>
                      <Progress value={84} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Application</span>
                        <span>28 students</span>
                      </div>
                      <Progress value={62} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Enrolled</span>
                        <span>18 students</span>
                      </div>
                      <Progress value={40} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Overview</CardTitle>
                  <CardDescription>Monthly revenue breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-green-600">$12.5K</div>
                        <p className="text-xs text-muted-foreground">This Month</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600">$11.2K</div>
                        <p className="text-xs text-muted-foreground">Last Month</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">$135K</div>
                        <p className="text-xs text-muted-foreground">YTD Total</p>
                      </div>
                    </div>
                    <div className="h-32 flex items-center justify-center bg-muted rounded">
                      <div className="text-center">
                        <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Interactive revenue chart</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Analytics Section */}
            <div className="grid lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Application Success Rate</CardTitle>
                  <CardDescription>University application outcomes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">68%</div>
                    <p className="text-sm text-muted-foreground mb-4">Overall success rate</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Accepted</span>
                        <span className="text-green-600">68%</span>
                      </div>
                      <Progress value={68} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span>Pending</span>
                        <span className="text-yellow-600">24%</span>
                      </div>
                      <Progress value={24} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span>Rejected</span>
                        <span className="text-red-600">8%</span>
                      </div>
                      <Progress value={8} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Universities</CardTitle>
                  <CardDescription>Most popular destinations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {universities.slice(0, 5).map((university) => (
                      <div key={university.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium truncate">{university.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.floor(Math.random() * 20) + 5} apps
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team Performance</CardTitle>
                  <CardDescription>Consultant productivity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {users.filter(u => u.role === 'CONSULTANT').map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.title}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-600">
                            {Math.floor(Math.random() * 15) + 8}
                          </div>
                          <div className="text-xs text-muted-foreground">students</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Analytics Features */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                  <CardDescription>Student origins by country</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { country: 'India', students: 15, percentage: 33 },
                      { country: 'China', students: 12, percentage: 27 },
                      { country: 'Nigeria', students: 8, percentage: 18 },
                      { country: 'Brazil', students: 6, percentage: 13 },
                      { country: 'Others', students: 4, percentage: 9 }
                    ].map((item) => (
                      <div key={item.country} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{item.country}</span>
                          <span>{item.students} students ({item.percentage}%)</span>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                  <CardDescription>Key metrics over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">+23%</div>
                        <p className="text-xs text-muted-foreground">Student Growth</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">+15%</div>
                        <p className="text-xs text-muted-foreground">Revenue Growth</p>
                      </div>
                    </div>
                    <div className="h-32 flex items-center justify-center bg-muted rounded">
                      <div className="text-center">
                        <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Trend analysis chart</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Reports Section */}
            <Card>
              <CardHeader>
                <CardTitle>Advanced Reports</CardTitle>
                <CardDescription>Generate detailed reports for your agency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <FileText className="h-6 w-6 mb-2" />
                    <span className="text-sm">Student Report</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <GraduationCap className="h-6 w-6 mb-2" />
                    <span className="text-sm">University Report</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <DollarSign className="h-6 w-6 mb-2" />
                    <span className="text-sm">Financial Report</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <BarChart3 className="h-6 w-6 mb-2" />
                    <span className="text-sm">Performance Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators for your agency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{stats.conversionRate}%</div>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <div className="mt-1">
                      <TrendingUp className="h-3 w-3 text-green-500 mx-auto" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{stats.avgProcessingTime} days</div>
                    <p className="text-sm text-muted-foreground">Avg. Processing Time</p>
                    <div className="mt-1">
                      <TrendingUp className="h-3 w-3 text-green-500 mx-auto" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{stats.activeApplications}</div>
                    <p className="text-sm text-muted-foreground">Active Applications</p>
                    <div className="mt-1">
                      <Activity className="h-3 w-3 text-blue-500 mx-auto" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">${stats.monthlyRevenue.toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                    <div className="mt-1">
                      <TrendingUp className="h-3 w-3 text-green-500 mx-auto" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accounting Module */}
          <TabsContent value="accounting" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Accounting</h2>
                <p className="text-muted-foreground">
                  Manage your agency's finances, invoices, and transactions
                </p>
              </div>
              <Button onClick={() => window.location.href = '/accounting'}>
                <DollarSign className="mr-2 h-4 w-4" />
                Go to Accounting
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Overview
                  </CardTitle>
                  <CardDescription>
                    Track revenue, expenses, and profitability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Revenue</span>
                      <span className="font-medium">$125,000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Expenses</span>
                      <span className="font-medium">$85,000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Net Profit</span>
                      <span className="font-medium text-green-600">$40,000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Invoices
                  </CardTitle>
                  <CardDescription>
                    Create and manage invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Invoices</span>
                      <span className="font-medium">24</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Paid</span>
                      <span className="font-medium text-green-600">18</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Outstanding</span>
                      <span className="font-medium text-yellow-600">6</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Transactions
                  </CardTitle>
                  <CardDescription>
                    Track all financial transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>This Month</span>
                      <span className="font-medium">156</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Income</span>
                      <span className="font-medium text-green-600">$12,500</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Expenses</span>
                      <span className="font-medium text-red-600">$8,500</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Reports
                  </CardTitle>
                  <CardDescription>
                    Generate financial reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      P&L Statement
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Balance Sheet
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Tax Reports
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Marketing Module */}
          <TabsContent value="marketing" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Marketing Automation</h2>
                <p className="text-muted-foreground">
                  Create campaigns, build workflows, and track leads
                </p>
              </div>
              <Button onClick={() => window.location.href = '/marketing'}>
                <Target className="mr-2 h-4 w-4" />
                Go to Marketing
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Campaigns
                  </CardTitle>
                  <CardDescription>
                    Email, SMS, and social media campaigns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Campaigns</span>
                      <span className="font-medium">12</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Active</span>
                      <span className="font-medium text-green-600">8</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Conversions</span>
                      <span className="font-medium">156</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Leads
                  </CardTitle>
                  <CardDescription>
                    Manage and nurture your leads
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Leads</span>
                      <span className="font-medium">485</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Qualified</span>
                      <span className="font-medium text-blue-600">89</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Converted</span>
                      <span className="font-medium text-green-600">34</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-5 w-5" />
                    Workflows
                  </CardTitle>
                  <CardDescription>
                    Automated marketing workflows
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Workflows</span>
                      <span className="font-medium">6</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Active</span>
                      <span className="font-medium text-green-600">4</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Executions</span>
                      <span className="font-medium">1,245</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Analytics
                  </CardTitle>
                  <CardDescription>
                    Marketing performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Open Rate</span>
                      <span className="font-medium">68%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Click Rate</span>
                      <span className="font-medium">24%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>ROI</span>
                      <span className="font-medium text-green-600">285%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Landing Pages Module */}
          <TabsContent value="landing-pages" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Landing Page Builder</h2>
                <p className="text-muted-foreground">
                  Create and manage landing pages with drag-and-drop builder
                </p>
              </div>
              <Button onClick={() => window.location.href = '/landing-pages'}>
                <Layout className="mr-2 h-4 w-4" />
                Go to Landing Pages
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="h-5 w-5" />
                    Pages
                  </CardTitle>
                  <CardDescription>
                    Your landing pages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Pages</span>
                      <span className="font-medium">8</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Published</span>
                      <span className="font-medium text-green-600">6</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Drafts</span>
                      <span className="font-medium text-yellow-600">2</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Traffic
                  </CardTitle>
                  <CardDescription>
                    Page views and visitors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Views</span>
                      <span className="font-medium">25,440</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Unique Visitors</span>
                      <span className="font-medium">18,250</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg. Duration</span>
                      <span className="font-medium">2:45</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MousePointer2 className="h-5 w-5" />
                    Conversions
                  </CardTitle>
                  <CardDescription>
                    Lead generation results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Leads</span>
                      <span className="font-medium">342</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Conversion Rate</span>
                      <span className="font-medium">1.34%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cost per Lead</span>
                      <span className="font-medium">$12.50</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid className="h-5 w-5" />
                    Templates
                  </CardTitle>
                  <CardDescription>
                    Ready-to-use templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Layout className="h-4 w-4 mr-2" />
                      Lead Generation
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Layout className="h-4 w-4 mr-2" />
                      Webinar Landing
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Layout className="h-4 w-4 mr-2" />
                      Product Launch
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Forms Module */}
          <TabsContent value="forms" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Form Builder</h2>
                <p className="text-muted-foreground">
                  Create forms with Facebook/Google lead ads integration
                </p>
              </div>
              <Button onClick={() => window.location.href = '/forms'}>
                <FileText className="mr-2 h-4 w-4" />
                Go to Forms
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Forms
                  </CardTitle>
                  <CardDescription>
                    Your custom forms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Forms</span>
                      <span className="font-medium">15</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Active</span>
                      <span className="font-medium text-green-600">12</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg. Fields</span>
                      <span className="font-medium">6</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Submissions
                  </CardTitle>
                  <CardDescription>
                    Form submissions data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Submissions</span>
                      <span className="font-medium">1,245</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>This Month</span>
                      <span className="font-medium">342</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Conversion Rate</span>
                      <span className="font-medium">18.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Facebook className="h-5 w-5" />
                    Facebook Integration
                  </CardTitle>
                  <CardDescription>
                    Facebook Lead Ads connected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Connected Forms</span>
                      <span className="font-medium">8</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Leads from FB</span>
                      <span className="font-medium">456</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cost per Lead</span>
                      <span className="font-medium">$8.20</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Chrome className="h-5 w-5" />
                    Google Integration
                  </CardTitle>
                  <CardDescription>
                    Google Lead Forms connected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Connected Forms</span>
                      <span className="font-medium">5</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Leads from Google</span>
                      <span className="font-medium">234</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cost per Lead</span>
                      <span className="font-medium">$11.50</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}