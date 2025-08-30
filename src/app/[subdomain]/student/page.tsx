"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  GraduationCap, 
  FileText, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  MessageSquare,
  Settings,
  LogOut,
  Bell,
  BookOpen,
  Globe,
  Target
} from "lucide-react"

interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  status: 'PROSPECT' | 'APPLIED' | 'ACCEPTED' | 'ENROLLED' | 'GRADUATED' | 'WITHDRAWN'
  stage: 'INQUIRY' | 'CONSULTATION' | 'APPLICATION' | 'DOCUMENTATION' | 'VISA_PROCESSING' | 'PRE_DEPARTURE' | 'POST_ARRIVAL'
  nationality?: string
  dateOfBirth?: string
  currentEducation?: string
  gpa?: number
  budget?: number
  preferredCountries: string[]
  preferredCourses: string[]
  assignedTo?: string
  createdAt: string
  lastActivity?: string
  phone?: string
  avatar?: string
}

interface Application {
  id: string
  university: string
  program: string
  intake: string
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
  submittedAt?: string
  universityId: string
  progress: number
  documentsRequired: number
  documentsSubmitted: number
}

interface Document {
  id: string
  name: string
  type: string
  status: 'UPLOADED' | 'PENDING' | 'REVIEWED' | 'APPROVED' | 'REJECTED'
  uploadedAt: string
  size?: number
  required: boolean
}

const mockStudent: Student = {
  id: "1",
  firstName: "Alex",
  lastName: "Thompson",
  email: "alex.thompson@email.com",
  phone: "+1 (555) 123-4567",
  status: "APPLIED",
  stage: "APPLICATION",
  nationality: "Canadian",
  dateOfBirth: "2002-05-15",
  currentEducation: "High School Diploma",
  gpa: 3.8,
  budget: 50000,
  preferredCountries: ["United States", "United Kingdom", "Australia"],
  preferredCourses: ["Computer Science", "Engineering", "Business"],
  assignedTo: "2",
  createdAt: "2024-01-15",
  lastActivity: "2024-01-20T10:30:00Z"
}

const mockApplications: Application[] = [
  {
    id: "1",
    university: "Stanford University",
    program: "Computer Science",
    intake: "Fall 2024",
    status: "UNDER_REVIEW",
    submittedAt: "2024-01-19",
    universityId: "3",
    progress: 75,
    documentsRequired: 8,
    documentsSubmitted: 6
  },
  {
    id: "2",
    university: "MIT",
    program: "Engineering",
    intake: "Fall 2024",
    status: "DRAFT",
    universityId: "4",
    progress: 25,
    documentsRequired: 8,
    documentsSubmitted: 2
  }
]

const mockDocuments: Document[] = [
  {
    id: "1",
    name: "High School Transcript",
    type: "Academic",
    status: "APPROVED",
    uploadedAt: "2024-01-18",
    size: 2048000,
    required: true
  },
  {
    id: "2",
    name: "Passport Copy",
    type: "Identification",
    status: "PENDING",
    uploadedAt: "2024-01-18",
    size: 1024000,
    required: true
  },
  {
    id: "3",
    name: "English Proficiency Certificate",
    type: "Language",
    status: "UPLOADED",
    uploadedAt: "2024-01-20",
    required: true
  },
  {
    id: "4",
    name: "Personal Statement",
    type: "Application",
    status: "DRAFT",
    required: true
  }
]

