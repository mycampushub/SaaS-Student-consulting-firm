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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Settings,
  Users,
  Mail,
  MessageSquare,
  Share2,
  Target,
  TrendingUp,
  Calendar,
  DollarSign,
  BarChart3,
  Zap,
  Workflow,
  FileText,
  Edit,
  Trash2,
  Copy,
  Eye,
  MoreHorizontal,
  CheckCircle,
  Loader2,
  AlertTriangle
} from "lucide-react"

interface Campaign {
  id: string
  name: string
  description?: string
  type: 'EMAIL' | 'SMS' | 'SOCIAL_MEDIA' | 'GOOGLE_ADS' | 'FACEBOOK_ADS' | 'CONTENT' | 'WEBINAR' | 'EVENT'
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  sentCount: number
  deliveredCount: number
  openedCount: number
  clickedCount: number
  conversionCount: number
  budget?: number
  spent: number
  scheduledAt?: string
  startedAt?: string
  completedAt?: string
  workflow?: {
    id: string
    name: string
  }
  targetAudience?: any
  content?: any
}

interface Lead {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  source: string
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'NURTURING' | 'CONVERTED' | 'LOST'
  converted: boolean
  convertedAt?: string
  createdAt: string
  assignedTo?: string
  customFields?: any
  campaign?: {
    id: string
    name: string
  }
}

interface Workflow {
  id: string
  name: string
  description?: string
  category: 'GENERAL' | 'LEAD_NURTURING' | 'STUDENT_ONBOARDING' | 'FOLLOW_UP' | 'NOTIFICATION' | 'INTEGRATION'
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  isActive: boolean
  executionCount: number
  lastExecutedAt?: string
  nodes: any[]
  edges: any[]
}

