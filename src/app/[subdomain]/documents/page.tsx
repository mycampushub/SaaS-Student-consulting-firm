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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Upload, 
  Download, 
  Search, 
  Filter, 
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Folder,
  Database,
  HardDrive,
  File,
  Image,
  FileVideo,
  FileArchive,
  MoreHorizontal,
  Share2,
  Lock,
  Unlock
} from 'lucide-react'
import { format } from 'date-fns'

interface Document {
  id: string
  name: string
  type: 'PDF' | 'DOC' | 'DOCX' | 'JPG' | 'PNG' | 'MP4' | 'ZIP' | 'OTHER'
  size: number
  category: string
  tags: string[]
  uploadedBy: string
  uploadedAt: string
  lastModified: string
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED'
  isPublic: boolean
  downloadCount: number
  studentId?: string
  universityId?: string
  applicationId?: string
}

interface DocumentFolder {
  id: string
  name: string
  description: string
  documentCount: number
  totalSize: number
  createdAt: string
  isPublic: boolean
}

interface DocumentTemplate {
  id: string
  name: string
  description: string
  category: string
  requiredFields: string[]
  fileUrl: string
}

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'John_Doe_Transcript.pdf',
    type: 'PDF',
    size: 2048000,
    category: 'Academic',
    tags: ['transcript', 'academic', 'john-doe'],
    uploadedBy: 'Sarah Johnson',
    uploadedAt: '2024-01-20T10:30:00Z',
    lastModified: '2024-01-20T10:30:00Z',
    status: 'ACTIVE',
    isPublic: false,
    downloadCount: 3,
    studentId: '1'
  },
  {
    id: '2',
    name: 'Maria_Garcia_Passport.jpg',
    type: 'JPG',
    size: 1024000,
    category: 'Identification',
    tags: ['passport', 'id', 'maria-garcia'],
    uploadedBy: 'Emma Rodriguez',
    uploadedAt: '2024-01-19T14:20:00Z',
    lastModified: '2024-01-19T14:20:00Z',
    status: 'ACTIVE',
    isPublic: false,
    downloadCount: 5,
    studentId: '2'
  },
  {
    id: '3',
    name: 'University_Oxford_Brochure.pdf',
    type: 'PDF',
    size: 5120000,
    category: 'University',
    tags: ['brochure', 'university', 'oxford'],
    uploadedBy: 'Michael Chen',
    uploadedAt: '2024-01-18T09:15:00Z',
    lastModified: '2024-01-18T09:15:00Z',
    status: 'ACTIVE',
    isPublic: true,
    downloadCount: 15,
    universityId: '2'
  },
  {
    id: '4',
    name: 'Application_Form_Template.docx',
    type: 'DOCX',
    size: 102400,
    category: 'Template',
    tags: ['template', 'application', 'form'],
    uploadedBy: 'Sarah Johnson',
    uploadedAt: '2024-01-17T16:45:00Z',
    lastModified: '2024-01-17T16:45:00Z',
    status: 'ACTIVE',
    isPublic: true,
    downloadCount: 28
  }
]

const mockFolders: DocumentFolder[] = [
  {
    id: '1',
    name: 'Student Documents',
    description: 'All student-related documents',
    documentCount: 45,
    totalSize: 204800000,
    createdAt: '2024-01-01',
    isPublic: false
  },
  {
    id: '2',
    name: 'University Materials',
    description: 'University brochures and information',
    documentCount: 23,
    totalSize: 153600000,
    createdAt: '2024-01-01',
    isPublic: true
  },
  {
    id: '3',
    name: 'Templates',
    description: 'Document templates and forms',
    documentCount: 12,
    totalSize: 51200000,
    createdAt: '2024-01-01',
    isPublic: true
  },
  {
    id: '4',
    name: 'Archive',
    description: 'Archived documents',
    documentCount: 8,
    totalSize: 102400000,
    createdAt: '2024-01-01',
    isPublic: false
  }
]

