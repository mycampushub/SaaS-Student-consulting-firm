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
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Search,
  Filter,
  Download,
  FileText,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin
} from "lucide-react"

interface AccountingData {
  id: string
  currency: string
  timezone: string
  totalRevenue: number
  monthlyRevenue: number
  totalExpenses: number
  monthlyExpenses: number
  netProfit: number
  profitMargin: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  student?: {
    firstName: string
    lastName: string
    email: string
  }
  amount: number
  currency: string
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'
  issueDate: string
  dueDate: string
  paidDate?: string
  paymentMethod?: string
}

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'REFUND' | 'TRANSFER'
  amount: number
  currency: string
  description?: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  paymentMethod?: string
  createdAt: string
  invoice?: {
    invoiceNumber: string
  }
  student?: {
    firstName: string
    lastName: string
  }
}

export default function AccountingPage() {
  const params = useParams()
  const subdomain = params.subdomain as string
  
  const [accounting, setAccounting] = useState<AccountingData | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Mock data for demonstration
  const mockAccounting: AccountingData = {
    id: "1",
    currency: "USD",
    timezone: "UTC",
    totalRevenue: 125000,
    monthlyRevenue: 12500,
    totalExpenses: 85000,
    monthlyExpenses: 8500,
    netProfit: 40000,
    profitMargin: 32
  }

  const mockInvoices: Invoice[] = [
    {
      id: "1",
      invoiceNumber: "INV-000001",
      student: {
        firstName: "Alex",
        lastName: "Thompson",
        email: "alex.thompson@email.com"
      },
      amount: 2500,
      currency: "USD",
      status: "PAID",
      issueDate: "2024-01-15",
      dueDate: "2024-01-30",
      paidDate: "2024-01-28",
      paymentMethod: "Credit Card"
    },
    {
      id: "2",
      invoiceNumber: "INV-000002",
      student: {
        firstName: "Maria",
        lastName: "Garcia",
        email: "maria.garcia@email.com"
      },
      amount: 3200,
      currency: "USD",
      status: "SENT",
      issueDate: "2024-01-18",
      dueDate: "2024-02-02"
    },
    {
      id: "3",
      invoiceNumber: "INV-000003",
      student: {
        firstName: "James",
        lastName: "Wilson",
        email: "james.wilson@email.com"
      },
      amount: 2800,
      currency: "USD",
      status: "OVERDUE",
      issueDate: "2024-01-10",
      dueDate: "2024-01-25"
    }
  ]

  const mockTransactions: Transaction[] = [
    {
      id: "1",
      type: "INCOME",
      amount: 2500,
      currency: "USD",
      description: "Application fee - Alex Thompson",
      status: "COMPLETED",
      paymentMethod: "Credit Card",
      createdAt: "2024-01-28",
      invoice: {
        invoiceNumber: "INV-000001"
      },
      student: {
        firstName: "Alex",
        lastName: "Thompson"
      }
    },
    {
      id: "2",
      type: "EXPENSE",
      amount: 500,
      currency: "USD",
      description: "Marketing expenses",
      status: "COMPLETED",
      paymentMethod: "Bank Transfer",
      createdAt: "2024-01-25"
    },
    {
      id: "3",
      type: "INCOME",
      amount: 1500,
      currency: "USD",
      description: "Consultation fee - Maria Garcia",
      status: "PENDING",
      paymentMethod: "Bank Transfer",
      createdAt: "2024-01-20"
    }
  ]

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setAccounting(mockAccounting)
      setInvoices(mockInvoices)
      setTransactions(mockTransactions)
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID": case "COMPLETED": return "bg-green-100 text-green-800"
      case "SENT": case "PENDING": return "bg-yellow-100 text-yellow-800"
      case "OVERDUE": return "bg-red-100 text-red-800"
      case "CANCELLED": case "FAILED": return "bg-gray-100 text-gray-800"
      case "REFUNDED": return "bg-blue-100 text-blue-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "INCOME": return "text-green-600"
      case "EXPENSE": return "text-red-600"
      case "REFUND": return "text-blue-600"
      case "TRANSFER": return "text-gray-600"
      default: return "text-gray-600"
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.student?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.student?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredTransactions = transactions.filter(transaction => {
    return transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           transaction.invoice?.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading accounting data...</p>
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
                <h1 className="text-xl font-bold">Accounting</h1>
                <p className="text-sm text-muted-foreground">{subdomain}.eduagency.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Dialog open={isCreateInvoiceOpen} onOpenChange={setIsCreateInvoiceOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Invoice</DialogTitle>
                    <DialogDescription>Generate a new invoice for a student</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="student">Student</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Alex Thompson</SelectItem>
                          <SelectItem value="2">Maria Garcia</SelectItem>
                          <SelectItem value="3">James Wilson</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input id="amount" type="number" placeholder="0.00" />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" placeholder="Invoice description" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="issueDate">Issue Date</Label>
                        <Input id="issueDate" type="date" />
                      </div>
                      <div>
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input id="dueDate" type="date" />
                      </div>
                    </div>
                    <Button className="w-full">Create Invoice</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Financial Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${accounting?.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ${accounting?.monthlyRevenue.toLocaleString()} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${accounting?.totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ${accounting?.monthlyExpenses.toLocaleString()} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${accounting?.netProfit.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {accounting?.profitMargin}% profit margin
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${invoices.filter(i => i.status === 'SENT' || i.status === 'OVERDUE').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {invoices.filter(i => i.status === 'OVERDUE').length} overdue invoices
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-6">
            {/* Invoice Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search invoices..."
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
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Invoices Table */}
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>Manage and track all your invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.student?.firstName} {invoice.student?.lastName}</div>
                            <div className="text-sm text-muted-foreground">{invoice.student?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>${invoice.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <CreditCard className="h-4 w-4" />
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

          <TabsContent value="transactions" className="space-y-6">
            {/* Transaction Filters */}
            <div className="flex gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Transactions Table */}
            <Card>
              <CardHeader>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>All income and expense transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${getTransactionTypeColor(transaction.type)}`}>
                            {transaction.type}
                          </span>
                        </TableCell>
                        <TableCell className={getTransactionTypeColor(transaction.type)}>
                          {transaction.type === 'INCOME' ? '+' : '-'}${transaction.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.paymentMethod}</TableCell>
                        <TableCell>{transaction.invoice?.invoiceNumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Reports</CardTitle>
                  <CardDescription>Generate detailed financial reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Profit & Loss Statement
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Balance Sheet
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Cash Flow Statement
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Accounts Receivable Aging
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tax Reports</CardTitle>
                  <CardDescription>Tax-related reports and documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Sales Tax Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Income Statement
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Expense Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                        1099 Forms
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}