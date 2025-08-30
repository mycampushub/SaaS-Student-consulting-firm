"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Upload, 
  Download, 
  Eye, 
  EyeOff, 
  Smartphone, 
  Monitor, 
  Palette, 
  Mail, 
  MessageSquare,
  CheckCircle,
  Loader2
} from "lucide-react"

interface BrandSettings {
  logo?: string
  favicon?: string
  primaryColor: string
  secondaryColor: string
  customCss?: string
  emailTemplate?: string
  smsTemplate?: string
}

const defaultEmailTemplate = `Hello {{studentName}},

Thank you for your interest in {{agencyName}}! We're excited to help you with your study abroad journey.

Next Steps:
1. Complete your application form
2. Submit required documents
3. Schedule a consultation

If you have any questions, please don't hesitate to contact us.

Best regards,
{{agencyName}} Team`

const defaultSmsTemplate = `Hi {{studentName}}, thanks for choosing {{agencyName}}! Your study abroad application has been received. We'll contact you soon for next steps. Reply HELP for support.`

export default function BrandStudio() {
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
    emailTemplate: defaultEmailTemplate,
    smsTemplate: defaultSmsTemplate
  })
  
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('desktop')
  const [showPreview, setShowPreview] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleColorChange = (field: keyof BrandSettings, value: string) => {
    setBrandSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (field: keyof BrandSettings, file: File) => {
    // In a real app, this would upload to a storage service
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setBrandSettings(prev => ({ ...prev, [field]: result }))
    }
    reader.readAsDataURL(file)
  }

  const handleTemplateChange = (field: keyof BrandSettings, value: string) => {
    setBrandSettings(prev => ({ ...prev, [field]: value }))
  }

  const saveSettings = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 1500)
  }

  const PreviewComponent = () => (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${
      previewMode === 'mobile' ? 'w-80' : 'w-full max-w-2xl'
    }`}>
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between"
        style={{ backgroundColor: brandSettings.primaryColor, color: 'white' }}
      >
        <div className="flex items-center gap-3">
          {brandSettings.logo ? (
            <img 
              src={brandSettings.logo} 
              alt="Logo" 
              className="h-8 w-8 object-contain"
            />
          ) : (
            <div className="h-8 w-8 bg-white/20 rounded flex items-center justify-center">
              <span className="text-sm font-bold">EA</span>
            </div>
          )}
          <span className="font-semibold">Your Agency</span>
        </div>
        <nav className="hidden md:flex gap-6">
          <a href="#" className="hover:opacity-80">Home</a>
          <a href="#" className="hover:opacity-80">Services</a>
          <a href="#" className="hover:opacity-80">Contact</a>
        </nav>
      </div>

      {/* Hero Section */}
      <div className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Study Abroad Made Simple</h1>
        <p className="text-gray-600 mb-6">
          Your trusted partner for international education opportunities
        </p>
        <button 
          className="px-6 py-3 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: brandSettings.secondaryColor }}
        >
          Get Started
        </button>
      </div>

      {/* Features */}
      <div className="p-8 grid md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mb-4 mx-auto flex items-center justify-center"
               style={{ backgroundColor: brandSettings.primaryColor + '20' }}>
            <div className="w-6 h-6 rounded" style={{ backgroundColor: brandSettings.primaryColor }}></div>
          </div>
          <h3 className="font-semibold mb-2">Expert Guidance</h3>
          <p className="text-sm text-gray-600">Professional counselors to help you choose the right path</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mb-4 mx-auto flex items-center justify-center"
               style={{ backgroundColor: brandSettings.primaryColor + '20' }}>
            <div className="w-6 h-6 rounded" style={{ backgroundColor: brandSettings.primaryColor }}></div>
          </div>
          <h3 className="font-semibold mb-2">University Partnerships</h3>
          <p className="text-sm text-gray-600">Access to top universities worldwide</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mb-4 mx-auto flex items-center justify-center"
               style={{ backgroundColor: brandSettings.primaryColor + '20' }}>
            <div className="w-6 h-6 rounded" style={{ backgroundColor: brandSettings.primaryColor }}></div>
          </div>
          <h3 className="font-semibold mb-2">Visa Assistance</h3>
          <p className="text-sm text-gray-600">Complete support for visa applications</p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            {brandSettings.logo ? (
              <img 
                src={brandSettings.logo} 
                alt="Logo" 
                className="h-6 w-6 object-contain"
              />
            ) : (
              <div className="h-6 w-6 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-xs font-bold">EA</span>
              </div>
            )}
            <span className="text-sm text-gray-600">© 2024 Your Agency. All rights reserved.</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="text-sm text-gray-600 hover:text-gray-800">Privacy</a>
            <a href="#" className="text-sm text-gray-600 hover:text-gray-800">Terms</a>
            <a href="#" className="text-sm text-gray-600 hover:text-gray-800">Contact</a>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">EA</span>
              </div>
              <h1 className="text-xl font-bold">Brand Studio</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              <Button
                onClick={saveSettings}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {saveSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Brand settings saved successfully!
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Settings Panel */}
          <div className="space-y-6">
            <Tabs defaultValue="branding" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="branding" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-2">
                  Advanced
                </TabsTrigger>
              </TabsList>

              <TabsContent value="branding" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Logo & Favicon</CardTitle>
                    <CardDescription>
                      Upload your agency logo and favicon for brand consistency
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="logo">Logo</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          {brandSettings.logo ? (
                            <img 
                              src={brandSettings.logo} 
                              alt="Logo preview" 
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <Upload className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload('logo', file)
                            }}
                            className="w-64"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG, SVG up to 5MB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="favicon">Favicon</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                          {brandSettings.favicon ? (
                            <img 
                              src={brandSettings.favicon} 
                              alt="Favicon preview" 
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Upload className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload('favicon', file)
                            }}
                            className="w-64"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            32x32px, PNG or ICO
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Color Scheme</CardTitle>
                    <CardDescription>
                      Customize your agency's color palette
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          id="primaryColor"
                          value={brandSettings.primaryColor}
                          onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                          className="w-12 h-12 border rounded cursor-pointer"
                        />
                        <Input
                          value={brandSettings.primaryColor}
                          onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                          className="w-32"
                          placeholder="#3B82F6"
                        />
                        <div 
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: brandSettings.primaryColor }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor">Secondary Color</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          id="secondaryColor"
                          value={brandSettings.secondaryColor}
                          onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                          className="w-12 h-12 border rounded cursor-pointer"
                        />
                        <Input
                          value={brandSettings.secondaryColor}
                          onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                          className="w-32"
                          placeholder="#10B981"
                        />
                        <div 
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: brandSettings.secondaryColor }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="templates" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Template
                    </CardTitle>
                    <CardDescription>
                      Customize the email template sent to students
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={brandSettings.emailTemplate}
                      onChange={(e) => handleTemplateChange('emailTemplate', e.target.value)}
                      rows={10}
                      placeholder="Enter your email template..."
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Available variables: {'{{studentName}}'}, {'{{agencyName}}'}, {'{{consultantName}}'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      SMS Template
                    </CardTitle>
                    <CardDescription>
                      Customize the SMS template sent to students
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={brandSettings.smsTemplate}
                      onChange={(e) => handleTemplateChange('smsTemplate', e.target.value)}
                      rows={4}
                      placeholder="Enter your SMS template..."
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Available variables: {'{{studentName}}'}, {'{{agencyName}}'}, {'{{consultantName}}'}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom CSS</CardTitle>
                    <CardDescription>
                      Add custom CSS for advanced styling
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={brandSettings.customCss || ''}
                      onChange={(e) => handleTemplateChange('customCss', e.target.value)}
                      rows={8}
                      placeholder="Enter custom CSS..."
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Use this to add custom styles that override the default theme
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Live Preview</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant={previewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                    className="flex items-center gap-2"
                  >
                    <Smartphone className="h-4 w-4" />
                    Mobile
                  </Button>
                  <Button
                    variant={previewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                    className="flex items-center gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    Desktop
                  </Button>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border overflow-auto">
                <PreviewComponent />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}