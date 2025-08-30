"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Copy,
  Eye,
  Settings,
  Play,
  Pause,
  BarChart3,
  Code,
  ExternalLink,
  FileText,
  Input as InputIcon,
  Mail,
  Phone,
  MessageSquare,
  CheckSquare,
  Radio,
  Calendar,
  Image,
  File,
  MapPin,
  Users,
  Facebook,
  Chrome,
  Webhook,
  Save,
  X,
  GripVertical,
  Plus as PlusIcon,
  Minus
} from "lucide-react"

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file' | 'number'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
  mapping?: {
    facebook?: string
    google?: string
  }
}

interface Form {
  id: string
  name: string
  description?: string
  fields: FormField[]
  submitButton: string
  successMessage: string
  redirectUrl?: string
  facebookLeadId?: string
  googleLeadId?: string
  webhookUrl?: string
  submissionCount: number
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
  submissions: FormSubmission[]
}

interface FormSubmission {
  id: string
  data: Record<string, any>
  source?: string
  sourceUrl?: string
  ipAddress?: string
  createdAt: string
}

export default function FormsPage() {
  const params = useParams()
  const subdomain = params.subdomain as string
  
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Builder state
  const [builderFields, setBuilderFields] = useState<FormField[]>([])
  const [selectedField, setSelectedField] = useState<FormField | null>(null)
  const [formSettings, setFormSettings] = useState({
    name: "",
    description: "",
    submitButton: "Submit",
    successMessage: "Thank you for your submission!",
    redirectUrl: "",
    facebookLeadId: "",
    googleLeadId: "",
    webhookUrl: ""
  })

  // Mock data for demonstration
  const mockForms: Form[] = [
    {
      id: "1",
      name: "Student Application",
      description: "Main student application form",
      fields: [
        { id: "1", type: "text", label: "First Name", required: true },
        { id: "2", type: "text", label: "Last Name", required: true },
        { id: "3", type: "email", label: "Email", required: true },
        { id: "4", type: "phone", label: "Phone", required: false },
        { id: "5", type: "select", label: "Country of Interest", required: true, options: ["USA", "UK", "Canada", "Australia"] }
      ],
      submitButton: "Apply Now",
      successMessage: "Thank you for your application! We'll contact you soon.",
      facebookLeadId: "fb_lead_123",
      googleLeadId: "google_lead_456",
      submissionCount: 156,
      status: "ACTIVE",
      createdAt: "2024-01-10",
      updatedAt: "2024-01-20",
      submissions: []
    },
    {
      id: "2",
      name: "Scholarship Inquiry",
      description: "Form for scholarship information requests",
      fields: [
        { id: "1", type: "text", label: "Full Name", required: true },
        { id: "2", type: "email", label: "Email", required: true },
        { id: "3", type: "textarea", label: "Tell us about yourself", required: true }
      ],
      submitButton: "Get Scholarship Info",
      successMessage: "Scholarship information will be sent to your email.",
      submissionCount: 89,
      status: "ACTIVE",
      createdAt: "2024-01-08",
      updatedAt: "2024-01-18",
      submissions: []
    },
    {
      id: "3",
      name: "Contact Us",
      description: "General contact form",
      fields: [
        { id: "1", type: "text", label: "Name", required: true },
        { id: "2", type: "email", label: "Email", required: true },
        { id: "3", type: "textarea", label: "Message", required: true }
      ],
      submitButton: "Send Message",
      successMessage: "Thank you for contacting us! We'll get back to you soon.",
      webhookUrl: "https://hooks.zapier.com/hooks/catch/123456/abcde/",
      submissionCount: 45,
      status: "ACTIVE",
      createdAt: "2024-01-05",
      updatedAt: "2024-01-15",
      submissions: []
    }
  ]

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setForms(mockForms)
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800"
      case "INACTIVE": return "bg-red-100 text-red-800"
      case "ARCHIVED": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case "text": return <InputIcon className="h-4 w-4" />
      case "email": return <Mail className="h-4 w-4" />
      case "phone": return <Phone className="h-4 w-4" />
      case "textarea": return <MessageSquare className="h-4 w-4" />
      case "select": return <FileText className="h-4 w-4" />
      case "checkbox": return <CheckSquare className="h-4 w-4" />
      case "radio": return <Radio className="h-4 w-4" />
      case "date": return <Calendar className="h-4 w-4" />
      case "file": return <File className="h-4 w-4" />
      case "number": return <InputIcon className="h-4 w-4" />
      default: return <InputIcon className="h-4 w-4" />
    }
  }

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         form.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || form.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const openBuilder = (form?: Form) => {
    setSelectedForm(form || null)
    if (form) {
      setBuilderFields(form.fields)
      setFormSettings({
        name: form.name,
        description: form.description || "",
        submitButton: form.submitButton,
        successMessage: form.successMessage,
        redirectUrl: form.redirectUrl || "",
        facebookLeadId: form.facebookLeadId || "",
        googleLeadId: form.googleLeadId || "",
        webhookUrl: form.webhookUrl || ""
      })
    } else {
      setBuilderFields([])
      setFormSettings({
        name: "",
        description: "",
        submitButton: "Submit",
        successMessage: "Thank you for your submission!",
        redirectUrl: "",
        facebookLeadId: "",
        googleLeadId: "",
        webhookUrl: ""
      })
    }
    setIsBuilderOpen(true)
  }

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: getDefaultLabel(type),
      placeholder: getDefaultPlaceholder(type),
      required: false,
      options: getDefaultOptions(type),
      mapping: {}
    }
    setBuilderFields([...builderFields, newField])
  }

  const getDefaultLabel = (type: FormField['type']) => {
    switch (type) {
      case "text": return "Text Field"
      case "email": return "Email Address"
      case "phone": return "Phone Number"
      case "textarea": return "Message"
      case "select": return "Select Option"
      case "checkbox": return "Checkbox"
      case "radio": return "Radio Button"
      case "date": return "Date"
      case "file": return "File Upload"
      case "number": return "Number"
      default: return "Field"
    }
  }

  const getDefaultPlaceholder = (type: FormField['type']) => {
    switch (type) {
      case "text": return "Enter text..."
      case "email": return "Enter email..."
      case "phone": return "Enter phone..."
      case "textarea": return "Enter message..."
      case "select": return "Choose an option..."
      case "number": return "Enter number..."
      default: return ""
    }
  }

  const getDefaultOptions = (type: FormField['type']) => {
    switch (type) {
      case "select":
      case "radio":
        return ["Option 1", "Option 2", "Option 3"]
      case "checkbox":
        return ["Option 1", "Option 2"]
      default:
        return undefined
    }
  }

  const removeField = (fieldId: string) => {
    setBuilderFields(builderFields.filter(field => field.id !== fieldId))
    if (selectedField?.id === fieldId) {
      setSelectedField(null)
    }
  }

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const index = builderFields.findIndex(field => field.id === fieldId)
    if (index === -1) return

    const newFields = [...builderFields]
    if (direction === 'up' && index > 0) {
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]]
    } else if (direction === 'down' && index < newFields.length - 1) {
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]]
    }
    setBuilderFields(newFields)
  }

  const renderFieldPreview = (field: FormField) => {
    const baseClasses = "w-full p-2 border rounded-md"
    
    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "number":
        return (
          <input
            type={field.type}
            placeholder={field.placeholder}
            className={baseClasses}
            disabled
          />
        )
      case "textarea":
        return (
          <textarea
            placeholder={field.placeholder}
            className={baseClasses}
            rows={3}
            disabled
          />
        )
      case "select":
        return (
          <select className={baseClasses} disabled>
            <option value="">{field.placeholder}</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        )
      case "checkbox":
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input type="checkbox" disabled />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )
      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input type="radio" name={`radio-${field.id}`} disabled />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )
      case "date":
        return (
          <input
            type="date"
            className={baseClasses}
            disabled
          />
        )
      case "file":
        return (
          <input
            type="file"
            className={baseClasses}
            disabled
          />
        )
      default:
        return <input type="text" className={baseClasses} disabled />
    }
  }

  const generateEmbedCode = (form: Form) => {
    return `<script src="https://${subdomain}.eduagency.com/forms/embed/${form.id}"></script>`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading forms...</p>
        </div>
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
                <h1 className="text-xl font-bold">Form Builder</h1>
                <p className="text-sm text-muted-foreground">{subdomain}.eduagency.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Form
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Form</DialogTitle>
                    <DialogDescription>Build a custom form with drag-and-drop</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="formName">Form Name</Label>
                      <Input id="formName" placeholder="Enter form name" />
                    </div>
                    <div>
                      <Label htmlFor="formDescription">Description</Label>
                      <Textarea id="formDescription" placeholder="Describe your form" />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        setIsCreateFormOpen(false)
                        openBuilder()
                      }}
                    >
                      Create & Open Builder
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{forms.length}</div>
              <p className="text-xs text-muted-foreground">
                {forms.filter(f => f.status === 'ACTIVE').length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {forms.reduce((sum, f) => sum + f.submissionCount, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all forms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facebook Integration</CardTitle>
              <Facebook className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {forms.filter(f => f.facebookLeadId).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Connected to Facebook
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Google Integration</CardTitle>
              <Chrome className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {forms.filter(f => f.googleLeadId).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Connected to Google
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="forms" className="space-y-6">
          <TabsList>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="forms" className="space-y-6">
            {/* Form Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search forms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>

            {/* Forms Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredForms.map((form) => (
                <Card key={form.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{form.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {form.description}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(form.status)}>
                        {form.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Form Fields Preview */}
                      <div className="space-y-2">
                        {form.fields.slice(0, 3).map((field) => (
                          <div key={field.id} className="flex items-center gap-2 text-sm">
                            {getFieldTypeIcon(field.type)}
                            <span className="truncate">{field.label}</span>
                            {field.required && (
                              <span className="text-red-500 text-xs">*</span>
                            )}
                          </div>
                        ))}
                        {form.fields.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{form.fields.length - 3} more fields
                          </div>
                        )}
                      </div>

                      {/* Integration Status */}
                      <div className="flex gap-2">
                        {form.facebookLeadId && (
                          <Badge variant="outline" className="text-xs">
                            <Facebook className="h-3 w-3 mr-1" />
                            Facebook
                          </Badge>
                        )}
                        {form.googleLeadId && (
                          <Badge variant="outline" className="text-xs">
                            <Chrome className="h-3 w-3 mr-1" />
                            Google
                          </Badge>
                        )}
                        {form.webhookUrl && (
                          <Badge variant="outline" className="text-xs">
                            <Webhook className="h-3 w-3 mr-1" />
                            Webhook
                          </Badge>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Submissions</div>
                          <div className="font-medium">{form.submissionCount}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Fields</div>
                          <div className="font-medium">{form.fields.length}</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => openBuilder(form)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Code className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
                <CardDescription>Latest form submissions across all forms</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form</TableHead>
                      <TableHead>Submitter</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forms.flatMap(form => 
                      form.submissions.map((submission, index) => (
                        <TableRow key={`${form.id}-${index}`}>
                          <TableCell className="font-medium">{form.name}</TableCell>
                          <TableCell>{submission.data.firstName || submission.data.name || 'N/A'}</TableCell>
                          <TableCell>{submission.data.email || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{submission.source || 'Direct'}</Badge>
                          </TableCell>
                          <TableCell>{new Date(submission.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Facebook className="h-5 w-5" />
                    Facebook Lead Ads
                  </CardTitle>
                  <CardDescription>
                    Connect your forms to Facebook Lead Ads for seamless lead generation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {forms.filter(f => f.facebookLeadId).map(form => (
                      <div key={form.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">{form.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Lead ID: {form.facebookLeadId}
                          </div>
                        </div>
                        <Switch checked={true} />
                      </div>
                    ))}
                  </div>
                  <Button className="w-full">
                    <Facebook className="h-4 w-4 mr-2" />
                    Connect Facebook Account
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Chrome className="h-5 w-5" />
                    Google Lead Forms
                  </CardTitle>
                  <CardDescription>
                    Integrate with Google Lead Forms to capture leads from Google Ads
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {forms.filter(f => f.googleLeadId).map(form => (
                      <div key={form.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">{form.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Lead ID: {form.googleLeadId}
                          </div>
                        </div>
                        <Switch checked={true} />
                      </div>
                    ))}
                  </div>
                  <Button className="w-full">
                    <Chrome className="h-4 w-4 mr-2" />
                    Connect Google Account
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhook Integration
                  </CardTitle>
                  <CardDescription>
                    Send form submissions to external applications via webhooks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {forms.filter(f => f.webhookUrl).map(form => (
                      <div key={form.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">{form.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {form.webhookUrl}
                          </div>
                        </div>
                        <Switch checked={true} />
                      </div>
                    ))}
                  </div>
                  <Button className="w-full">
                    <Webhook className="h-4 w-4 mr-2" />
                    Configure Webhooks
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Form Performance</CardTitle>
                  <CardDescription>Submissions and conversion rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {forms.map((form) => (
                      <div key={form.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">{form.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {form.fields.length} fields • {form.status}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{form.submissionCount} submissions</div>
                          <div className="text-xs text-muted-foreground">
                            Total
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Integration Usage</CardTitle>
                  <CardDescription>How forms are using integrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Facebook className="h-4 w-4" />
                        <span>Facebook Lead Ads</span>
                      </div>
                      <span className="text-sm font-medium">
                        {forms.filter(f => f.facebookLeadId).length} forms
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Chrome className="h-4 w-4" />
                        <span>Google Lead Forms</span>
                      </div>
                      <span className="text-sm font-medium">
                        {forms.filter(f => f.googleLeadId).length} forms
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Webhook className="h-4 w-4" />
                        <span>Webhooks</span>
                      </div>
                      <span className="text-sm font-medium">
                        {forms.filter(f => f.webhookUrl).length} forms
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Form Builder Modal */}
      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] p-0">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-80 bg-muted border-r p-4 overflow-y-auto">
              <div className="space-y-6">
                {/* Form Settings */}
                <div>
                  <h3 className="font-medium mb-3">Form Settings</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>Form Name</Label>
                      <Input
                        value={formSettings.name}
                        onChange={(e) => setFormSettings({...formSettings, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={formSettings.description}
                        onChange={(e) => setFormSettings({...formSettings, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Submit Button Text</Label>
                      <Input
                        value={formSettings.submitButton}
                        onChange={(e) => setFormSettings({...formSettings, submitButton: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Success Message</Label>
                      <Textarea
                        value={formSettings.successMessage}
                        onChange={(e) => setFormSettings({...formSettings, successMessage: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Redirect URL (optional)</Label>
                      <Input
                        value={formSettings.redirectUrl}
                        onChange={(e) => setFormSettings({...formSettings, redirectUrl: e.target.value})}
                        placeholder="https://example.com/thank-you"
                      />
                    </div>
                  </div>
                </div>

                {/* Field Types */}
                <div>
                  <h3 className="font-medium mb-3">Add Fields</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { type: 'text', label: 'Text Input' },
                      { type: 'email', label: 'Email' },
                      { type: 'phone', label: 'Phone' },
                      { type: 'textarea', label: 'Text Area' },
                      { type: 'select', label: 'Dropdown' },
                      { type: 'checkbox', label: 'Checkboxes' },
                      { type: 'radio', label: 'Radio Buttons' },
                      { type: 'date', label: 'Date' },
                      { type: 'file', label: 'File Upload' },
                      { type: 'number', label: 'Number' }
                    ].map((fieldType) => (
                      <Button
                        key={fieldType.type}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => addField(fieldType.type as FormField['type'])}
                      >
                        {getFieldTypeIcon(fieldType.type)}
                        <span className="ml-2">{fieldType.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Integrations */}
                <div>
                  <h3 className="font-medium mb-3">Integrations</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Facebook className="h-4 w-4" />
                        Facebook Lead Ad ID
                      </Label>
                      <Input
                        value={formSettings.facebookLeadId}
                        onChange={(e) => setFormSettings({...formSettings, facebookLeadId: e.target.value})}
                        placeholder="Enter Facebook Lead Ad ID"
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Chrome className="h-4 w-4" />
                        Google Lead Form ID
                      </Label>
                      <Input
                        value={formSettings.googleLeadId}
                        onChange={(e) => setFormSettings({...formSettings, googleLeadId: e.target.value})}
                        placeholder="Enter Google Lead Form ID"
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Webhook className="h-4 w-4" />
                        Webhook URL
                      </Label>
                      <Input
                        value={formSettings.webhookUrl}
                        onChange={(e) => setFormSettings({...formSettings, webhookUrl: e.target.value})}
                        placeholder="https://hooks.zapier.com/..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Builder Area */}
            <div className="flex-1 flex flex-col">
              {/* Builder Header */}
              <div className="border-b p-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">
                    {selectedForm ? `Editing: ${selectedForm.name}` : 'New Form'}
                  </h2>
                  <p className="text-sm text-muted-foreground">Drag fields to reorder, click to edit</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Publish
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsBuilderOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Builder Canvas */}
              <div className="flex-1 p-8 overflow-auto">
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Form Preview */}
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-semibold mb-2">{formSettings.name || "Untitled Form"}</h3>
                    {formSettings.description && (
                      <p className="text-muted-foreground mb-6">{formSettings.description}</p>
                    )}
                    
                    <div className="space-y-4">
                      {builderFields.map((field, index) => (
                        <div key={field.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveField(field.id, 'up')}
                                disabled={index === 0}
                              >
                                <Minus className="h-3 w-3 rotate-90" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveField(field.id, 'down')}
                                disabled={index === builderFields.length - 1}
                              >
                                <Minus className="h-3 w-3 -rotate-90" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedField(field)}
                              >
                                <Settings className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeField(field.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {renderFieldPreview(field)}
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      <Button className="w-full">{formSettings.submitButton}</Button>
                    </div>
                  </div>

                  {builderFields.length === 0 && (
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4" />
                      <p>Add fields from the sidebar to start building your form</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Field Settings Panel */}
              {selectedField && (
                <div className="border-t p-4 bg-muted/50">
                  <div className="max-w-md">
                    <h3 className="font-medium mb-3">Field Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Field Label</Label>
                        <Input
                          value={selectedField.label}
                          onChange={(e) => {
                            const updated = builderFields.map(field => 
                              field.id === selectedField.id 
                                ? { ...field, label: e.target.value }
                                : field
                            )
                            setBuilderFields(updated)
                            setSelectedField(updated.find(f => f.id === selectedField.id) || null)
                          }}
                        />
                      </div>
                      <div>
                        <Label>Placeholder</Label>
                        <Input
                          value={selectedField.placeholder || ''}
                          onChange={(e) => {
                            const updated = builderFields.map(field => 
                              field.id === selectedField.id 
                                ? { ...field, placeholder: e.target.value }
                                : field
                            )
                            setBuilderFields(updated)
                            setSelectedField(updated.find(f => f.id === selectedField.id) || null)
                          }}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="required"
                          checked={selectedField.required}
                          onCheckedChange={(checked) => {
                            const updated = builderFields.map(field => 
                              field.id === selectedField.id 
                                ? { ...field, required: checked }
                                : field
                            )
                            setBuilderFields(updated)
                            setSelectedField(updated.find(f => f.id === selectedField.id) || null)
                          }}
                        />
                        <Label htmlFor="required">Required field</Label>
                      </div>

                      {/* Options for select/radio/checkbox */}
                      {(selectedField.type === 'select' || selectedField.type === 'radio' || selectedField.type === 'checkbox') && (
                        <div>
                          <Label>Options</Label>
                          <div className="space-y-2">
                            {selectedField.options?.map((option, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...(selectedField.options || [])]
                                    newOptions[index] = e.target.value
                                    const updated = builderFields.map(field => 
                                      field.id === selectedField.id 
                                        ? { ...field, options: newOptions }
                                        : field
                                    )
                                    setBuilderFields(updated)
                                    setSelectedField(updated.find(f => f.id === selectedField.id) || null)
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newOptions = [...(selectedField.options || [])]
                                    newOptions.splice(index, 1)
                                    const updated = builderFields.map(field => 
                                      field.id === selectedField.id 
                                        ? { ...field, options: newOptions }
                                        : field
                                    )
                                    setBuilderFields(updated)
                                    setSelectedField(updated.find(f => f.id === selectedField.id) || null)
                                  }}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                const newOptions = [...(selectedField.options || []), 'New Option']
                                const updated = builderFields.map(field => 
                                  field.id === selectedField.id 
                                    ? { ...field, options: newOptions }
                                    : field
                                )
                                setBuilderFields(updated)
                                setSelectedField(updated.find(f => f.id === selectedField.id) || null)
                              }}
                            >
                              <PlusIcon className="h-4 w-4 mr-2" />
                              Add Option
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Field Mapping */}
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Field Mapping</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <Label className="text-xs">Facebook Field</Label>
                            <Input
                              placeholder="e.g., first_name"
                              value={selectedField.mapping?.facebook || ''}
                              onChange={(e) => {
                                const updated = builderFields.map(field => 
                                  field.id === selectedField.id 
                                    ? { 
                                        ...field, 
                                        mapping: { 
                                          ...field.mapping, 
                                          facebook: e.target.value 
                                        } 
                                      }
                                    : field
                                )
                                setBuilderFields(updated)
                                setSelectedField(updated.find(f => f.id === selectedField.id) || null)
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Google Field</Label>
                            <Input
                              placeholder="e.g., firstName"
                              value={selectedField.mapping?.google || ''}
                              onChange={(e) => {
                                const updated = builderFields.map(field => 
                                  field.id === selectedField.id 
                                    ? { 
                                        ...field, 
                                        mapping: { 
                                          ...field.mapping, 
                                          google: e.target.value 
                                        } 
                                      }
                                    : field
                                )
                                setBuilderFields(updated)
                                setSelectedField(updated.find(f => f.id === selectedField.id) || null)
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}