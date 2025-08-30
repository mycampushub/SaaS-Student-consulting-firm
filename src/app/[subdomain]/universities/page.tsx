"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Globe,
  MapPin,
  Star,
  Award,
  Building2,
  Mail,
  Phone,
  ExternalLink,
  TrendingUp,
  Users,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Target,
  BookOpen,
  GraduationCap,
  DollarSign,
  BarChart3,
  Activity,
  Settings,
  Handshake
} from "lucide-react"

interface University {
  id: string
  name: string
  country: string
  city: string
  website?: string
  description?: string
  worldRanking?: number
  nationalRanking?: number
  accreditation: string[]
  programs: string[]
  requirements: {
    academic: string[]
    language: string[]
    financial: string[]
    documents: string[]
  }
  isPartner: boolean
  partnershipLevel: 'NONE' | 'BASIC' | 'PREMIUM' | 'STRATEGIC'
  commissionRate?: number
  contactEmail?: string
  contactPhone?: string
  address?: string
  createdAt: string
  lastUpdated: string
  studentsPlaced: number
  applications: number
  successRate: number
  notes?: string
}

const mockUniversities: University[] = [
  {
    id: "1",
    name: "Harvard University",
    country: "United States",
    city: "Cambridge",
    website: "https://harvard.edu",
    description: "Harvard University is a private Ivy League research university in Cambridge, Massachusetts. Established in 1636, Harvard is the oldest institution of higher education in the United States.",
    worldRanking: 1,
    nationalRanking: 1,
    accreditation: ["NEASC", "AACSB", "AMBA"],
    programs: ["Computer Science", "Business Administration", "Medicine", "Law", "Engineering", "Liberal Arts"],
    requirements: {
      academic: ["Minimum GPA 3.7", "SAT/ACT required", "Strong essays"],
      language: ["TOEFL 100+ or IELTS 7.0+", "Duolingo English Test 120+"],
      financial: ["Application fee: $75", "Tuition: $54,002/year", "Financial aid available"],
      documents: ["Transcripts", "Letters of recommendation", "Personal statement", "Portfolio (for specific programs)"]
    },
    isPartner: true,
    partnershipLevel: "STRATEGIC",
    commissionRate: 18.0,
    contactEmail: "international@harvard.edu",
    contactPhone: "+1 (617) 495-1000",
    address: "Cambridge, MA 02138, USA",
    createdAt: "2024-01-01",
    lastUpdated: "2024-01-20",
    studentsPlaced: 12,
    applications: 25,
    successRate: 48,
    notes: "Strategic partner with high commission rate. Strong preference for students with exceptional academic records and leadership experience."
  },
  {
    id: "2",
    name: "University of Oxford",
    country: "United Kingdom",
    city: "Oxford",
    website: "https://ox.ac.uk",
    description: "The University of Oxford is a collegiate research university in Oxford, England. There is evidence of teaching as early as 1096, making it the oldest university in the English-speaking world.",
    worldRanking: 2,
    nationalRanking: 1,
    accreditation: ["QAA", "Russell Group"],
    programs: ["Philosophy, Politics and Economics", "Medicine", "Computer Science", "History", "Mathematics"],
    requirements: {
      academic: ["A-levels A*A*A", "IB 38-40 points", "Strong academic references"],
      language: ["IELTS 7.0+ (no band below 6.5)", "TOEFL 100+"],
      financial: ["Application fee: £75", "Tuition: £9,250-£37,510/year", "Scholarships available"],
      documents: ["Academic transcripts", "Personal statement", "Academic references", "Written work (for humanities)"]
    },
    isPartner: true,
    partnershipLevel: "PREMIUM",
    commissionRate: 15.0,
    contactEmail: "undergraduate.admissions@ox.ac.uk",
    contactPhone: "+44 1865 270000",
    address: "Oxford OX1 2JD, UK",
    createdAt: "2024-01-02",
    lastUpdated: "2024-01-19",
    studentsPlaced: 8,
    applications: 18,
    successRate: 44,
    notes: "Premium partner with excellent reputation. Particularly strong in humanities and social sciences. Interview process for most programs."
  },
  {
    id: "3",
    name: "Stanford University",
    country: "United States",
    city: "Stanford",
    website: "https://stanford.edu",
    description: "Stanford University is a private research university in Stanford, California. It was founded in 1885 by Leland and Jane Stanford in memory of their only child, Leland Stanford Jr.",
    worldRanking: 3,
    nationalRanking: 2,
    accreditation: ["WASC", "AACSB", "ABET"],
    programs: ["Computer Science", "Engineering", "Business", "Medicine", "Law", "Humanities"],
    requirements: {
      academic: ["Minimum GPA 3.5", "SAT/ACT optional for 2024", "Rigorous high school curriculum"],
      language: ["TOEFL 100+ or IELTS 7.0+", "Duolingo English Test 115+"],
      financial: ["Application fee: $90", "Tuition: $56,169/year", "Need-based financial aid"],
      documents: ["Transcripts", "Letters of recommendation", "Essays", "Test scores (if submitted)"]
    },
    isPartner: true,
    partnershipLevel: "STRATEGIC",
    commissionRate: 20.0,
    contactEmail: "admissions@stanford.edu",
    contactPhone: "+1 (650) 723-2300",
    address: "450 Serra Mall, Stanford, CA 94305, USA",
    createdAt: "2024-01-03",
    lastUpdated: "2024-01-18",
    studentsPlaced: 15,
    applications: 32,
    successRate: 47,
    notes: "Strategic partner with highest commission rate. Excellent for STEM and business programs. Strong entrepreneurial culture."
  },
  {
    id: "4",
    name: "MIT",
    country: "United States",
    city: "Cambridge",
    website: "https://mit.edu",
    description: "The Massachusetts Institute of Technology is a private land-grant research university in Cambridge, Massachusetts. Founded in 1861, MIT has since played a key role in the development of modern technology and science.",
    worldRanking: 4,
    nationalRanking: 3,
    accreditation: ["NEASC", "ABET", "AACSB"],
    programs: ["Computer Science", "Engineering", "Physics", "Mathematics", "Economics", "Management"],
    requirements: {
      academic: ["Minimum GPA 3.7", "Strong STEM background", "Exceptional test scores"],
      language: ["TOEFL 100+ or IELTS 7.0+", "Duolingo English Test 120+"],
      financial: ["Application fee: $75", "Tuition: $53,790/year", "Need-based aid available"],
      documents: ["Transcripts", "Letters of recommendation (2 from STEM teachers)", "Essays", "Portfolio (for architecture)"]
    },
    isPartner: true,
    partnershipLevel: "PREMIUM",
    commissionRate: 16.0,
    contactEmail: "admissions@mit.edu",
    contactPhone: "+1 (617) 253-1000",
    address: "77 Massachusetts Ave, Cambridge, MA 02139, USA",
    createdAt: "2024-01-04",
    lastUpdated: "2024-01-17",
    studentsPlaced: 6,
    applications: 14,
    successRate: 43,
    notes: "Premium partner focused on STEM fields. Highly competitive with emphasis on research and innovation. Strong industry connections."
  },
  {
    id: "5",
    name: "University of Toronto",
    country: "Canada",
    city: "Toronto",
    website: "https://utoronto.ca",
    description: "The University of Toronto is a public research university in Toronto, Ontario, Canada. Founded in 1827 by royal charter, it is the oldest university in Upper Canada.",
    worldRanking: 25,
    nationalRanking: 1,
    accreditation: ["OUAC", "AUCC"],
    programs: ["Computer Science", "Engineering", "Medicine", "Law", "Business", "Arts & Science"],
    requirements: {
      academic: ["Minimum GPA 3.3", "Top 6 Grade 12 courses", "Program-specific prerequisites"],
      language: ["IELTS 6.5+ (no band below 6.0)", "TOEFL 89+"],
      financial: ["Application fee: $180 CAD", "Tuition: $31,000-67,000 CAD/year", "Scholarships available"],
      documents: ["Academic transcripts", "English proficiency test", "Personal profile", "Supplementary applications (for some programs)"]
    },
    isPartner: true,
    partnershipLevel: "BASIC",
    commissionRate: 10.0,
    contactEmail: "ask@utoronto.ca",
    contactPhone: "+1 (416) 978-2011",
    address: "27 King's College Cir, Toronto, ON M5S, Canada",
    createdAt: "2024-01-05",
    lastUpdated: "2024-01-16",
    studentsPlaced: 22,
    applications: 45,
    successRate: 49,
    notes: "Basic partner with good placement rates. More accessible admission requirements compared to top US/UK schools. Popular destination for international students."
  }
]

