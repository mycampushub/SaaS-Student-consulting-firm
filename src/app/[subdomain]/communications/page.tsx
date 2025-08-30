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
  Mail, 
  MessageSquare, 
  Phone, 
  Send, 
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
  FileText,
  Bell,
  Reply,
  Forward,
  Paperclip,
  MoreHorizontal
} from 'lucide-react'
import { format } from 'date-fns'

interface Email {
  id: string
  to: string
  subject: string
  body: string
  status: 'DRAFT' | 'SENT' | 'DELIVERED' | 'OPENED' | 'BOUNCED'
  sentAt?: string
  deliveredAt?: string
  openedAt?: string
  attachments: string[]
  templateId?: string
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: string
  variables: string[]
}

interface Notification {
  id: string
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  title: string
  message: string
  recipient: string
  channel: 'EMAIL' | 'SMS' | 'IN_APP'
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ'
  createdAt: string
  readAt?: string
}

interface SmsMessage {
  id: string
  to: string
  message: string
  status: 'DRAFT' | 'SENT' | 'DELIVERED' | 'FAILED'
  sentAt?: string
  deliveredAt?: string
  templateId?: string
}

const mockEmails: Email[] = [
  {
    id: '1',
    to: 'john.doe@email.com',
    subject: 'Application Status Update',
    body: 'Dear John, your application to Harvard University has been reviewed...',
    status: 'OPENED',
    sentAt: '2024-01-20T10:30:00Z',
    deliveredAt: '2024-01-20T10:31:00Z',
    openedAt: '2024-01-20T11:15:00Z',
    attachments: ['application_status.pdf'],
    templateId: 'app_status'
  },
  {
    id: '2',
    to: 'jane.smith@email.com',
    subject: 'Document Submission Reminder',
    body: 'Dear Jane, this is a reminder to submit your pending documents...',
    status: 'DELIVERED',
    sentAt: '2024-01-19T14:20:00Z',
    deliveredAt: '2024-01-19T14:21:00Z',
    attachments: [],
    templateId: 'doc_reminder'
  },
  {
    id: '3',
    to: 'mike.johnson@email.com',
    subject: 'Consultation Scheduled',
    body: 'Dear Mike, your consultation has been scheduled for...',
    status: 'SENT',
    sentAt: '2024-01-18T09:15:00Z',
    attachments: ['consultation_details.pdf'],
    templateId: 'consultation_scheduled'
  }
]

const mockTemplates: EmailTemplate[] = [
  {
    id: 'app_status',
    name: 'Application Status Update',
    subject: 'Application Status Update - {{university}}',
    body: 'Dear {{firstName}}, your application to {{university}} for {{program}} has been {{status}}.',
    category: 'Application',
    variables: ['firstName', 'university', 'program', 'status']
  },
  {
    id: 'doc_reminder',
    name: 'Document Reminder',
    subject: 'Document Submission Reminder',
    body: 'Dear {{firstName}}, this is a reminder to submit your pending documents: {{documents}}.',
    category: 'Reminder',
    variables: ['firstName', 'documents']
  },
  {
    id: 'consultation_scheduled',
    name: 'Consultation Scheduled',
    subject: 'Consultation Scheduled - {{date}}',
    body: 'Dear {{firstName}}, your consultation has been scheduled for {{date}} at {{time}}.',
    category: 'Consultation',
    variables: ['firstName', 'date', 'time']
  }
]

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'INFO',
    title: 'New Student Inquiry',
    message: 'Alex Thompson submitted a new inquiry',
    recipient: 'All Staff',
    channel: 'IN_APP',
    status: 'READ',
    createdAt: '2024-01-20T10:30:00Z',
    readAt: '2024-01-20T10:35:00Z'
  },
  {
    id: '2',
    type: 'SUCCESS',
    title: 'Application Approved',
    message: 'Maria Garcia\'s application to Oxford was approved',
    recipient: 'Consulting Team',
    channel: 'EMAIL',
    status: 'DELIVERED',
    createdAt: '2024-01-19T14:20:00Z'
  },
  {
    id: '3',
    type: 'WARNING',
    title: 'Document Pending',
    message: 'James Wilson needs to submit passport documents',
    recipient: 'Emma Rodriguez',
    channel: 'EMAIL',
    status: 'PENDING',
    createdAt: '2024-01-18T09:15:00Z'
  }
]

const mockSmsMessages: SmsMessage[] = [
  {
    id: '1',
    to: '+1234567890',
    message: 'Your consultation is scheduled for tomorrow at 2 PM',
    status: 'DELIVERED',
    sentAt: '2024-01-20T10:30:00Z',
    deliveredAt: '2024-01-20T10:31:00Z',
    templateId: 'consultation_reminder'
  },
  {
    id: '2',
    to: '+1234567891',
    message: 'Please submit your documents by Friday',
    status: 'SENT',
    sentAt: '2024-01-19T14:20:00Z',
    templateId: 'doc_reminder'
  }
]

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-yellow-100 text-yellow-800',
  OPENED: 'bg-green-100 text-green-800',
  BOUNCED: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  READ: 'bg-green-100 text-green-800'
}

const statusLabels = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  OPENED: 'Opened',
  BOUNCED: 'Bounced',
  FAILED: 'Failed',
  PENDING: 'Pending',
  READ: 'Read'
}

const notificationTypeColors = {
  INFO: 'bg-blue-100 text-blue-800',
  SUCCESS: 'bg-green-100 text-green-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  ERROR: 'bg-red-100 text-red-800'
}

