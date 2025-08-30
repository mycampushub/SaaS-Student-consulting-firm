'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar,
  User,
  GraduationCap,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react'
import { format } from 'date-fns'

interface Application {
  id: string
  studentId: string
  student: {
    firstName: string
    lastName: string
    email: string
  }
  universityId: string
  university: {
    name: string
    country: string
  }
  program: string
  intake: string
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
  documents: string[]
  payments: any[]
  communications: any[]
  assignedTo: string
  createdAt: string
  updatedAt: string
}

interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  status: 'PROSPECT' | 'APPLIED' | 'ACCEPTED' | 'ENROLLED' | 'GRADUATED' | 'WITHDRAWN'
}

interface University {
  id: string
  name: string
  country: string
  programs: string[]
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-purple-100 text-purple-800'
}

const statusLabels = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn'
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [universities, setUniversities] = useState<University[]>([])
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [newApplication, setNewApplication] = useState({
    studentId: '',
    universityId: '',
    program: '',
    intake: '',
    status: 'DRAFT'
  })

  // Mock data for demonstration
  useEffect(() => {
    const mockApplications: Application[] = [
      {
        id: '1',
        studentId: 's',
        student: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@email.com'
        },
        universityId: '1',
        university: {
          name: 'Harvard University',
          country: 'USA'
        },
        program: 'Computer Science',
        intake: 'Fall 2024',
        status: 'UNDER_REVIEW',
        documents: ['transcript.pdf', 'passport.pdf', 'essay.pdf'],
        payments: [],
        communications: [],
        assignedTo: 'user1',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-20T14:45:00Z'
      },
      {
        id: '2',
        studentId: '2',
        student: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@email.com'
        },
        universityId: '2',
        university: {
          name: 'University of Oxford',
          country: 'UK'
        },
        program: 'Business Administration',
        intake: 'Spring 2024',
        status: 'APPROVED',
        documents: ['transcript.pdf', 'passport.pdf', 'recommendation.pdf'],
        payments: [],
        communications: [],
        assignedTo: 'user2',
        createdAt: '2024-01-10T09:15:00Z',
        updatedAt: '2024-01-25T11:20:00Z'
      },
      {
        id: '3',
        studentId: '3',
        student: {
          firstName: 'Mike',
          lastName: 'Johnson',
          email: 'mike.johnson@email.com'
        },
        universityId: '3',
        university: {
          name: 'University of Toronto',
          country: 'Canada'
        },
        program: 'Engineering',
        intake: 'Fall 2024',
        status: 'DRAFT',
        documents: ['transcript.pdf'],
        payments: [],
        communications: [],
        assignedTo: 'user1',
        createdAt: '2024-01-18T16:20:00Z',
        updatedAt: '2024-01-18T16:20:00Z'
      }
    ]

    const mockStudents: Student[] = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        status: 'APPLIED'
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@email.com',
        status: 'ACCEPTED'
      },
      {
        id: '3',
        firstName: 'Mike',
        lastName: 'Johnson',
        email: 'mike.johnson@email.com',
        status: 'PROSPECT'
      }
    ]

    const mockUniversities: University[] = [
      {
        id: '1',
        name: 'Harvard University',
        country: 'USA',
        programs: ['Computer Science', 'Business', 'Medicine']
      },
      {
        id: '2',
        name: 'University of Oxford',
        country: 'UK',
        programs: ['Business Administration', 'Law', 'Philosophy']
      },
      {
        id: '3',
        name: 'University of Toronto',
        country: 'Canada',
        programs: ['Engineering', 'Computer Science', 'Medicine']
      }
    ]

    setApplications(mockApplications)
    setStudents(mockStudents)
    setUniversities(mockUniversities)
    setFilteredApplications(mockApplications)
  }, [])

  useEffect(() => {
    let filtered = applications

    if (searchTerm) {
      filtered = filtered.filter(app =>
        app.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.university.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.program.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter)
    }

    setFilteredApplications(filtered)
  }, [applications, searchTerm, statusFilter])

  const handleAddApplication = () => {
    const student = students.find(s => s.id === newApplication.studentId)
    const university = universities.find(u => u.id === newApplication.universityId)

    if (!student || !university) return

    const application: Application = {
      id: Date.now().toString(),
      studentId: newApplication.studentId,
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email
      },
      universityId: newApplication.universityId,
      university: {
        name: university.name,
        country: university.country
      },
      program: newApplication.program,
      intake: newApplication.intake,
      status: newApplication.status as any,
      documents: [],
      payments: [],
      communications: [],
      assignedTo: 'user1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setApplications([...applications, application])
    setNewApplication({
      studentId: '',
      universityId: '',
      program: '',
      intake: '',
      status: 'DRAFT'
    })
    setIsAddDialogOpen(false)
  }

  const handleDeleteApplication = (id: string) => {
    setApplications(applications.filter(app => app.id !== id))
  }

  const getWorkflowProgress = (status: string) => {
    const progressMap = {
      DRAFT: 10,
      SUBMITTED: 30,
      UNDER_REVIEW: 60,
      APPROVED: 100,
      REJECTED: 0,
      WITHDRAWN: 0
    }
    return progressMap[status as keyof typeof progressMap] || 0
  }

  const getWorkflowSteps = (status: string) => {
    const steps = [
      { key: 'draft', label: 'Draft', completed: true },
      { key: 'submitted', label: 'Submitted', completed: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(status) },
      { key: 'review', label: 'Under Review', completed: ['UNDER_REVIEW', 'APPROVED'].includes(status) },
      { key: 'approved', label: 'Approved', completed: status === 'APPROVED' }
    ]
    return steps
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground">
            Manage student applications and track progress
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Application</DialogTitle>
              <DialogDescription>
                Create a new university application for a student
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="student" className="text-right">
                  Student
                </Label>
                <Select
                  value={newApplication.studentId}
                  onValueChange={(value) => setNewApplication({...newApplication, studentId: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.firstName} {student.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="university" className="text-right">
                  University
                </Label>
                <Select
                  value={newApplication.universityId}
                  onValueChange={(value) => setNewApplication({...newApplication, universityId: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select university" />
                  </SelectTrigger>
                  <SelectContent>
                    {universities.map((university) => (
                      <SelectItem key={university.id} value={university.id}>
                        {university.name} - {university.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="program" className="text-right">
                  Program
                </Label>
                <Input
                  id="program"
                  value={newApplication.program}
                  onChange={(e) => setNewApplication({...newApplication, program: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="intake" className="text-right">
                  Intake
                </Label>
                <Input
                  id="intake"
                  value={newApplication.intake}
                  onChange={(e) => setNewApplication({...newApplication, intake: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g., Fall 2024"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select
                  value={newApplication.status}
                  onValueChange={(value) => setNewApplication({...newApplication, status: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddApplication}>Create Application</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
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
            <div className="text-2xl font-bold">
              {applications.filter(app => app.status === 'UNDER_REVIEW').length}
            </div>
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
            <div className="text-2xl font-bold">
              {applications.filter(app => app.status === 'APPROVED').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successful applications
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.length > 0 
                ? Math.round((applications.filter(app => app.status === 'APPROVED').length / applications.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Approval rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Application List</CardTitle>
          <CardDescription>
            View and manage all student applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>University</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Intake</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {application.student.firstName} {application.student.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {application.student.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{application.university.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {application.university.country}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{application.program}</TableCell>
                  <TableCell>{application.intake}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[application.status]}>
                      {statusLabels[application.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="w-20">
                      <Progress value={getWorkflowProgress(application.status)} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {getWorkflowProgress(application.status)}%
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(application.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedApplication(application)
                          setIsViewDialogOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteApplication(application.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Application Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              View detailed application information and workflow progress
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="communications">Communications</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Student</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedApplication.student.firstName} {selectedApplication.student.lastName}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">University</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedApplication.university.name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Program</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedApplication.program}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Intake</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedApplication.intake}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <Badge className={statusColors[selectedApplication.status]}>
                        {statusLabels[selectedApplication.status]}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Created</Label>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedApplication.createdAt), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="workflow" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Application Progress</Label>
                      <Progress value={getWorkflowProgress(selectedApplication.status)} className="mt-2" />
                      <p className="text-sm text-muted-foreground mt-2">
                        {getWorkflowProgress(selectedApplication.status)}% Complete
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Workflow Steps</Label>
                      <div className="space-y-2">
                        {getWorkflowSteps(selectedApplication.status).map((step, index) => (
                          <div key={step.key} className="flex items-center space-x-3">
                            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                              step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                              {step.completed ? '✓' : index + 1}
                            </div>
                            <span className={`text-sm ${
                              step.completed ? 'text-green-600 font-medium' : 'text-gray-500'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="documents" className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Submitted Documents</Label>
                    {selectedApplication.documents.length > 0 ? (
                      <div className="space-y-2">
                        {selectedApplication.documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm">{doc}</span>
                            </div>
                            <Button variant="ghost" size="sm">View</Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No documents uploaded</p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="communications" className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Communication History</Label>
                    {selectedApplication.communications.length > 0 ? (
                      <div className="space-y-2">
                        {selectedApplication.communications.map((comm, index) => (
                          <div key={index} className="p-3 border rounded">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{comm.type}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comm.date), 'MMM dd, yyyy')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{comm.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No communications recorded</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}