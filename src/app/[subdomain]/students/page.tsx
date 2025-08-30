"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  GraduationCap,
  FileText,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  User,
  Users,
  Target,
  BookOpen,
  Globe,
  TrendingUp,
  Activity,
  Loader2
} from "lucide-react"

interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
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
  notes?: string
  documents: Document[]
  applications: Application[]
}

interface Document {
  id: string
  name: string
  type: string
  status: 'UPLOADED' | 'PENDING' | 'REVIEWED' | 'APPROVED' | 'REJECTED'
  uploadedAt: string
  size?: number
}

interface Application {
  id: string
  university: string
  program: string
  intake: string
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
  submittedAt?: string
  universityId: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  title?: string
}

interface ApiResponse {
  students: Student[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

const countries = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Netherlands", "Sweden", "Norway", "Denmark", "Finland",
  "Switzerland", "Austria", "Belgium", "Ireland", "New Zealand",
  "Singapore", "Japan", "South Korea", "China", "India", "United Arab Emirates"
]

const courses = [
  "Computer Science", "Engineering", "Business Administration", "Marketing",
  "Medicine", "Law", "International Relations", "Economics", "Psychology",
  "Data Science", "Artificial Intelligence", "Biotechnology", "Architecture",
  "Design", "Journalism", "Education", "Hospitality Management"
]

export default function StudentsPage() {
  const params = useParams()
  const subdomain = params.subdomain as string
  
  const [students, setStudents] = useState<Student[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state for adding student
  const [newStudent, setNewStudent] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationality: "",
    dateOfBirth: "",
    currentEducation: "",
    gpa: "",
    budget: "",
    preferredCountries: [] as string[],
    preferredCourses: [] as string[],
    assignedTo: "",
    notes: ""
  })