const mockTemplates: DocumentTemplate[] = [
  {
    id: '1',
    name: 'Student Application Form',
    description: 'Standard student application form',
    category: 'Application',
    requiredFields: ['Personal Information', 'Academic Background', 'Program Choice'],
    fileUrl: '/templates/application-form.docx'
  },
  {
    id: '2',
    name: 'Document Checklist',
    description: 'Required documents checklist',
    category: 'Checklist',
    requiredFields: ['Passport', 'Transcript', 'Language Certificate'],
    fileUrl: '/templates/document-checklist.pdf'
  },
  {
    id: '3',
    name: 'Consent Form',
    description: 'Parental consent form for minors',
    category: 'Legal',
    requiredFields: ['Student Name', 'Parent Signature', 'Date'],
    fileUrl: '/templates/consent-form.pdf'
  }
]

const fileIcons = {
  PDF: FileText,
  DOC: FileText,
  DOCX: FileText,
  JPG: Image,
  PNG: Image,
  MP4: FileVideo,
  ZIP: FileArchive,
  OTHER: File
}

const categoryColors = {
  'Academic': 'bg-blue-100 text-blue-800',
  'Identification': 'bg-green-100 text-green-800',
  'University': 'bg-purple-100 text-purple-800',
  'Template': 'bg-orange-100 text-orange-800',
  'Application': 'bg-red-100 text-red-800',
  'Legal': 'bg-yellow-100 text-yellow-800',
  'Checklist': 'bg-indigo-100 text-indigo-800'
}

