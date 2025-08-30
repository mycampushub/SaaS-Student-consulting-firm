"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Calendar, 
  Globe, 
  GraduationCap,
  Target,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff
} from "lucide-react"

interface StudentRegistrationData {
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    password: string
    confirmPassword: string
    phone: string
    dateOfBirth: string
    nationality: string
  }
  academicInfo: {
    currentEducation: string
    gpa: string
    institution: string
    graduationYear: string
  }
  preferences: {
    preferredCountries: string[]
    preferredCourses: string[]
    budget: string
    intake: string
  }
  terms: {
    acceptTerms: boolean
    acceptPrivacy: boolean
    acceptMarketing: boolean
  }
}

const countries = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Netherlands", "Sweden", "Norway", "Denmark", "Finland",
  "Switzerland", "Austria", "Belgium", "Ireland", "New Zealand",
  "Singapore", "Japan", "South Korea", "China", "India", "United Arab Emirates"
]

const courses = [
  "Computer Science", "Engineering", "Business Administration", "Marketing",
  "Medicine", "Law", "International Relations", "Economics", "Psychology",
  "Data Science", "Artificial Intelligence", "Biotechnology", "Architecture",
  "Design", "Journalism", "Education", "Hospitality Management"
]

const educationLevels = [
  "High School", "A-Levels", "IB Diploma", "Foundation Year",
  "Bachelor's Degree", "Master's Degree", "PhD", "Diploma", "Certificate"
]