export default function StudentPortal() {
  const params = useParams()
  const router = useRouter()
  const subdomain = params.subdomain as string
  
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  })
  
  const [student] = useState<Student>(mockStudent)
  const [applications] = useState<Application[]>(mockApplications)
  const [documents] = useState<Document[]>(mockDocuments)

  useEffect(() => {
    // Check if student is already logged in
    const isAuthenticated = localStorage.getItem('studentAuth')
    const studentData = localStorage.getItem('studentData')
    
    if (isAuthenticated && studentData) {
      try {
        const parsedData = JSON.parse(studentData)
        // Update student data with real data from API
        setStudent(parsedData.student)
        setIsLoggedIn(true)
      } catch (error) {
        console.error('Error parsing student data:', error)
        localStorage.removeItem('studentAuth')
        localStorage.removeItem('studentData')
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError("")

    try {
      const response = await fetch(`/${subdomain}/api/student/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      })

      const result = await response.json()

      if (result.success) {
        // Store authentication data
        localStorage.setItem('studentAuth', 'true')
        localStorage.setItem('studentData', JSON.stringify({
          student: result.student,
          agency: result.agency,
          isDemo: result.isDemo
        }))
        setIsLoggedIn(true)
      } else {
        setLoginError(result.error || "Invalid email or password")
      }
    } catch (error) {
      setLoginError("Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('studentAuth')
    localStorage.removeItem('studentData')
    setIsLoggedIn(false)
  }

  const getStatusColor = (status: string) => {
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

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "INQUIRY": return "bg-gray-100 text-gray-800"
      case "CONSULTATION": return "bg-blue-100 text-blue-800"
      case "APPLICATION": return "bg-yellow-100 text-yellow-800"
      case "DOCUMENTATION": return "bg-orange-100 text-orange-800"
      case "VISA_PROCESSING": return "bg-purple-100 text-purple-800"
      case "PRE_DEPARTURE": return "bg-green-100 text-green-800"
      case "POST_ARRIVAL": return "bg-teal-100 text-teal-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-800"
      case "SUBMITTED": return "bg-blue-100 text-blue-800"
      case "UNDER_REVIEW": return "bg-yellow-100 text-yellow-800"
      case "APPROVED": return "bg-green-100 text-green-800"
      case "REJECTED": return "bg-red-100 text-red-800"
      case "WITHDRAWN": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case "UPLOADED": return "bg-blue-100 text-blue-800"
      case "PENDING": return "bg-yellow-100 text-yellow-800"
      case "REVIEWED": return "bg-orange-100 text-orange-800"
      case "APPROVED": return "bg-green-100 text-green-800"
      case "REJECTED": return "bg-red-100 text-red-800"
      case "DRAFT": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Student Portal</CardTitle>
            <CardDescription>
              Sign in to access your application dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Demo Credentials */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Demo Credentials</h4>
              <div className="space-y-1 text-sm text-blue-700">
                <p><strong>Email:</strong> alex.thompson@demo.com</p>
                <p><strong>Password:</strong> demo123</p>
                <p className="text-xs mt-2">Other demo accounts: maria.garcia@demo.com, james.wilson@demo.com</p>
              </div>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="text-center">
                <Button 
                  variant="link" 
                  onClick={() => router.push(`/${subdomain}/student/register`)}
                  className="text-sm"
                >
                  Don't have an account? Register here
                </Button>
              </div>

              <div className="text-center">
                <Button 
                  variant="link" 
                  onClick={() => router.push(`/${subdomain}`)}
                  className="text-sm"
                >
                  Back to Agency Home
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
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
                <h1 className="text-xl font-bold">Student Portal</h1>
                <p className="text-sm text-muted-foreground">{subdomain}.eduagency.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Student Info Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{student.firstName} {student.lastName}</h2>
                <p className="text-muted-foreground">{student.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className={getStatusColor(student.status)}>
                    {student.status}
                  </Badge>
                  <Badge className={getStageColor(student.stage)}>
                    {student.stage.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Member since</p>
                <p className="font-medium">{new Date(student.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Applications</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{applications.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {applications.filter(app => app.status === 'UNDER_REVIEW').length} under review
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Documents</CardTitle>
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{documents.filter(d => d.status === 'APPROVED').length}/{documents.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Documents approved
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profile Status</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round((documents.filter(d => d.status === 'APPROVED').length / documents.length) * 100)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Profile completion
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Applications */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Your latest university applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications.slice(0, 3).map((application) => (
                    <div key={application.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{application.university}</h4>
                        <p className="text-sm text-muted-foreground">{application.program}</p>
                        <p className="text-xs text-muted-foreground">Intake: {application.intake}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getApplicationStatusColor(application.status)}>
                          {application.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {application.documentsSubmitted}/{application.documentsRequired} docs
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Required Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Required Actions</CardTitle>
                <CardDescription>Complete these tasks to progress your applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {documents.filter(d => d.status !== 'APPROVED').map((document) => (
                    <div key={document.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{document.name}</p>
                        <p className="text-xs text-muted-foreground">Status: {document.status}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        Upload
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Applications</CardTitle>
                <CardDescription>Track your university applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications.map((application) => (
                    <div key={application.id} className="border rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{application.university}</h3>
                          <p className="text-muted-foreground">{application.program}</p>
                          <p className="text-sm text-muted-foreground">Intake: {application.intake}</p>
                        </div>
                        <Badge className={getApplicationStatusColor(application.status)}>
                          {application.status}
                        </Badge>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{application.progress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${application.progress}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Documents: </span>
                          <span>{application.documentsSubmitted}/{application.documentsRequired}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Submitted: </span>
                          <span>{application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : 'Not submitted'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                        <Button size="sm" variant="outline">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Contact Advisor
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Documents</CardTitle>
                <CardDescription>Manage your application documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documents.map((document) => (
                    <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{document.name}</h4>
                          <p className="text-sm text-muted-foreground">{document.type}</p>
                          {document.uploadedAt && (
                            <p className="text-xs text-muted-foreground">
                              Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getDocumentStatusColor(document.status)}>
                          {document.status}
                        </Badge>
                        {document.status === 'DRAFT' && (
                          <Button size="sm">
                            <Upload className="h-4 w-4 mr-1" />
                            Upload
                          </Button>
                        )}
                        {document.status === 'UPLOADED' && (
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Manage your personal and academic information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Full Name</Label>
                      <p className="text-muted-foreground">{student.firstName} {student.lastName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email Address</Label>
                      <p className="text-muted-foreground">{student.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone Number</Label>
                      <p className="text-muted-foreground">{student.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Nationality</Label>
                      <p className="text-muted-foreground">{student.nationality}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Date of Birth</Label>
                      <p className="text-muted-foreground">{student.dateOfBirth}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Current Education</Label>
                      <p className="text-muted-foreground">{student.currentEducation}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">GPA</Label>
                      <p className="text-muted-foreground">{student.gpa}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Budget</Label>
                      <p className="text-muted-foreground">${student.budget?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Preferences</h4>
                      <div className="flex gap-2 mt-2">
                        <div>
                          <Label className="text-sm font-medium">Countries:</Label>
                          <p className="text-muted-foreground text-sm">{student.preferredCountries.join(', ')}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Courses:</Label>
                          <p className="text-muted-foreground text-sm">{student.preferredCourses.join(', ')}</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}