const statusColors = {
  ACTIVE: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-800',
  DELETED: 'bg-red-100 text-red-800'
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments)
  const [folders, setFolders] = useState<DocumentFolder[]>(mockFolders)
  const [templates, setTemplates] = useState<DocumentTemplate[]>(mockTemplates)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [newDocument, setNewDocument] = useState({
    name: '',
    category: '',
    tags: '',
    isPublic: false
  })
  const [newFolder, setNewFolder] = useState({
    name: '',
    description: '',
    isPublic: false
  })

  const handleUploadDocument = () => {
    const document: Document = {
      id: Date.now().toString(),
      name: newDocument.name,
      type: 'PDF', // Default type
      size: 1024000, // Default size
      category: newDocument.category,
      tags: newDocument.tags.split(',').map(tag => tag.trim()),
      uploadedBy: 'Current User',
      uploadedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      status: 'ACTIVE',
      isPublic: newDocument.isPublic,
      downloadCount: 0
    }
    setDocuments([document, ...documents])
    setNewDocument({ name: '', category: '', tags: '', isPublic: false })
    setIsUploadDialogOpen(false)
  }

  const handleCreateFolder = () => {
    const folder: DocumentFolder = {
      id: Date.now().toString(),
      name: newFolder.name,
      description: newFolder.description,
      documentCount: 0,
      totalSize: 0,
      createdAt: new Date().toISOString().split('T')[0],
      isPublic: newFolder.isPublic
    }
    setFolders([...folders, folder])
    setNewFolder({ name: '', description: '', isPublic: false })
    setIsCreateFolderDialogOpen(false)
  }

  const handleDeleteDocument = (id: string) => {
    setDocuments(documents.filter(doc => doc.id !== id))
  }

  const getFilteredDocuments = () => {
    let filtered = documents

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(doc => doc.category === categoryFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === typeFilter)
    }

    return filtered
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStorageStats = () => {
    const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0)
    const totalSizeMB = totalSize / (1024 * 1024)
    const storageLimit = 20000 // 20GB in MB
    const usagePercentage = Math.min((totalSizeMB / storageLimit) * 100, 100)

    return {
      totalDocuments: documents.length,
      totalSize: formatFileSize(totalSize),
      storageLimit: `${storageLimit / 1000}GB`,
      usagePercentage,
      publicDocuments: documents.filter(doc => doc.isPublic).length,
      privateDocuments: documents.filter(doc => !doc.isPublic).length
    }
  }

  const stats = getStorageStats()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Management</h1>
          <p className="text-muted-foreground">
            Upload, organize, and manage all your documents
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a new document to the system
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="file" className="text-right">
                    File
                  </Label>
                  <div className="col-span-3">
                    <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG up to 10MB</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newDocument.name}
                    onChange={(e) => setNewDocument({...newDocument, name: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Category
                  </Label>
                  <Select
                    value={newDocument.category}
                    onValueChange={(value) => setNewDocument({...newDocument, category: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Academic">Academic</SelectItem>
                      <SelectItem value="Identification">Identification</SelectItem>
                      <SelectItem value="University">University</SelectItem>
                      <SelectItem value="Template">Template</SelectItem>
                      <SelectItem value="Application">Application</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tags" className="text-right">
                    Tags
                  </Label>
                  <Input
                    id="tags"
                    value={newDocument.tags}
                    onChange={(e) => setNewDocument({...newDocument, tags: e.target.value})}
                    className="col-span-3"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="visibility" className="text-right">
                    Visibility
                  </Label>
                  <Select
                    value={newDocument.isPublic ? 'public' : 'private'}
                    onValueChange={(value) => setNewDocument({...newDocument, isPublic: value === 'public'})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUploadDocument}>Upload Document</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateFolderDialogOpen} onOpenChange={setIsCreateFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Folder className="mr-2 h-4 w-4" />
                Create Folder
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Create a new folder to organize your documents
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="folderName" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="folderName"
                    value={newFolder.name}
                    onChange={(e) => setNewFolder({...newFolder, name: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="folderDescription" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="folderDescription"
                    value={newFolder.description}
                    onChange={(e) => setNewFolder({...newFolder, description: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="folderVisibility" className="text-right">
                    Visibility
                  </Label>
                  <Select
                    value={newFolder.isPublic ? 'public' : 'private'}
                    onValueChange={(value) => setNewFolder({...newFolder, isPublic: value === 'public'})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateFolder}>Create Folder</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Storage Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <HardDrive className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Storage Usage:</strong> {stats.totalSize} of {stats.storageLimit} used ({Math.round(stats.usagePercentage)}%)
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.publicDocuments} public, {stats.privateDocuments} private
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSize}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.storageLimit}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Folders</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{folders.length}</div>
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
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">
              Available templates
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="folders">Folders</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Library</CardTitle>
              <CardDescription>Manage and organize all your documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Academic">Academic</SelectItem>
                    <SelectItem value="Identification">Identification</SelectItem>
                    <SelectItem value="University">University</SelectItem>
                    <SelectItem value="Template">Template</SelectItem>
                    <SelectItem value="Application">Application</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[120px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="DOC">DOC</SelectItem>
                    <SelectItem value="DOCX">DOCX</SelectItem>
                    <SelectItem value="JPG">JPG</SelectItem>
                    <SelectItem value="PNG">PNG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredDocuments().map((document) => {
                    const IconComponent = fileIcons[document.type]
                    return (
                      <TableRow key={document.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium">{document.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {document.uploadedBy}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={categoryColors[document.category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'}>
                            {document.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(document.size)}</TableCell>
                        <TableCell>
                          {format(new Date(document.uploadedAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[document.status]}>
                            {document.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{document.downloadCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteDocument(document.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="folders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Folders</CardTitle>
              <CardDescription>Organize your documents into folders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder) => (
                  <Card key={folder.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Folder className="h-5 w-5" />
                          <CardTitle className="text-sm">{folder.name}</CardTitle>
                        </div>
                        {folder.isPublic ? (
                          <Unlock className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-3">{folder.description}</p>
                      <div className="flex justify-between text-sm text-muted-foreground mb-3">
                        <span>{folder.documentCount} documents</span>
                        <span>{formatFileSize(folder.totalSize)}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Templates</CardTitle>
              <CardDescription>Reusable document templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                      <CardDescription className="text-xs">{template.category}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                      <div className="space-y-2 mb-3">
                        <p className="text-xs font-medium">Required Fields:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.requiredFields.map((field, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}