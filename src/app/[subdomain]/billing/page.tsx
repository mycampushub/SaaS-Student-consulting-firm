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
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Download,
  Plus,
  Settings,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  BarChart3,
  Users,
  Database,
  Zap
} from 'lucide-react'
import { format } from 'date-fns'

interface Invoice {
  id: string
  number: string
  amount: number
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED'
  date: string
  dueDate: string
  downloadUrl: string
}

interface Subscription {
  plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  status: 'ACTIVE' | 'CANCELLED' | 'PENDING'
  currentPeriodStart: string
  currentPeriodEnd: string
  stripeSubscriptionId?: string
}

interface Usage {
  studentCount: number
  studentLimit: number
  userCount: number
  userLimit: number
  storageUsed: number
  storageLimit: number
}

interface BillingStats {
  monthlyRevenue: number
  totalRevenue: number
  upcomingInvoice: number
  lastPayment: string
  lastPaymentAmount: number
}

const planFeatures = {
  FREE: {
    students: 10,
    users: 3,
    storage: 1000,
    features: ['Basic student management', 'University database access', 'Email support']
  },
  STARTER: {
    students: 50,
    users: 5,
    storage: 5000,
    features: ['Everything in Free', 'Advanced analytics', 'Application tracking', 'Priority support']
  },
  PROFESSIONAL: {
    students: 200,
    users: 10,
    storage: 20000,
    features: ['Everything in Starter', 'Custom branding', 'API access', 'Dedicated account manager']
  },
  ENTERPRISE: {
    students: -1,
    users: -1,
    storage: -1,
    features: ['Everything in Professional', 'Unlimited everything', 'Custom integrations', 'White-label solution']
  }
}

const planPrices = {
  FREE: 0,
  STARTER: 99,
  PROFESSIONAL: 299,
  ENTERPRISE: 999
}

