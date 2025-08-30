"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ExternalLink, Loader2 } from "lucide-react"

function SignupSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const agency = searchParams.get('agency')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!agency) {
      router.push('/')
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Redirect to the agency's dashboard
          window.location.href = `http://${agency}.localhost:3000/dashboard`
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [agency, router])

  if (!agency) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Invalid agency information. Redirecting...</p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto mt-4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">Agency Created Successfully!</CardTitle>
          <CardDescription>
            Your education agency platform is ready to use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">Your Agency URL:</p>
            <div className="bg-muted p-3 rounded-lg">
              <code className="text-sm font-mono">
                {agency}.localhost:3000
              </code>
            </div>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>✓ Agency dashboard created</p>
            <p>✓ Admin account configured</p>
            <p>✓ Brand settings initialized</p>
            <p>✓ Billing account set up</p>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              You will be redirected to your dashboard in {countdown} seconds...
            </p>
            
            <Button 
              onClick={() => {
                window.location.href = `http://${agency}.localhost:3000/dashboard`
              }}
              className="w-full"
            >
              Go to Dashboard Now
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="text-center">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/')}
              className="text-sm"
            >
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <SignupSuccessContent />
    </Suspense>
  )
}