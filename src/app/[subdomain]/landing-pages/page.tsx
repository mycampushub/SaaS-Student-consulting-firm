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
import { 
  Plus,
  Search,
  Filter,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
  Eye,
  Settings,
  Play,
  Pause,
  BarChart3,
  Layout,
  Type,
  Image,
  Video,
  Button as ButtonIcon,
  Input as InputIcon,
  FileText,
  MapPin,
  Mail,
  Phone,
  Users,
  Star,
  ChevronRight,
  Grid,
  List,
  MousePointer2,
  Move,
  Save,
  X
} from "lucide-react"

interface LandingPage {
  id: string
  name: string
  slug: string
  title?: string
  description?: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  viewCount: number
  conversionCount: number
  publishedAt?: string
  form?: {
    id: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

interface Form {
  id: string
  name: string
  submissionCount: number
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
}

interface PageElement {
  id: string
  type: 'header' | 'text' | 'image' | 'video' | 'button' | 'form' | 'testimonial' | 'features' | 'cta'
  content: any
  styles: any
  position: { x: number; y: number }
  size: { width: number; height: number }
}

export default function LandingPagesPage() {
  const params = useParams()
  const subdomain = params.subdomain as string
  
  const [landingPages, setLandingPages] = useState<LandingPage[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreatePageOpen, setIsCreatePageOpen] = useState(false)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Builder state
  const [builderElements, setBuilderElements] = useState<PageElement[]>([])
  const [selectedElement, setSelectedElement] = useState<PageElement | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  // Mock data for demonstration
  const mockLandingPages: LandingPage[] = [
    {
      id: "1",
      name: "Spring Intake 2024",
      slug: "spring-intake-2024",
      title: "Apply for Spring Intake 2024",
      description: "Join thousands of students starting their journey this spring",
      status: "PUBLISHED",
      viewCount: 2540,
      conversionCount: 156,
      publishedAt: "2024-01-15",
      form: {
        id: "1",
        name: "Spring Intake Application"
      },
      createdAt: "2024-01-10",
      updatedAt: "2024-01-20"
    },
    {
      id: "2",
      name: "Scholarship Guide",
      slug: "scholarship-guide",
      title: "Complete Scholarship Guide 2024",
      description: "Discover scholarships that match your profile",
      status: "PUBLISHED",
      viewCount: 1890,
      conversionCount: 89,
      publishedAt: "2024-01-12",
      form: {
        id: "2",
        name: "Scholarship Inquiry"
      },
      createdAt: "2024-01-08",
      updatedAt: "2024-01-18"
    },
    {
      id: "3",
      name: "University Partners",
      slug: "university-partners",
      title: "Our University Partners",
      description: "Learn about our partner universities worldwide",
      status: "DRAFT",
      viewCount: 0,
      conversionCount: 0,
      createdAt: "2024-01-20",
      updatedAt: "2024-01-20"
    }
  ]

  const mockForms: Form[] = [
    {
      id: "1",
      name: "Spring Intake Application",
      submissionCount: 156,
      status: "ACTIVE"
    },
    {
      id: "2",
      name: "Scholarship Inquiry",
      submissionCount: 89,
      status: "ACTIVE"
    },
    {
      id: "3",
      name: "General Inquiry",
      submissionCount: 45,
      status: "ACTIVE"
    }
  ]

  const mockBuilderElements: PageElement[] = [
    {
      id: "1",
      type: "header",
      content: { text: "Welcome to Our Agency", level: 1 },
      styles: { fontSize: 48, fontWeight: "bold", textAlign: "center" },
      position: { x: 50, y: 50 },
      size: { width: 600, height: 80 }
    },
    {
      id: "2",
      type: "text",
      content: { text: "Start your educational journey with us today" },
      styles: { fontSize: 18, textAlign: "center" },
      position: { x: 50, y: 150 },
      size: { width: 600, height: 40 }
    },
    {
      id: "3",
      type: "button",
      content: { text: "Get Started", action: "submit" },
      styles: { backgroundColor: "#3B82F6", color: "white", padding: "12px 24px" },
      position: { x: 250, y: 220 },
      size: { width: 200, height: 50 }
    }
  ]

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setLandingPages(mockLandingPages)
      setForms(mockForms)
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "bg-green-100 text-green-800"
      case "DRAFT": return "bg-yellow-100 text-yellow-800"
      case "ARCHIVED": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getElementIcon = (type: string) => {
    switch (type) {
      case "header": return <Type className="h-4 w-4" />
      case "text": return <FileText className="h-4 w-4" />
      case "image": return (
      <>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image className="h-4 w-4" />
      </>
    )
      case "video": return <Video className="h-4 w-4" />
      case "button": return <ButtonIcon className="h-4 w-4" />
      case "form": return <InputIcon className="h-4 w-4" />
      case "testimonial": return <Star className="h-4 w-4" />
      case "features": return <Grid className="h-4 w-4" />
      case "cta": return <BarChart3 className="h-4 w-4" />
      default: return <Layout className="h-4 w-4" />
    }
  }

  const filteredLandingPages = landingPages.filter(page => {
    const matchesSearch = page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         page.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         page.slug.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || page.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const openBuilder = (page?: LandingPage) => {
    setSelectedPage(page || null)
    setBuilderElements(page ? mockBuilderElements : [])
    setIsBuilderOpen(true)
  }

  const addElement = (type: PageElement['type']) => {
    const newElement: PageElement = {
      id: Date.now().toString(),
      type,
      content: getDefaultContent(type),
      styles: getDefaultStyles(type),
      position: { x: 50, y: 50 + builderElements.length * 100 },
      size: getDefaultSize(type)
    }
    setBuilderElements([...builderElements, newElement])
  }

  const getDefaultContent = (type: PageElement['type']) => {
    switch (type) {
      case "header": return { text: "New Header", level: 2 }
      case "text": return { text: "Your text here..." }
      case "button": return { text: "Click Me", action: "link" }
      case "testimonial": return { text: "Great service!", author: "Happy Client" }
      case "features": return { items: ["Feature 1", "Feature 2", "Feature 3"] }
      case "cta": return { title: "Call to Action", description: "Take action now!" }
      default: return {}
    }
  }

  const getDefaultStyles = (type: PageElement['type']) => {
    switch (type) {
      case "header": return { fontSize: 32, fontWeight: "bold" }
      case "text": return { fontSize: 16 }
      case "button": return { backgroundColor: "#3B82F6", color: "white", padding: "10px 20px" }
      default: return {}
    }
  }

  const getDefaultSize = (type: PageElement['type']) => {
    switch (type) {
      case "header": return { width: 400, height: 60 }
      case "text": return { width: 400, height: 40 }
      case "button": return { width: 150, height: 45 }
      case "image": return { width: 300, height: 200 }
      case "video": return { width: 400, height: 225 }
      case "form": return { width: 400, height: 300 }
      default: return { width: 400, height: 100 }
    }
  }

  const renderElement = (element: PageElement) => {
    const isSelected = selectedElement?.id === element.id
    const elementStyle = {
      ...element.styles,
      position: 'absolute' as const,
      left: `${element.position.x}px`,
      top: `${element.position.y}px`,
      width: `${element.size.width}px`,
      height: `${element.size.height}px`,
      border: isSelected ? '2px solid #3B82F6' : '1px dashed #ccc',
      cursor: 'move'
    }

    switch (element.type) {
      case "header":
        const HeaderTag = `h${element.content.level || 2}` as keyof JSX.IntrinsicElements
        return (
          <HeaderTag 
            style={elementStyle}
            onClick={() => setSelectedElement(element)}
            className="select-none"
          >
            {element.content.text}
          </HeaderTag>
        )
      case "text":
        return (
          <p 
            style={elementStyle}
            onClick={() => setSelectedElement(element)}
            className="select-none"
          >
            {element.content.text}
          </p>
        )
      case "button":
        return (
          <button 
            style={elementStyle}
            onClick={() => setSelectedElement(element)}
            className="select-none rounded"
          >
            {element.content.text}
          </button>
        )
      case "image":
        return (
          <div 
            style={elementStyle}
            onClick={() => setSelectedElement(element)}
            className="bg-gray-200 flex items-center justify-center select-none"
          >
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="h-8 w-8 text-gray-400" />
          </div>
        )
      default:
        return (
          <div 
            style={elementStyle}
            onClick={() => setSelectedElement(element)}
            className="flex items-center justify-center bg-gray-100 select-none"
          >
            <span className="text-sm text-gray-500">{element.type}</span>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading landing pages...</p>
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
                <h1 className="text-xl font-bold">Landing Page Builder</h1>
                <p className="text-sm text-muted-foreground">{subdomain}.eduagency.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Dialog open={isCreatePageOpen} onOpenChange={setIsCreatePageOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Page
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Landing Page</DialogTitle>
                    <DialogDescription>Build a new landing page with drag-and-drop</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="pageName">Page Name</Label>
                      <Input id="pageName" placeholder="Enter page name" />
                    </div>
                    <div>
                      <Label htmlFor="pageSlug">URL Slug</Label>
                      <Input id="pageSlug" placeholder="url-slug" />
                    </div>
                    <div>
                      <Label htmlFor="pageTitle">Page Title</Label>
                      <Input id="pageTitle" placeholder="SEO title" />
                    </div>
                    <div>
                      <Label htmlFor="pageDescription">Description</Label>
                      <Textarea id="pageDescription" placeholder="SEO description" />
                    </div>
                    <div>
                      <Label htmlFor="pageForm">Associated Form (optional)</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select form" />
                        </SelectTrigger>
                        <SelectContent>
                          {forms.map(form => (
                            <SelectItem key={form.id} value={form.id}>
                              {form.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        setIsCreatePageOpen(false)
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
              <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
              <Layout className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{landingPages.length}</div>
              <p className="text-xs text-muted-foreground">
                {landingPages.filter(p => p.status === 'PUBLISHED').length} published
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {landingPages.reduce((sum, p) => sum + p.viewCount, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all pages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {landingPages.reduce((sum, p) => sum + p.conversionCount, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Total form submissions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <MousePointer2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {landingPages.length > 0 ? 
                  ((landingPages.reduce((sum, p) => sum + p.conversionCount, 0) / 
                    landingPages.reduce((sum, p) => sum + p.viewCount, 0)) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average conversion rate
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pages" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pages">Landing Pages</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="pages" className="space-y-6">
            {/* Page Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search pages..."
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
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>

            {/* Pages Grid/List */}
            {viewMode === "grid" ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLandingPages.map((page) => (
                  <Card key={page.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{page.name}</CardTitle>
                          <CardDescription className="text-sm">
                            /{page.slug}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(page.status)}>
                          {page.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Page Preview */}
                        <div className="bg-muted rounded-lg p-4 h-32 flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <Layout className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm">Page Preview</p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Views</div>
                            <div className="font-medium">{page.viewCount.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Conversions</div>
                            <div className="font-medium">{page.conversionCount}</div>
                          </div>
                        </div>

                        {/* Form Info */}
                        {page.form && (
                          <div className="text-xs text-muted-foreground">
                            Form: {page.form.name}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => openBuilder(page)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
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
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Landing Pages</CardTitle>
                  <CardDescription>Manage all your landing pages</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Conversions</TableHead>
                        <TableHead>Conversion Rate</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLandingPages.map((page) => {
                        const conversionRate = page.viewCount > 0 ? (page.conversionCount / page.viewCount) * 100 : 0
                        return (
                          <TableRow key={page.id}>
                            <TableCell className="font-medium">{page.name}</TableCell>
                            <TableCell>/{page.slug}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(page.status)}>
                                {page.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{page.viewCount.toLocaleString()}</TableCell>
                            <TableCell>{page.conversionCount}</TableCell>
                            <TableCell>{conversionRate.toFixed(1)}%</TableCell>
                            <TableCell>{new Date(page.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openBuilder(page)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: "Lead Generation", description: "Capture leads with forms", category: "Business" },
                { name: "Webinar Landing", description: "Promote your online events", category: "Events" },
                { name: "Product Launch", description: "Showcase new offerings", category: "Marketing" },
                { name: "Contact Page", description: "Simple contact information", category: "Basic" },
                { name: "Coming Soon", description: "Build anticipation", category: "Marketing" },
                { name: "Thank You Page", description: "Post-conversion page", category: "Basic" }
              ].map((template, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-muted rounded-lg p-4 h-32 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <Layout className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Template Preview</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">{template.category}</Badge>
                        <Button size="sm">Use Template</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Page Performance</CardTitle>
                  <CardDescription>Views and conversions by page</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {landingPages.map((page) => {
                      const conversionRate = page.viewCount > 0 ? (page.conversionCount / page.viewCount) * 100 : 0
                      return (
                        <div key={page.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <div className="font-medium">{page.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {page.status} • /{page.slug}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{page.conversionCount} conversions</div>
                            <div className="text-xs text-muted-foreground">
                              {conversionRate.toFixed(1)}% rate
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Pages</CardTitle>
                  <CardDescription>Pages with highest conversion rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {landingPages
                      .sort((a, b) => {
                        const rateA = a.viewCount > 0 ? a.conversionCount / a.viewCount : 0
                        const rateB = b.viewCount > 0 ? b.conversionCount / b.viewCount : 0
                        return rateB - rateA
                      })
                      .slice(0, 5)
                      .map((page, index) => {
                        const conversionRate = page.viewCount > 0 ? (page.conversionCount / page.viewCount) * 100 : 0
                        return (
                          <div key={page.id} className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{page.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {conversionRate.toFixed(1)}% conversion rate
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{page.conversionCount}</div>
                              <div className="text-xs text-muted-foreground">conversions</div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Page Builder Modal */}
      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] p-0">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-80 bg-muted border-r p-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Page Elements</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'header', label: 'Header' },
                      { type: 'text', label: 'Text' },
                      { type: 'image', label: 'Image' },
                      { type: 'video', label: 'Video' },
                      { type: 'button', label: 'Button' },
                      { type: 'form', label: 'Form' },
                      { type: 'testimonial', label: 'Testimonial' },
                      { type: 'features', label: 'Features' },
                      { type: 'cta', label: 'CTA' }
                    ].map((element) => (
                      <Button
                        key={element.type}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => addElement(element.type as PageElement['type'])}
                      >
                        {getElementIcon(element.type)}
                        <span className="ml-2">{element.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedElement && (
                  <div>
                    <h3 className="font-medium mb-2">Element Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <Label>Content</Label>
                        <Input
                          value={selectedElement.content.text || ''}
                          onChange={(e) => {
                            const updated = builderElements.map(el => 
                              el.id === selectedElement.id 
                                ? { ...el, content: { ...el.content, text: e.target.value } }
                                : el
                            )
                            setBuilderElements(updated)
                            setSelectedElement(updated.find(el => el.id === selectedElement.id) || null)
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Width</Label>
                          <Input
                            type="number"
                            value={selectedElement.size.width}
                            onChange={(e) => {
                              const updated = builderElements.map(el => 
                                el.id === selectedElement.id 
                                  ? { ...el, size: { ...el.size, width: parseInt(e.target.value) } }
                                  : el
                              )
                              setBuilderElements(updated)
                              setSelectedElement(updated.find(el => el.id === selectedElement.id) || null)
                            }}
                          />
                        </div>
                        <div>
                          <Label>Height</Label>
                          <Input
                            type="number"
                            value={selectedElement.size.height}
                            onChange={(e) => {
                              const updated = builderElements.map(el => 
                                el.id === selectedElement.id 
                                  ? { ...el, size: { ...el.size, height: parseInt(e.target.value) } }
                                  : el
                              )
                              setBuilderElements(updated)
                              setSelectedElement(updated.find(el => el.id === selectedElement.id) || null)
                            }}
                          />
                        </div>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setBuilderElements(builderElements.filter(el => el.id !== selectedElement.id))
                          setSelectedElement(null)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Element
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Builder Area */}
            <div className="flex-1 flex flex-col">
              {/* Builder Header */}
              <div className="border-b p-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">
                    {selectedPage ? `Editing: ${selectedPage.name}` : 'New Landing Page'}
                  </h2>
                  <p className="text-sm text-muted-foreground">Drag and drop elements to build your page</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={isPreviewMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {isPreviewMode ? 'Edit' : 'Preview'}
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
              <div className="flex-1 p-8 overflow-auto bg-gray-50">
                <div className="bg-white min-h-full shadow-lg relative" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                  {builderElements.map(renderElement)}
                  {builderElements.length === 0 && (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      <div className="text-center">
                        <Layout className="h-12 w-12 mx-auto mb-4" />
                        <p>Drag elements from the sidebar to start building</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}