export default function MarketingPage() {
  const params = useParams()
  const subdomain = params.subdomain as string
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false)
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false)
  const [isCreateWorkflowOpen, setIsCreateWorkflowOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  // Form states
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    type: "EMAIL" as Campaign['type'],
    budget: "",
    targetAudience: [] as any[],
    content: {} as any,
    workflowId: "",
    scheduledAt: ""
  })

  const [newLead, setNewLead] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    source: "",
    status: "NEW" as Lead['status'],
    assignedTo: "",
    customFields: {} as any,
    campaignId: ""
  })

  // Fetch data from API
  const fetchCampaigns = async () => {
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(typeFilter !== "all" && { type: typeFilter })
      })
      
      const response = await fetch(`/api/${subdomain}/marketing/campaigns?${params}`)
      if (!response.ok) throw new Error('Failed to fetch campaigns')
      
      const data = await response.json()
      setCampaigns(data.campaigns)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const fetchLeads = async () => {
    try {
      const response = await fetch(`/api/${subdomain}/marketing/leads?limit=50`)
      if (!response.ok) throw new Error('Failed to fetch leads')
      
      const data = await response.json()
      setLeads(data.leads)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const fetchWorkflows = async () => {
    try {
      const response = await fetch(`/api/${subdomain}/workflows?limit=50`)
      if (!response.ok) throw new Error('Failed to fetch workflows')
      
      const data = await response.json()
      setWorkflows(data.workflows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        await Promise.all([fetchCampaigns(), fetchLeads(), fetchWorkflows()])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [subdomain])

  useEffect(() => {
    fetchCampaigns()
  }, [statusFilter, typeFilter])

  const handleCreateCampaign = async () => {
    if (!newCampaign.name) {
      alert("Campaign name is required")
      return
    }

    setSubmitting(true)
    try {
      const campaignData = {
        name: newCampaign.name,
        description: newCampaign.description || undefined,
        type: newCampaign.type,
        budget: newCampaign.budget ? parseFloat(newCampaign.budget) : undefined,
        targetAudience: newCampaign.targetAudience.length > 0 ? newCampaign.targetAudience : undefined,
        content: Object.keys(newCampaign.content).length > 0 ? newCampaign.content : undefined,
        workflowId: newCampaign.workflowId || undefined,
        scheduledAt: newCampaign.scheduledAt || undefined
      }

      const response = await fetch(`/api/${subdomain}/marketing/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create campaign')
      }

      await fetchCampaigns()
      setIsCreateCampaignOpen(false)
      // Reset form
      setNewCampaign({
        name: "",
        description: "",
        type: "EMAIL",
        budget: "",
        targetAudience: [],
        content: {},
        workflowId: "",
        scheduledAt: ""
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create campaign')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateLead = async () => {
    if (!newLead.email && !newLead.phone) {
      alert("Email or phone is required")
      return
    }

    setSubmitting(true)
    try {
      const leadData = {
        firstName: newLead.firstName || undefined,
        lastName: newLead.lastName || undefined,
        email: newLead.email || undefined,
        phone: newLead.phone || undefined,
        source: newLead.source || "Manual",
        status: newLead.status,
        assignedTo: newLead.assignedTo || undefined,
        customFields: Object.keys(newLead.customFields).length > 0 ? newLead.customFields : undefined,
        campaignId: newLead.campaignId || undefined
      }

      const response = await fetch(`/api/${subdomain}/marketing/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create lead')
      }

      await fetchLeads()
      setIsCreateLeadOpen(false)
      // Reset form
      setNewLead({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        source: "",
        status: "NEW",
        assignedTo: "",
        customFields: {},
        campaignId: ""
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create lead')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) {
      return
    }

    try {
      const response = await fetch(`/api/${subdomain}/marketing/campaigns/${campaignId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete campaign')
      }

      await fetchCampaigns()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete campaign')
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) {
      return
    }

    try {
      const response = await fetch(`/api/${subdomain}/marketing/leads/${leadId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete lead')
      }

      await fetchLeads()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete lead')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800"
      case "DRAFT": return "bg-gray-100 text-gray-800"
      case "SCHEDULED": return "bg-blue-100 text-blue-800"
      case "PAUSED": return "bg-yellow-100 text-yellow-800"
      case "COMPLETED": return "bg-purple-100 text-purple-800"
      case "CANCELLED": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case "EMAIL": return <Mail className="h-4 w-4" />
      case "SMS": return <MessageSquare className="h-4 w-4" />
      case "SOCIAL_MEDIA": return <Share2 className="h-4 w-4" />
      case "GOOGLE_ADS": return <Target className="h-4 w-4" />
      case "FACEBOOK_ADS": return <Share2 className="h-4 w-4" />
      case "CONTENT": return <FileText className="h-4 w-4" />
      case "WEBINAR": return <Calendar className="h-4 w-4" />
      case "EVENT": return <Calendar className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case "NEW": return "bg-blue-100 text-blue-800"
      case "CONTACTED": return "bg-yellow-100 text-yellow-800"
      case "QUALIFIED": return "bg-green-100 text-green-800"
      case "NURTURING": return "bg-purple-100 text-purple-800"
      case "CONVERTED": return "bg-gray-100 text-gray-800"
      case "LOST": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter
    const matchesType = typeFilter === "all" || campaign.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const filteredLeads = leads.filter(lead => {
    return lead.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           lead.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const calculateCampaignMetrics = (campaign: Campaign) => {
    const openRate = campaign.deliveredCount > 0 ? (campaign.openedCount / campaign.deliveredCount) * 100 : 0
    const clickRate = campaign.openedCount > 0 ? (campaign.clickedCount / campaign.openedCount) * 100 : 0
    const conversionRate = campaign.clickedCount > 0 ? (campaign.conversionCount / campaign.clickedCount) * 100 : 0
    return { openRate, clickRate, conversionRate }
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
                <h1 className="text-xl font-bold">Marketing Automation</h1>
                <p className="text-sm text-muted-foreground">{subdomain}.eduagency.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Dialog open={isCreateLeadOpen} onOpenChange={setIsCreateLeadOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Add Lead
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Lead</DialogTitle>
                    <DialogDescription>Create a new lead in your marketing pipeline</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName" 
                          placeholder="First name"
                          value={newLead.firstName}
                          onChange={(e) => setNewLead(prev => ({ ...prev, firstName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName" 
                          placeholder="Last name"
                          value={newLead.lastName}
                          onChange={(e) => setNewLead(prev => ({ ...prev, lastName: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input 
                        id="email" 
                        type="email"
                        placeholder="lead@email.com"
                        value={newLead.email}
                        onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input 
                        id="phone" 
                        placeholder="+1 (555) 123-4567"
                        value={newLead.phone}
                        onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="source">Source</Label>
                      <Input 
                        id="source" 
                        placeholder="e.g., Facebook, Google, Website"
                        value={newLead.source}
                        onChange={(e) => setNewLead(prev => ({ ...prev, source: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={newLead.status} onValueChange={(value) => setNewLead(prev => ({ ...prev, status: value as Lead['status'] }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">New</SelectItem>
                          <SelectItem value="CONTACTED">Contacted</SelectItem>
                          <SelectItem value="QUALIFIED">Qualified</SelectItem>
                          <SelectItem value="NURTURING">Nurturing</SelectItem>
                          <SelectItem value="CONVERTED">Converted</SelectItem>
                          <SelectItem value="LOST">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateLeadOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateLead} disabled={submitting}>
                        {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Add Lead
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Campaign</DialogTitle>
                    <DialogDescription>Launch a new marketing campaign</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="campaignName">Campaign Name *</Label>
                      <Input 
                        id="campaignName" 
                        placeholder="Enter campaign name"
                        value={newCampaign.name}
                        onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="campaignDescription">Description</Label>
                      <Textarea 
                        id="campaignDescription" 
                        placeholder="Campaign description"
                        value={newCampaign.description}
                        onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="campaignType">Type</Label>
                      <Select value={newCampaign.type} onValueChange={(value) => setNewCampaign(prev => ({ ...prev, type: value as Campaign['type'] }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="SMS">SMS</SelectItem>
                          <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                          <SelectItem value="GOOGLE_ADS">Google Ads</SelectItem>
                          <SelectItem value="FACEBOOK_ADS">Facebook Ads</SelectItem>
                          <SelectItem value="CONTENT">Content</SelectItem>
                          <SelectItem value="WEBINAR">Webinar</SelectItem>
                          <SelectItem value="EVENT">Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="campaignBudget">Budget (optional)</Label>
                      <Input 
                        id="campaignBudget" 
                        type="number" 
                        placeholder="0.00"
                        value={newCampaign.budget}
                        onChange={(e) => setNewCampaign(prev => ({ ...prev, budget: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="scheduledAt">Schedule For (optional)</Label>
                      <Input 
                        id="scheduledAt" 
                        type="datetime-local"
                        value={newCampaign.scheduledAt}
                        onChange={(e) => setNewCampaign(prev => ({ ...prev, scheduledAt: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateCampaignOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCampaign} disabled={submitting}>
                        {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Create Campaign
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns, leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                <SelectItem value="GOOGLE_ADS">Google Ads</SelectItem>
                <SelectItem value="FACEBOOK_ADS">Facebook Ads</SelectItem>
                <SelectItem value="CONTENT">Content</SelectItem>
                <SelectItem value="WEBINAR">Webinar</SelectItem>
                <SelectItem value="EVENT">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Campaigns</p>
                  <p className="text-2xl font-bold">{campaigns.length}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Campaigns</p>
                  <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'ACTIVE').length}</p>
                </div>
                <Zap className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                  <p className="text-2xl font-bold">{leads.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Converted Leads</p>
                  <p className="text-2xl font-bold">{leads.filter(l => l.converted).length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle>Marketing Campaigns</CardTitle>
                <CardDescription>
                  Manage your marketing campaigns and track performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredCampaigns.length === 0 ? (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No campaigns found</p>
                    </div>
                  ) : (
                    filteredCampaigns.map((campaign) => {
                      const metrics = calculateCampaignMetrics(campaign)
                      return (
                        <div key={campaign.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {getCampaignTypeIcon(campaign.type)}
                                <div>
                                  <h3 className="font-semibold">{campaign.name}</h3>
                                  {campaign.description && (
                                    <p className="text-sm text-muted-foreground">{campaign.description}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 mb-3">
                                <Badge className={getStatusColor(campaign.status)}>
                                  {campaign.status}
                                </Badge>
                                <Badge variant="outline">
                                  {campaign.type.replace('_', ' ')}
                                </Badge>
                                {campaign.workflow && (
                                  <Badge variant="outline">
                                    <Workflow className="h-3 w-3 mr-1" />
                                    {campaign.workflow.name}
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                <div>
                                  <p className="text-xs text-muted-foreground">Sent</p>
                                  <p className="font-medium">{campaign.sentCount.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Open Rate</p>
                                  <p className="font-medium">{metrics.openRate.toFixed(1)}%</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Click Rate</p>
                                  <p className="font-medium">{metrics.clickRate.toFixed(1)}%</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Conversions</p>
                                  <p className="font-medium">{campaign.conversionCount}</p>
                                </div>
                              </div>

                              {campaign.budget && (
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-4 w-4" />
                                    Budget: ${campaign.budget.toLocaleString()}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <TrendingUp className="h-4 w-4" />
                                    Spent: ${campaign.spent.toLocaleString()}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteCampaign(campaign.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle>Leads</CardTitle>
                <CardDescription>
                  Manage your lead pipeline and track conversions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredLeads.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No leads found</p>
                    </div>
                  ) : (
                    filteredLeads.map((lead) => (
                      <div key={lead.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold">
                                  {lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : 'Unnamed Lead'}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {lead.email && <span>{lead.email}</span>}
                                  {lead.phone && <span>• {lead.phone}</span>}
                                  {lead.source && <span>• {lead.source}</span>}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge className={getLeadStatusColor(lead.status)}>
                                {lead.status}
                              </Badge>
                              {lead.converted && (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Converted
                                </Badge>
                              )}
                              {lead.campaign && (
                                <Badge variant="outline">
                                  {lead.campaign.name}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Created: {new Date(lead.createdAt).toLocaleDateString()}
                              </div>
                              {lead.convertedAt && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Converted: {new Date(lead.convertedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteLead(lead.id)}
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
          </TabsContent>

          <TabsContent value="workflows">
            <Card>
              <CardHeader>
                <CardTitle>Automation Workflows</CardTitle>
                <CardDescription>
                  Build automated workflows for lead nurturing and student onboarding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflows.length === 0 ? (
                    <div className="text-center py-8">
                      <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No workflows found</p>
                      <Button className="mt-4" onClick={() => setIsCreateWorkflowOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Workflow
                      </Button>
                    </div>
                  ) : (
                    workflows.map((workflow) => (
                      <div key={workflow.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <Workflow className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{workflow.name}</h3>
                                {workflow.description && (
                                  <p className="text-sm text-muted-foreground">{workflow.description}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge className={getStatusColor(workflow.status)}>
                                {workflow.status}
                              </Badge>
                              {workflow.isActive && (
                                <Badge className="bg-green-100 text-green-800">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {workflow.category.replace('_', ' ')}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <BarChart3 className="h-4 w-4" />
                                Executions: {workflow.executionCount}
                              </div>
                              {workflow.lastExecutedAt && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  Last run: {new Date(workflow.lastExecutedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Performance</CardTitle>
                  <CardDescription>Overview of your marketing campaign metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {campaigns.slice(0, 5).map((campaign) => {
                      const metrics = calculateCampaignMetrics(campaign)
                      return (
                        <div key={campaign.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">{campaign.type}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{metrics.openRate.toFixed(1)}% open rate</p>
                            <p className="text-sm text-muted-foreground">{campaign.conversionCount} conversions</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lead Conversion Funnel</CardTitle>
                  <CardDescription>Track your lead conversion rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Total Leads</span>
                      <span className="font-bold">{leads.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Contacted</span>
                      <span className="font-bold">{leads.filter(l => l.status !== 'NEW').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Qualified</span>
                      <span className="font-bold">{leads.filter(l => ['QUALIFIED', 'NURTURING', 'CONVERTED'].includes(l.status)).length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Converted</span>
                      <span className="font-bold">{leads.filter(l => l.converted).length}</span>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Conversion Rate</span>
                        <span className="font-bold">
                          {leads.length > 0 ? ((leads.filter(l => l.converted).length / leads.length) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
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