  // Fetch students from API
  const fetchStudents = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(stageFilter !== "all" && { stage: stageFilter })
      })
      
      const response = await fetch(`/api/${subdomain}/students?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch students')
      }
      
      const data: ApiResponse = await response.json()
      setStudents(data.students)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch users for assignment
  const fetchUsers = async () => {
    try {
      // Mock users for now - in real app, this would be an API call
      setUsers([
        {
          id: "1",
          name: "Sarah Johnson",
          email: "sarah@agency.com",
          role: "AGENCY_ADMIN",
          title: "CEO"
        },
        {
          id: "2",
          name: "Michael Chen",
          email: "michael@agency.com",
          role: "CONSULTANT",
          title: "Senior Education Consultant"
        },
        {
          id: "3",
          name: "Emma Rodriguez",
          email: "emma@agency.com",
          role: "CONSULTANT",
          title: "Education Consultant"
        }
      ])
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchUsers()
  }, [subdomain])

  useEffect(() => {
    fetchStudents()
  }, [searchTerm, statusFilter, stageFilter])

  const handleInputChange = (field: string, value: string | string[]) => {
    setNewStudent(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmitStudent = async () => {
    if (!newStudent.firstName || !newStudent.lastName || !newStudent.email) {
      alert("Please fill in required fields: First Name, Last Name, and Email")
      return
    }

    setSubmitting(true)
    try {
      const studentData = {
        firstName: newStudent.firstName,
        lastName: newStudent.lastName,
        email: newStudent.email,
        phone: newStudent.phone || undefined,
        nationality: newStudent.nationality || undefined,
        dateOfBirth: newStudent.dateOfBirth || undefined,
        currentEducation: newStudent.currentEducation || undefined,
        gpa: newStudent.gpa ? parseFloat(newStudent.gpa) : undefined,
        budget: newStudent.budget ? parseFloat(newStudent.budget) : undefined,
        preferredCountries: newStudent.preferredCountries,
        preferredCourses: newStudent.preferredCourses,
        assignedTo: newStudent.assignedTo || undefined,
        notes: newStudent.notes || undefined
      }

      const response = await fetch(`/api/${subdomain}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create student')
      }

      await fetchStudents()
      setIsAddDialogOpen(false)
      // Reset form
      setNewStudent({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        nationality: "",
        dateOfBirth: "",
        currentEducation: "",
        gpa: "",
        budget: "",
        preferredCountries: [],
        preferredCourses: [],
        assignedTo: "",
        notes: ""
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create student')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStudent = async (studentData: Partial<Student>) => {
    if (!editingStudent) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/${subdomain}/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update student')
      }

      await fetchStudents()
      setIsEditDialogOpen(false)
      setEditingStudent(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update student')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) {
      return
    }

    try {
      const response = await fetch(`/api/${subdomain}/students/${studentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete student')
      }

      await fetchStudents()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete student')
    }
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || student.status === statusFilter
    const matchesStage = stageFilter === "all" || student.stage === stageFilter
    return matchesSearch && matchesStatus && matchesStage
  })

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

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case "UPLOADED": return "bg-blue-100 text-blue-800"
      case "PENDING": return "bg-yellow-100 text-yellow-800"
      case "REVIEWED": return "bg-orange-100 text-orange-800"
      case "APPROVED": return "bg-green-100 text-green-800"
      case "REJECTED": return "bg-red-100 text-red-800"
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

  const stats = {
    total: students.length,
    prospects: students.filter(s => s.status === 'PROSPECT').length,
    applied: students.filter(s => s.status === 'APPLIED').length,
    accepted: students.filter(s => s.status === 'ACCEPTED').length,
    enrolled: students.filter(s => s.status === 'ENROLLED').length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
                <h1 className="text-xl font-bold">Student Management</h1>
                <p className="text-sm text-muted-foreground">{subdomain}.eduagency.com</p>
              </div>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>
                    Create a new student profile and add them to your pipeline
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input 
                        id="firstName" 
                        placeholder="Enter first name"
                        value={newStudent.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input 
                        id="lastName" 
                        placeholder="Enter last name"
                        value={newStudent.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="student@email.com"
                        value={newStudent.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input 
                        id="phone" 
                        placeholder="+1 (555) 123-4567"
                        value={newStudent.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input 
                        id="nationality" 
                        placeholder="e.g., Canadian"
                        value={newStudent.nationality}
                        onChange={(e) => handleInputChange('nationality', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input 
                        id="dateOfBirth" 
                        type="date"
                        value={newStudent.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="currentEducation">Current Education</Label>
                      <Input 
                        id="currentEducation" 
                        placeholder="e.g., High School Diploma"
                        value={newStudent.currentEducation}
                        onChange={(e) => handleInputChange('currentEducation', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gpa">GPA</Label>
                      <Input 
                        id="gpa" 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        max="4"
                        placeholder="3.8"
                        value={newStudent.gpa}
                        onChange={(e) => handleInputChange('gpa', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="budget">Budget ($)</Label>
                      <Input 
                        id="budget" 
                        type="number" 
                        placeholder="50000"
                        value={newStudent.budget}
                        onChange={(e) => handleInputChange('budget', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="assignedTo">Assigned To</Label>
                    <Select value={newStudent.assignedTo} onValueChange={(value) => handleInputChange('assignedTo', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} - {user.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea 
                      id="notes" 
                      placeholder="Additional information about the student..."
                      value={newStudent.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitStudent} disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Add Student
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prospects</p>
                  <p className="text-2xl font-bold">{stats.prospects}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Applied</p>
                  <p className="text-2xl font-bold">{stats.applied}</p>
                </div>
                <FileText className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Accepted</p>
                  <p className="text-2xl font-bold">{stats.accepted}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Enrolled</p>
                  <p className="text-2xl font-bold">{stats.enrolled}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PROSPECT">Prospect</SelectItem>
                <SelectItem value="APPLIED">Applied</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="ENROLLED">Enrolled</SelectItem>
                <SelectItem value="GRADUATED">Graduated</SelectItem>
                <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="INQUIRY">Inquiry</SelectItem>
                <SelectItem value="CONSULTATION">Consultation</SelectItem>
                <SelectItem value="APPLICATION">Application</SelectItem>
                <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                <SelectItem value="VISA_PROCESSING">Visa Processing</SelectItem>
                <SelectItem value="PRE_DEPARTURE">Pre-Departure</SelectItem>
                <SelectItem value="POST_ARRIVAL">Post-Arrival</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>
              Manage your student pipeline and track application progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No students found</p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div key={student.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">
                              {student.firstName} {student.lastName}
                            </h3>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge className={getStatusColor(student.status)}>
                            {student.status}
                          </Badge>
                          <Badge className={getStageColor(student.stage)}>
                            {student.stage.replace('_', ' ')}
                          </Badge>
                          {student.nationality && (
                            <Badge variant="outline">
                              <MapPin className="h-3 w-3 mr-1" />
                              {student.nationality}
                            </Badge>
                          )}
                          {student.assignedTo && (
                            <Badge variant="outline">
                              <Users className="h-3 w-3 mr-1" />
                              {users.find(u => u.id === student.assignedTo)?.name || 'Unassigned'}
                            </Badge>
                          )}
                        </div>

                        {student.currentEducation && (
                          <p className="text-sm text-muted-foreground mb-2">
                            <BookOpen className="h-4 w-4 inline mr-1" />
                            {student.currentEducation}
                            {student.gpa && ` • GPA: ${student.gpa}`}
                          </p>
                        )}

                        {student.budget && (
                          <p className="text-sm text-muted-foreground mb-2">
                            <TrendingUp className="h-4 w-4 inline mr-1" />
                            Budget: ${student.budget.toLocaleString()}
                          </p>
                        )}

                        {student.preferredCountries.length > 0 && (
                          <p className="text-sm text-muted-foreground mb-2">
                            <Globe className="h-4 w-4 inline mr-1" />
                            Preferred: {student.preferredCountries.join(', ')}
                          </p>
                        )}

                        {student.notes && (
                          <p className="text-sm text-muted-foreground mb-3">
                            <MessageSquare className="h-4 w-4 inline mr-1" />
                            {student.notes}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created: {new Date(student.createdAt).toLocaleDateString()}
                          </div>
                          {student.lastActivity && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last activity: {new Date(student.lastActivity).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedStudent(student)
                            setIsViewDialogOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingStudent(student)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStudent(student.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Student Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              View complete student information and application history
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Full Name</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm text-muted-foreground">{selectedStudent.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Nationality</Label>
                    <p className="text-sm text-muted-foreground">{selectedStudent.nationality || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Date of Birth</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString() : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusColor(selectedStudent.status)}>
                      {selectedStudent.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Academic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Current Education</Label>
                    <p className="text-sm text-muted-foreground">{selectedStudent.currentEducation || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">GPA</Label>
                    <p className="text-sm text-muted-foreground">{selectedStudent.gpa || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Budget</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent.budget ? `$${selectedStudent.budget.toLocaleString()}` : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Stage</Label>
                    <Badge className={getStageColor(selectedStudent.stage)}>
                      {selectedStudent.stage.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Preferences</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Preferred Countries</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent.preferredCountries.length > 0 
                        ? selectedStudent.preferredCountries.join(', ') 
                        : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Preferred Courses</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent.preferredCourses.length > 0 
                        ? selectedStudent.preferredCourses.join(', ') 
                        : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Applications */}
              {selectedStudent.applications.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Applications</h3>
                  <div className="space-y-2">
                    {selectedStudent.applications.map((app) => (
                      <div key={app.id} className="border rounded p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{app.university}</p>
                            <p className="text-sm text-muted-foreground">{app.program}</p>
                            <p className="text-xs text-muted-foreground">Intake: {app.intake}</p>
                          </div>
                          <Badge className={getApplicationStatusColor(app.status)}>
                            {app.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedStudent.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Notes</h3>
                  <p className="text-sm text-muted-foreground">{selectedStudent.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}