const countries = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Netherlands", "Sweden", "Norway", "Denmark", "Finland",
  "Switzerland", "Austria", "Belgium", "Ireland", "New Zealand",
  "Singapore", "Japan", "South Korea", "China", "India", "United Arab Emirates"
]

const programs = [
  "Computer Science", "Engineering", "Business Administration", "Medicine",
  "Law", "Mathematics", "Physics", "Chemistry", "Biology", "Psychology",
  "Economics", "Political Science", "History", "Philosophy", "Literature",
  "Art & Design", "Architecture", "Education", "Journalism", "Hospitality"
]

export default function UniversitiesPage() {
  const params = useParams()
  const subdomain = params.subdomain as string
  
  const [universities, setUniversities] = useState<University[]>(mockUniversities)
  const [searchTerm, setSearchTerm] = useState("")
  const [countryFilter, setCountryFilter] = useState<string>("all")
  const [partnershipFilter, setPartnershipFilter] = useState<string>("all")
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null)
  const [activeTab, setActiveTab] = useState("universities")

  // CRUD Operations
  const addUniversity = (newUniversity: Omit<University, 'id' | 'createdAt' | 'lastUpdated'>) => {
    const university: University = {
      ...newUniversity,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      studentsPlaced: 0,
      applications: 0,
      successRate: 0
    }
    setUniversities([...universities, university])
    setIsAddDialogOpen(false)
  }

  const updateUniversity = (updatedUniversity: University) => {
    setUniversities(universities.map(u => u.id === updatedUniversity.id ? updatedUniversity : u))
    setIsEditDialogOpen(false)
    setEditingUniversity(null)
  }

  const deleteUniversity = (universityId: string) => {
    if (confirm('Are you sure you want to delete this university?')) {
      setUniversities(universities.filter(u => u.id !== universityId))
    }
  }

  const filteredUniversities = universities.filter(university => {
    const matchesSearch = university.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         university.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         university.city.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCountry = countryFilter === "all" || university.country === countryFilter
    const matchesPartnership = partnershipFilter === "all" || university.partnershipLevel === partnershipFilter
    return matchesSearch && matchesCountry && matchesPartnership
  })

  const getPartnershipColor = (level: string) => {
    switch (level) {
      case "STRATEGIC": return "bg-purple-100 text-purple-800"
      case "PREMIUM": return "bg-blue-100 text-blue-800"
      case "BASIC": return "bg-green-100 text-green-800"
      case "NONE": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const stats = {
    total: universities.length,
    partners: universities.filter(u => u.isPartner).length,
    strategic: universities.filter(u => u.partnershipLevel === 'STRATEGIC').length,
    premium: universities.filter(u => u.partnershipLevel === 'PREMIUM').length,
    basic: universities.filter(u => u.partnershipLevel === 'BASIC').length,
    totalStudents: universities.reduce((sum, u) => sum + u.studentsPlaced, 0),
    totalApplications: universities.reduce((sum, u) => sum + u.applications, 0),
    avgSuccessRate: Math.round(universities.reduce((sum, u) => sum + u.successRate, 0) / universities.length)
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
                <h1 className="text-xl font-bold">University Partnerships</h1>
                <p className="text-sm text-muted-foreground">{subdomain}.eduagency.com</p>
              </div>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add University
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New University</DialogTitle>
                  <DialogDescription>
                    Add a new university to your partnership network
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">University Name *</Label>
                      <Input id="name" placeholder="Enter university name" />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" placeholder="https://university.edu" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map(country => (
                            <SelectItem key={country} value={country}>{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input id="city" placeholder="Enter city" />
                    </div>
                    <div>
                      <Label htmlFor="worldRanking">World Ranking</Label>
                      <Input id="worldRanking" type="number" placeholder="1" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Brief description of the university..." rows={3} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
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
                    <div>
                      <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                      <Input id="commissionRate" type="number" step="0.1" placeholder="15.0" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input id="contactEmail" type="email" placeholder="contact@university.edu" />
                    </div>
                    <div>
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input id="contactPhone" placeholder="+1 (555) 123-4567" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" placeholder="Full address" />
                  </div>
                  <div>
                    <Label htmlFor="programs">Programs</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select programs" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map(program => (
                          <SelectItem key={program} value={program}>{program}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" placeholder="Additional notes about the partnership..." rows={3} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => {
                      // Simulate adding a university with form data
                      const newUniversity: Omit<University, 'id' | 'createdAt' | 'lastUpdated'> = {
                        name: "New University",
                        country: "United States",
                        city: "New York",
                        description: "A new university partnership",
                        accreditation: ["Regional"],
                        programs: ["Business", "Computer Science"],
                        requirements: {
                          academic: ["High School Diploma"],
                          language: ["IELTS 6.5"],
                          financial: ["Application fee: $50"],
                          documents: ["Transcripts", "Letters of recommendation"]
                        },
                        isPartner: true,
                        partnershipLevel: "BASIC",
                        commissionRate: 10.0,
                        studentsPlaced: 0,
                        applications: 0,
                        successRate: 0
                      }
                      addUniversity(newUniversity)
                    }}>
                      Add University
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="universities">Universities</TabsTrigger>
            <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="universities" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Universities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.partners} partners
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Strategic Partners</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{stats.strategic}</div>
                  <p className="text-xs text-muted-foreground">
                    High commission
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Students Placed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all partners
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.avgSuccessRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    Average placement rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search universities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={countryFilter} onValueChange={setCountryFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Countries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Countries</SelectItem>
                        {countries.map(country => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={partnershipFilter} onValueChange={setPartnershipFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Partnerships" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Partnerships</SelectItem>
                        <SelectItem value="STRATEGIC">Strategic</SelectItem>
                        <SelectItem value="PREMIUM">Premium</SelectItem>
                        <SelectItem value="BASIC">Basic</SelectItem>
                        <SelectItem value="NONE">None</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      More Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Universities Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUniversities.map((university) => (
                <Card key={university.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {university.isPartner && (
                          <Award className="h-5 w-5 text-yellow-500" />
                        )}
                        <CardTitle className="text-lg">{university.name}</CardTitle>
                      </div>
                      <Badge className={getPartnershipColor(university.partnershipLevel)}>
                        {university.partnershipLevel}
                      </Badge>
                    </div>
                    <CardDescription>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {university.city}, {university.country}
                      </div>
                      {university.worldRanking && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          World Rank #{university.worldRanking}
                        </div>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {university.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Students Placed</p>
                          <p className="font-semibold">{university.studentsPlaced}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Applications</p>
                          <p className="font-semibold">{university.applications}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Success Rate</p>
                          <p className="font-semibold">{university.successRate}%</p>
                        </div>
                        {university.commissionRate && (
                          <div>
                            <p className="text-muted-foreground">Commission</p>
                            <p className="font-semibold">{university.commissionRate}%</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedUniversity(university)
                            setIsViewDialogOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setEditingUniversity(university)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteUniversity(university.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {university.website && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={university.website} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="partnerships" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Handshake className="h-5 w-5 text-purple-600" />
                    Strategic
                  </CardTitle>
                  <CardDescription>High-value partnerships</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.strategic}</div>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                      <span>Students</span>
                      <span>{universities.filter(u => u.partnershipLevel === 'STRATEGIC').reduce((sum, u) => sum + u.studentsPlaced, 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg Commission</span>
                      <span>18%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600" />
                    Premium
                  </CardTitle>
                  <CardDescription>Established partnerships</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.premium}</div>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                      <span>Students</span>
                      <span>{universities.filter(u => u.partnershipLevel === 'PREMIUM').reduce((sum, u) => sum + u.studentsPlaced, 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg Commission</span>
                      <span>15.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Basic
                  </CardTitle>
                  <CardDescription>Standard partnerships</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.basic}</div>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                      <span>Students</span>
                      <span>{universities.filter(u => u.partnershipLevel === 'BASIC').reduce((sum, u) => sum + u.studentsPlaced, 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg Commission</span>
                      <span>10%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-600" />
                    Partnership Goals
                  </CardTitle>
                  <CardDescription>2024 Targets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>New Strategic</span>
                        <span>2/5</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Total Partners</span>
                        <span>{stats.partners}/25</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Partnership Management</CardTitle>
                <CardDescription>Tools and actions for managing university partnerships</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button className="h-20 flex-col">
                    <Plus className="h-6 w-6 mb-2" />
                    New Partnership
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <FileText className="h-6 w-6 mb-2" />
                    Agreement Renewals
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <BarChart3 className="h-6 w-6 mb-2" />
                    Performance Review
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Mail className="h-6 w-6 mb-2" />
                    Bulk Outreach
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Partnership Performance</CardTitle>
                  <CardDescription>Success rates by partnership level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Strategic</span>
                        <span>47% success rate</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-purple-600 h-3 rounded-full" style={{ width: '47%' }}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Premium</span>
                        <span>44% success rate</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-blue-600 h-3 rounded-full" style={{ width: '44%' }}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Basic</span>
                        <span>49% success rate</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-green-600 h-3 rounded-full" style={{ width: '49%' }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Universities</CardTitle>
                  <CardDescription>Based on student placements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {universities
                      .sort((a, b) => b.studentsPlaced - a.studentsPlaced)
                      .slice(0, 5)
                      .map((university, index) => (
                        <div key={university.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium">{university.name}</p>
                              <p className="text-sm text-muted-foreground">{university.studentsPlaced} students</p>
                            </div>
                          </div>
                          <Badge className={getPartnershipColor(university.partnershipLevel)}>
                            {university.partnershipLevel}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Partnership Revenue</CardTitle>
                <CardDescription>Commission earnings by partnership level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">$54K</div>
                    <p className="text-sm text-muted-foreground">Strategic</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">$36K</div>
                    <p className="text-sm text-muted-foreground">Premium</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">$22K</div>
                    <p className="text-sm text-muted-foreground">Basic</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-600">$112K</div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* University Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>University Details</DialogTitle>
            <DialogDescription>
              Complete university information and partnership details
            </DialogDescription>
          </DialogHeader>
          {selectedUniversity && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">University Name</Label>
                        <p className="text-lg">{selectedUniversity.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Location</Label>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <p>{selectedUniversity.city}, {selectedUniversity.country}</p>
                        </div>
                      </div>
                      {selectedUniversity.website && (
                        <div>
                          <Label className="text-sm font-medium">Website</Label>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={selectedUniversity.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {selectedUniversity.website}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      {selectedUniversity.worldRanking && (
                        <div>
                          <Label className="text-sm font-medium">World Ranking</Label>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <p className="text-lg font-semibold">#{selectedUniversity.worldRanking}</p>
                          </div>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-medium">Partnership Level</Label>
                        <Badge className={getPartnershipColor(selectedUniversity.partnershipLevel)}>
                          {selectedUniversity.partnershipLevel}
                        </Badge>
                      </div>
                      {selectedUniversity.commissionRate && (
                        <div>
                          <Label className="text-sm font-medium">Commission Rate</Label>
                          <p className="text-lg font-semibold">{selectedUniversity.commissionRate}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{selectedUniversity.description}</p>
                </CardContent>
              </Card>

              {/* Programs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Programs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedUniversity.programs.map((program, index) => (
                      <Badge key={index} variant="outline">{program}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Admission Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Academic</h4>
                      <ul className="space-y-1">
                        {selectedUniversity.requirements.academic.map((req, index) => (
                          <li key={index} className="text-sm flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Language</h4>
                      <ul className="space-y-1">
                        {selectedUniversity.requirements.language.map((req, index) => (
                          <li key={index} className="text-sm flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Financial</h4>
                      <ul className="space-y-1">
                        {selectedUniversity.requirements.financial.map((req, index) => (
                          <li key={index} className="text-sm flex items-center gap-2">
                            <DollarSign className="h-3 w-3 text-green-600" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Documents</h4>
                      <ul className="space-y-1">
                        {selectedUniversity.requirements.documents.map((req, index) => (
                          <li key={index} className="text-sm flex items-center gap-2">
                            <FileText className="h-3 w-3 text-green-600" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      {selectedUniversity.contactEmail && (
                        <div>
                          <Label className="text-sm font-medium">Email</Label>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <p>{selectedUniversity.contactEmail}</p>
                          </div>
                        </div>
                      )}
                      {selectedUniversity.contactPhone && (
                        <div>
                          <Label className="text-sm font-medium">Phone</Label>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <p>{selectedUniversity.contactPhone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      {selectedUniversity.address && (
                        <div>
                          <Label className="text-sm font-medium">Address</Label>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <p className="text-sm">{selectedUniversity.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{selectedUniversity.studentsPlaced}</div>
                      <p className="text-sm text-muted-foreground">Students Placed</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{selectedUniversity.applications}</div>
                      <p className="text-sm text-muted-foreground">Applications</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">{selectedUniversity.successRate}%</div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {selectedUniversity.commissionRate || 0}%
                      </div>
                      <p className="text-sm text-muted-foreground">Commission</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedUniversity.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{selectedUniversity.notes}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit University
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}