export default function CommunicationsPage() {
  const [emails, setEmails] = useState<Email[]>(mockEmails)
  const [templates, setTemplates] = useState<EmailTemplate[]>(mockTemplates)
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [smsMessages, setSmsMessages] = useState<SmsMessage[]>(mockSmsMessages)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [newEmail, setNewEmail] = useState({
    to: '',
    subject: '',
    body: '',
    templateId: ''
  })
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    body: '',
    category: '',
    variables: ''
  })

  const handleSendEmail = () => {
    const email: Email = {
      id: Date.now().toString(),
      to: newEmail.to,
      subject: newEmail.subject,
      body: newEmail.body,
      status: 'SENT',
      sentAt: new Date().toISOString(),
      attachments: []
    }
    setEmails([email, ...emails])
    setNewEmail({ to: '', subject: '', body: '', templateId: '' })
    setIsComposeDialogOpen(false)
  }

  const handleCreateTemplate = () => {
    const template: EmailTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      subject: newTemplate.subject,
      body: newTemplate.body,
      category: newTemplate.category,
      variables: newTemplate.variables.split(',').map(v => v.trim())
    }
    setTemplates([...templates, template])
    setNewTemplate({ name: '', subject: '', body: '', category: '', variables: '' })
    setIsTemplateDialogOpen(false)
  }

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setNewEmail({
        ...newEmail,
        subject: template.subject,
        body: template.body,
        templateId: template.id
      })
    }
  }

  const getFilteredEmails = () => {
    let filtered = emails

    if (searchTerm) {
      filtered = filtered.filter(email =>
        email.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.body.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(email => email.status === statusFilter)
    }

    return filtered
  }

  const getEmailStats = () => {
    const total = emails.length
    const sent = emails.filter(e => e.status === 'SENT').length
    const delivered = emails.filter(e => e.status === 'DELIVERED').length
    const opened = emails.filter(e => e.status === 'OPENED').length

    return {
      total,
      sent,
      delivered,
      opened,
      deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0
    }
  }

  const stats = getEmailStats()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
          <p className="text-muted-foreground">
            Manage emails, SMS, and notifications
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="mr-2 h-4 w-4" />
                Compose Email
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Compose Email</DialogTitle>
                <DialogDescription>
                  Send a new email to students or partners
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="to" className="text-right">
                    To
                  </Label>
                  <Input
                    id="to"
                    value={newEmail.to}
                    onChange={(e) => setNewEmail({...newEmail, to: e.target.value})}
                    className="col-span-3"
                    placeholder="recipient@email.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="template" className="text-right">
                    Template
                  </Label>
                  <Select
                    value={newEmail.templateId}
                    onValueChange={(value) => applyTemplate(value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subject" className="text-right">
                    Subject
                  </Label>
                  <Input
                    id="subject"
                    value={newEmail.subject}
                    onChange={(e) => setNewEmail({...newEmail, subject: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="body" className="text-right">
                    Message
                  </Label>
                  <Textarea
                    id="body"
                    value={newEmail.body}
                    onChange={(e) => setNewEmail({...newEmail, body: e.target.value})}
                    className="col-span-3"
                    rows={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSendEmail}>Send Email</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Email Template</DialogTitle>
                <DialogDescription>
                  Create a reusable email template
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="templateName" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="templateName"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="templateCategory" className="text-right">
                    Category
                  </Label>
                  <Input
                    id="templateCategory"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="templateSubject" className="text-right">
                    Subject
                  </Label>
                  <Input
                    id="templateSubject"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({...newTemplate, subject: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="templateBody" className="text-right">
                    Body
                  </Label>
                  <Textarea
                    id="templateBody"
                    value={newTemplate.body}
                    onChange={(e) => setNewTemplate({...newTemplate, body: e.target.value})}
                    className="col-span-3"
                    rows={6}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="variables" className="text-right">
                    Variables
                  </Label>
                  <Input
                    id="variables"
                    value={newTemplate.variables}
                    onChange={(e) => setNewTemplate({...newTemplate, variables: e.target.value})}
                    className="col-span-3"
                    placeholder="firstName, lastName, email (comma separated)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateTemplate}>Create Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.sent} sent today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveryRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.delivered} delivered
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.opened} opened
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">
              Email templates
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="emails" className="space-y-6">
        <TabsList>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
        </TabsList>

        <TabsContent value="emails" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Communications</CardTitle>
              <CardDescription>Manage your email campaigns and individual emails</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search emails..."
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
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="OPENED">Opened</SelectItem>
                    <SelectItem value="BOUNCED">Bounced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredEmails().map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-medium">{email.to}</TableCell>
                      <TableCell>{email.subject}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[email.status]}>
                          {statusLabels[email.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {email.sentAt ? format(new Date(email.sentAt), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {email.openedAt ? format(new Date(email.openedAt), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Reply className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Forward className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Manage your reusable email templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                          <CardDescription className="text-xs">{template.category}</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {template.variables.length} vars
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm font-medium mb-1">{template.subject}</p>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {template.body}
                      </p>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Send className="h-3 w-3 mr-1" />
                          Use
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>System notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      notificationTypeColors[notification.type].split(' ')[0]
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium">{notification.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {notification.channel}
                          </Badge>
                          <Badge className={statusColors[notification.status]}>
                            {statusLabels[notification.status]}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>To: {notification.recipient}</span>
                        <span>{format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SMS Messages</CardTitle>
              <CardDescription>Manage SMS communications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {smsMessages.map((sms) => (
                  <div key={sms.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{sms.to}</span>
                        <Badge className={statusColors[sms.status]}>
                          {statusLabels[sms.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{sms.message}</p>
                      <div className="text-xs text-muted-foreground">
                        {sms.sentAt && `Sent: ${format(new Date(sms.sentAt), 'MMM dd, yyyy HH:mm')}`}
                        {sms.deliveredAt && ` • Delivered: ${format(new Date(sms.deliveredAt), 'MMM dd, yyyy HH:mm')}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}