export default function StudentRegisterPage() {
  const params = useParams()
  const router = useRouter()
  const subdomain = params.subdomain as string
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState<StudentRegistrationData>({
    personalInfo: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      dateOfBirth: "",
      nationality: ""
    },
    academicInfo: {
      currentEducation: "",
      gpa: "",
      institution: "",
      graduationYear: ""
    },
    preferences: {
      preferredCountries: [],
      preferredCourses: [],
      budget: "",
      intake: ""
    },
    terms: {
      acceptTerms: false,
      acceptPrivacy: false,
      acceptMarketing: false
    }
  })

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  const updatePersonalInfo = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }))
  }

  const updateAcademicInfo = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      academicInfo: { ...prev.academicInfo, [field]: value }
    }))
  }

  const updatePreferences = (field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [field]: value }
    }))
  }

  const updateTerms = (field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      terms: { ...prev.terms, [field]: value }
    }))
  }

  const handleCountrySelection = (country: string, selected: boolean) => {
    const currentCountries = formData.preferences.preferredCountries
    if (selected) {
      updatePreferences('preferredCountries', [...currentCountries, country])
    } else {
      updatePreferences('preferredCountries', currentCountries.filter(c => c !== country))
    }
  }

  const handleCourseSelection = (course: string, selected: boolean) => {
    const currentCourses = formData.preferences.preferredCourses
    if (selected) {
      updatePreferences('preferredCourses', [...currentCourses, course])
    } else {
      updatePreferences('preferredCourses', currentCourses.filter(c => c !== course))
    }
  }

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        if (!formData.personalInfo.firstName || !formData.personalInfo.lastName) {
          setError("Please enter your first and last name")
          return false
        }
        if (!formData.personalInfo.email || !formData.personalInfo.email.includes('@')) {
          setError("Please enter a valid email address")
          return false
        }
        if (!formData.personalInfo.password || formData.personalInfo.password.length < 8) {
          setError("Password must be at least 8 characters long")
          return false
        }
        if (formData.personalInfo.password !== formData.personalInfo.confirmPassword) {
          setError("Passwords do not match")
          return false
        }
        break
      case 2:
        if (!formData.academicInfo.currentEducation) {
          setError("Please select your current education level")
          return false
        }
        if (!formData.academicInfo.institution) {
          setError("Please enter your institution name")
          return false
        }
        break
      case 3:
        if (formData.preferences.preferredCountries.length === 0) {
          setError("Please select at least one preferred country")
          return false
        }
        if (formData.preferences.preferredCourses.length === 0) {
          setError("Please select at least one preferred course")
          return false
        }
        break
      case 4:
        if (!formData.terms.acceptTerms || !formData.terms.acceptPrivacy) {
          setError("Please accept the terms and privacy policy")
          return false
        }
        break
    }
    setError("")
    return true
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    setIsLoading(true)
    setError("")

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In real app, send data to backend
      console.log("Registration data:", formData)
      
      setSuccess(true)
      setTimeout(() => {
        router.push(`/${subdomain}/student`)
      }, 3000)
    } catch (error) {
      setError("Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
            <p className="text-muted-foreground mb-4">
              Your account has been created. Redirecting to login...
            </p>
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">EA</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Student Registration</h1>
                <p className="text-sm text-muted-foreground">{subdomain}.eduagency.com</p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => router.push(`/${subdomain}/student`)}>
              Already have an account?
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Registration Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-4">
              {['Personal', 'Academic', 'Preferences', 'Terms'].map((step, index) => (
                <div
                  key={step}
                  className={`flex flex-col items-center ${currentStep >= index + 1 ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-1 ${
                    currentStep >= index + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-xs">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-8">
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Personal Information</h2>
                    <p className="text-muted-foreground">Tell us about yourself</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.personalInfo.firstName}
                        onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.personalInfo.lastName}
                        onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.personalInfo.email}
                      onChange={(e) => updatePersonalInfo('email', e.target.value)}
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.personalInfo.password}
                          onChange={(e) => updatePersonalInfo('password', e.target.value)}
                          placeholder="Create a password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.personalInfo.confirmPassword}
                          onChange={(e) => updatePersonalInfo('confirmPassword', e.target.value)}
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.personalInfo.phone}
                        onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality</Label>
                      <Select onValueChange={(value) => updatePersonalInfo('nationality', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your nationality" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map(country => (
                            <SelectItem key={country} value={country}>{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.personalInfo.dateOfBirth}
                      onChange={(e) => updatePersonalInfo('dateOfBirth', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Academic Information</h2>
                    <p className="text-muted-foreground">Tell us about your educational background</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentEducation">Current Education Level *</Label>
                    <Select onValueChange={(value) => updateAcademicInfo('currentEducation', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your education level" />
                      </SelectTrigger>
                      <SelectContent>
                        {educationLevels.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="institution">Institution Name *</Label>
                    <Input
                      id="institution"
                      value={formData.academicInfo.institution}
                      onChange={(e) => updateAcademicInfo('institution', e.target.value)}
                      placeholder="Your school/university name"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gpa">GPA/Grade</Label>
                      <Input
                        id="gpa"
                        value={formData.academicInfo.gpa}
                        onChange={(e) => updateAcademicInfo('gpa', e.target.value)}
                        placeholder="3.8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="graduationYear">Graduation Year</Label>
                      <Input
                        id="graduationYear"
                        type="number"
                        value={formData.academicInfo.graduationYear}
                        onChange={(e) => updateAcademicInfo('graduationYear', e.target.value)}
                        placeholder="2024"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Study Preferences</h2>
                    <p className="text-muted-foreground">Let us know your study preferences</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Preferred Countries *</Label>
                      <p className="text-sm text-muted-foreground mb-3">Select countries you're interested in studying in</p>
                      <div className="grid md:grid-cols-2 gap-2">
                        {countries.slice(0, 12).map(country => (
                          <label key={country} className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50 cursor-pointer">
                            <Checkbox
                              checked={formData.preferences.preferredCountries.includes(country)}
                              onCheckedChange={(checked) => handleCountrySelection(country, checked as boolean)}
                            />
                            <span className="text-sm">{country}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-medium">Preferred Courses *</Label>
                      <p className="text-sm text-muted-foreground mb-3">Select courses you're interested in</p>
                      <div className="grid md:grid-cols-2 gap-2">
                        {courses.map(course => (
                          <label key={course} className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50 cursor-pointer">
                            <Checkbox
                              checked={formData.preferences.preferredCourses.includes(course)}
                              onCheckedChange={(checked) => handleCourseSelection(course, checked as boolean)}
                            />
                            <span className="text-sm">{course}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="budget">Budget (USD)</Label>
                        <Input
                          id="budget"
                          type="number"
                          value={formData.preferences.budget}
                          onChange={(e) => updatePreferences('budget', e.target.value)}
                          placeholder="50000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="intake">Preferred Intake</Label>
                        <Select onValueChange={(value) => updatePreferences('intake', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select intake" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fall-2024">Fall 2024</SelectItem>
                            <SelectItem value="spring-2025">Spring 2025</SelectItem>
                            <SelectItem value="fall-2025">Fall 2025</SelectItem>
                            <SelectItem value="spring-2026">Spring 2026</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Terms and Conditions</h2>
                    <p className="text-muted-foreground">Please review and accept our terms</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="acceptTerms"
                        checked={formData.terms.acceptTerms}
                        onCheckedChange={(checked) => updateTerms('acceptTerms', checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="acceptTerms" className="font-medium cursor-pointer">
                          Terms and Conditions *
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          I agree to the terms and conditions of service, including the student agreement 
                          and agency policies. I understand that my information will be used for 
                          educational consulting purposes.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="acceptPrivacy"
                        checked={formData.terms.acceptPrivacy}
                        onCheckedChange={(checked) => updateTerms('acceptPrivacy', checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="acceptPrivacy" className="font-medium cursor-pointer">
                          Privacy Policy *
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          I have read and agree to the privacy policy regarding the collection, use, 
                          and protection of my personal information in accordance with applicable laws.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="acceptMarketing"
                        checked={formData.terms.acceptMarketing}
                        onCheckedChange={(checked) => updateTerms('acceptMarketing', checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="acceptMarketing" className="font-medium cursor-pointer">
                          Marketing Communications
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          I would like to receive marketing communications about educational opportunities, 
                          scholarships, and agency updates. I can unsubscribe at any time.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {currentStep < totalSteps ? (
                  <Button onClick={handleNext}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creating Account...
                      </>
                    ) : (
                      "Complete Registration"
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}