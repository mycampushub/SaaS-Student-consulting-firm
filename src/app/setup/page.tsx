"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle, 
  Loader2, 
  Globe, 
  Settings, 
  Users, 
  GraduationCap,
  Shield,
  CreditCard,
  BarChart3,
  AlertCircle,
  ArrowRight,
  ArrowLeft
} from "lucide-react"

interface SetupStep {
  id: number
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  completed: boolean
}

interface TenantConfig {
  agencyId: string
  customDomain?: string
  features: {
    crm: boolean
    universityPartnerships: boolean
    visaProcessing: boolean
    billing: boolean
    analytics: boolean
  }
}

const defaultFeatures = {
  crm: true,
  universityPartnerships: true,
  visaProcessing: true,
  billing: true,
  analytics: true
}

function SetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const agencyParam = searchParams.get('agency')
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [tenantConfig, setTenantConfig] = useState<TenantConfig>({
    agencyId: '',
    features: defaultFeatures
  })

  const steps: SetupStep[] = [
    {
      id: 1,
      title: "Welcome",
      description: "Get started with your agency setup",
      icon: Settings,
      completed: currentStep > 1
    },
    {
      id: 2,
      title: "Domain Configuration",
      description: "Set up your custom domain",
      icon: Globe,
      completed: currentStep > 2
    },
    {
      id: 3,
      title: "Feature Selection",
      description: "Choose which features to enable",
      icon: Settings,
      completed: currentStep > 3
    },
    {
      id: 4,
      title: "Provisioning",
      description: "We're setting up your agency",
      icon: Loader2,
      completed: currentStep > 4
    },
    {
      id: 5,
      title: "Launch",
      description: "Your agency is ready to go!",
      icon: CheckCircle,
      completed: currentStep > 5
    }
  ]

  useEffect(() => {
    // Simulate getting agency ID from URL or previous step
    if (agencyParam) {
      setTenantConfig(prev => ({ ...prev, agencyId: agencyParam }))
    }
  }, [agencyParam])

  const handleDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const customDomain = formData.get('customDomain') as string

    if (customDomain) {
      setIsVerifyingDomain(true)
      try {
        const response = await fetch('/api/tenants/verify-domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agencyId: tenantConfig.agencyId,
            customDomain
          })
        })

        const result = await response.json()
        
        if (result.verified) {
          setTenantConfig(prev => ({ ...prev, customDomain }))
          setCurrentStep(3)
        } else {
          setError(result.message || 'Domain verification failed')
        }
      } catch (error) {
        setError('Failed to verify domain')
      } finally {
        setIsVerifyingDomain(false)
      }
    } else {
      setCurrentStep(3)
    }
  }

  const handleFeatureToggle = (feature: keyof typeof defaultFeatures, enabled: boolean) => {
    setTenantConfig(prev => ({
      ...prev,
      features: { ...prev.features, [feature]: enabled }
    }))
  }

  const handleProvision = async () => {
    setIsProvisioning(true)
    setError(null)

    try {
      const response = await fetch('/api/tenants/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantConfig)
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        setTimeout(() => setCurrentStep(5), 2000)
      } else {
        setError(result.error || 'Failed to provision tenant')
      }
    } catch (error) {
      setError('Failed to provision tenant')
    } finally {
      setIsProvisioning(false)
    }
  }

  const getProgress = () => {
    return ((currentStep - 1) / (steps.length - 1)) * 100
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Settings className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Welcome to Your Agency Setup!</h2>
            <p className="text-muted-foreground">
              Let's get your education agency up and running in just a few simple steps.
              We'll guide you through configuring your domain, selecting features, and launching your platform.
            </p>
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Custom Domain</h3>
                <p className="text-sm text-muted-foreground">Use your own domain or our subdomain</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Team Management</h3>
                <p className="text-sm text-muted-foreground">Invite team members and set permissions</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">University Partners</h3>
                <p className="text-sm text-muted-foreground">Access our global university network</p>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <form onSubmit={handleDomainSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Domain Configuration</h2>
              <p className="text-muted-foreground">
                Set up your custom domain or use our provided subdomain
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="subdomain">Your Subdomain</Label>
                <div className="flex mt-1">
                  <Input
                    value={agencyParam || ''}
                    readOnly
                    className="rounded-r-none bg-muted"
                  />
                  <div className="bg-muted px-3 py-2 border border-l-0 border-input rounded-r-md text-sm text-muted-foreground">
                    .eduagency.com
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your agency will be accessible at this address
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-background text-muted-foreground">OR</span>
                </div>
              </div>

              <div>
                <Label htmlFor="customDomain">Custom Domain (Optional)</Label>
                <Input
                  id="customDomain"
                  name="customDomain"
                  placeholder="your-agency.com"
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Use your own domain for a completely white-label experience
                </p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCurrentStep(1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={isVerifyingDomain}>
                {isVerifyingDomain ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Settings className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Feature Selection</h2>
              <p className="text-muted-foreground">
                Choose which features you'd like to enable for your agency
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className={`cursor-pointer transition-all ${tenantConfig.features.crm ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Checkbox
                      checked={tenantConfig.features.crm}
                      onCheckedChange={(checked) => handleFeatureToggle('crm', checked as boolean)}
                    />
                    <Users className="h-5 w-5" />
                    Student CRM
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Complete student lifecycle management with AI-powered insights and automation
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${tenantConfig.features.universityPartnerships ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Checkbox
                      checked={tenantConfig.features.universityPartnerships}
                      onCheckedChange={(checked) => handleFeatureToggle('universityPartnerships', checked as boolean)}
                    />
                    <GraduationCap className="h-5 w-5" />
                    University Partnerships
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Access our global network of 1000+ universities and manage partnerships
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${tenantConfig.features.visaProcessing ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Checkbox
                      checked={tenantConfig.features.visaProcessing}
                      onCheckedChange={(checked) => handleFeatureToggle('visaProcessing', checked as boolean)}
                    />
                    <Shield className="h-5 w-5" />
                    Visa Processing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Streamlined visa application processing with document management
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${tenantConfig.features.billing ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Checkbox
                      checked={tenantConfig.features.billing}
                      onCheckedChange={(checked) => handleFeatureToggle('billing', checked as boolean)}
                    />
                    <CreditCard className="h-5 w-5" />
                    Billing & Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Integrated billing system with payment processing and invoicing
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${tenantConfig.features.analytics ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Checkbox
                      checked={tenantConfig.features.analytics}
                      onCheckedChange={(checked) => handleFeatureToggle('analytics', checked as boolean)}
                    />
                    <BarChart3 className="h-5 w-5" />
                    Analytics & Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Comprehensive analytics and reporting for data-driven decisions
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCurrentStep(2)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setCurrentStep(4)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              {isProvisioning ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              ) : success ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <Settings className="h-8 w-8 text-primary" />
              )}
            </div>
            
            <h2 className="text-2xl font-bold">
              {isProvisioning ? 'Provisioning Your Agency' : 
               success ? 'Setup Complete!' : 'Ready to Launch'}
            </h2>
            
            <p className="text-muted-foreground">
              {isProvisioning ? 'We\'re setting up your agency with all the selected features. This usually takes 2-3 minutes...' :
               success ? 'Your agency has been successfully provisioned and is ready to use!' :
               'Click the button below to start provisioning your agency.'}
            </p>

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">What's been set up:</h3>
                <ul className="text-sm text-green-700 space-y-1 text-left">
                  <li>✓ Agency activated and configured</li>
                  <li>✓ Default university partnerships created</li>
                  <li>✓ Brand settings applied</li>
                  <li>✓ User roles and permissions configured</li>
                  <li>✓ Analytics and monitoring enabled</li>
                </ul>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!isProvisioning && !success && (
              <Button onClick={handleProvision} size="lg">
                Start Provisioning
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {success && (
              <Button onClick={() => setCurrentStep(5)} size="lg">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )

      case 5:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            
            <h2 className="text-2xl font-bold">Congratulations! 🎉</h2>
            <p className="text-muted-foreground">
              Your education agency is now live and ready to start enrolling students.
            </p>

            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Your Agency Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agency URL:</span>
                  <a 
                    href={`https://${agencyParam}.eduagency.com`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {agencyParam}.eduagency.com
                  </a>
                </div>
                {tenantConfig.customDomain && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custom Domain:</span>
                    <a 
                      href={`https://${tenantConfig.customDomain}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {tenantConfig.customDomain}
                    </a>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="text-green-600 font-medium">Active</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => window.open(`https://${agencyParam}.eduagency.com`, '_blank')}>
                Visit Your Agency
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => window.open('/brand-studio', '_blank')}>
                Customize Branding
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">EA</span>
            </div>
            <span className="font-bold text-xl">Agency Setup</span>
          </div>
          <Button variant="ghost" onClick={() => router.push('/')}>
            Exit Setup
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Setup Progress</span>
            <span className="text-sm text-muted-foreground">{Math.round(getProgress())}% Complete</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
          
          <div className="flex justify-between mt-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <step.icon className={`h-5 w-5 mb-1 ${step.completed ? 'text-green-500' : ''}`} />
                <span className="text-xs">{step.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8">
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading setup...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <SetupContent />
    </Suspense>
  )
}