const statusColors = {
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  CANCELLED_SUB: 'bg-red-100 text-red-800',
  PENDING_SUB: 'bg-yellow-100 text-yellow-800'
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription>({
    plan: 'PROFESSIONAL',
    status: 'ACTIVE',
    currentPeriodStart: '2024-01-01',
    currentPeriodEnd: '2024-02-01'
  })

  const [usage, setUsage] = useState<Usage>({
    studentCount: 45,
    studentLimit: 200,
    userCount: 4,
    userLimit: 10,
    storageUsed: 8500,
    storageLimit: 20000
  })

  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: '1',
      number: 'INV-2024-001',
      amount: 299,
      status: 'PAID',
      date: '2024-01-01',
      dueDate: '2024-01-15',
      downloadUrl: '#'
    },
    {
      id: '2',
      number: 'INV-2024-002',
      amount: 299,
      status: 'PENDING',
      date: '2024-02-01',
      dueDate: '2024-02-15',
      downloadUrl: '#'
    }
  ])

  const [stats, setStats] = useState<BillingStats>({
    monthlyRevenue: 299,
    totalRevenue: 3588,
    upcomingInvoice: 299,
    lastPayment: '2024-01-01',
    lastPaymentAmount: 299
  })

  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>('')

  const handleUpgradePlan = (plan: string) => {
    setSelectedPlan(plan)
    setIsUpgradeDialogOpen(true)
  }

  const confirmUpgrade = () => {
    setSubscription({
      ...subscription,
      plan: selectedPlan as any,
      status: 'PENDING'
    })
    setIsUpgradeDialogOpen(false)
  }

  const getUsagePercentage = (used: number, limit: number) => {
    return limit === -1 ? 0 : Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage > 90) return 'text-red-600'
    if (percentage > 70) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription, usage, and billing information
          </p>
        </div>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Billing Settings
        </Button>
      </div>

      {/* Current Subscription Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <CreditCard className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Current Plan:</strong> {subscription.plan} - {subscription.status}. 
          Next billing date: {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlyRevenue}</div>
            <p className="text-xs text-muted-foreground">
              Current subscription
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Invoice</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.upcomingInvoice}</div>
            <p className="text-xs text-muted-foreground">
              Due on {format(new Date(subscription.currentPeriodEnd), 'MMM dd')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Payment</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.lastPaymentAmount}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(stats.lastPayment), 'MMM dd, yyyy')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>Your active subscription details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Plan</span>
                  <Badge className="bg-blue-100 text-blue-800">{subscription.plan}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Status</span>
                  <Badge className={statusColors[subscription.status]}>
                    {subscription.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Monthly Cost</span>
                  <span className="font-bold">${planPrices[subscription.plan]}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Current Period</span>
                  <span className="text-sm">
                    {format(new Date(subscription.currentPeriodStart), 'MMM dd')} - {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="pt-4">
                  <Button className="w-full" onClick={() => handleUpgradePlan('ENTERPRISE')}>
                    Upgrade Plan
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Your default payment method</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Visa ending in 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2025</p>
                  </div>
                </div>
                <div className="pt-4 space-y-2">
                  <Button variant="outline" className="w-full">
                    Update Payment Method
                  </Button>
                  <Button variant="outline" className="w-full">
                    View Billing History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Students</span>
                </CardTitle>
                <CardDescription>Student management usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Used</span>
                  <span className={`font-medium ${getUsageColor(getUsagePercentage(usage.studentCount, usage.studentLimit))}`}>
                    {usage.studentCount} / {usage.studentLimit === -1 ? '∞' : usage.studentLimit}
                  </span>
                </div>
                <Progress value={getUsagePercentage(usage.studentCount, usage.studentLimit)} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {usage.studentLimit === -1 ? 'Unlimited students' : `${usage.studentLimit - usage.studentCount} remaining`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Team Members</span>
                </CardTitle>
                <CardDescription>User account usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Used</span>
                  <span className={`font-medium ${getUsageColor(getUsagePercentage(usage.userCount, usage.userLimit))}`}>
                    {usage.userCount} / {usage.userLimit === -1 ? '∞' : usage.userLimit}
                  </span>
                </div>
                <Progress value={getUsagePercentage(usage.userCount, usage.userLimit)} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {usage.userLimit === -1 ? 'Unlimited users' : `${usage.userLimit - usage.userCount} remaining`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Storage</span>
                </CardTitle>
                <CardDescription>Document storage usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Used</span>
                  <span className={`font-medium ${getUsageColor(getUsagePercentage(usage.storageUsed, usage.storageLimit))}`}>
                    {Math.round(usage.storageUsed / 1024)}GB / {usage.storageLimit === -1 ? '∞' : `${Math.round(usage.storageLimit / 1024)}GB`}
                  </span>
                </div>
                <Progress value={getUsagePercentage(usage.storageUsed, usage.storageLimit)} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {usage.storageLimit === -1 ? 'Unlimited storage' : `${Math.round((usage.storageLimit - usage.storageUsed) / 1024)}GB remaining`}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Your billing history and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.number}</TableCell>
                      <TableCell>{format(new Date(invoice.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>${invoice.amount}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[invoice.status]}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="text-center space-y-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Choose Your Plan</h2>
              <p className="text-muted-foreground">
                Select the perfect plan for your educational agency
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(planFeatures).map(([plan, features]) => (
              <Card key={plan} className={`relative ${plan === subscription.plan ? 'ring-2 ring-primary' : ''}`}>
                {plan === subscription.plan && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Current Plan</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan}</CardTitle>
                  <CardDescription>
                    <div className="text-3xl font-bold">
                      ${planPrices[plan as keyof typeof planPrices]}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {features.students === -1 ? 'Unlimited' : features.students} students
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {features.users === -1 ? 'Unlimited' : features.users} users
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {features.storage === -1 ? 'Unlimited' : `${Math.round(features.storage / 1024)}GB`} storage
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {features.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button 
                    className="w-full" 
                    variant={plan === subscription.plan ? "outline" : "default"}
                    onClick={() => handleUpgradePlan(plan)}
                    disabled={plan === subscription.plan}
                  >
                    {plan === subscription.plan ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Upgrade Plan Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to {selectedPlan}</DialogTitle>
            <DialogDescription>
              Are you sure you want to upgrade your subscription to the {selectedPlan} plan?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="font-medium">Plan Details:</p>
              <p className="text-sm text-muted-foreground">
                Monthly cost: ${planPrices[selectedPlan as keyof typeof planPrices]}
              </p>
              <p className="text-sm text-muted-foreground">
                Students: {planFeatures[selectedPlan as keyof typeof planFeatures].students === -1 ? 'Unlimited' : planFeatures[selectedPlan as keyof typeof planFeatures].students}
              </p>
              <p className="text-sm text-muted-foreground">
                Users: {planFeatures[selectedPlan as keyof typeof planFeatures].users === -1 ? 'Unlimited' : planFeatures[selectedPlan as keyof typeof planFeatures].users}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmUpgrade}>
              Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}