"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle, Users, Globe, Zap, Shield, Star } from "lucide-react"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"

export default function Home() {
  const features = [
    {
      icon: Users,
      title: "Student CRM",
      description: "Complete student lifecycle management with AI-powered insights"
    },
    {
      icon: Globe,
      title: "University Partnerships",
      description: "Connect with 1000+ universities worldwide"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Launch your agency in just 15 minutes"
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "SOC 2 Type II certified and GDPR-ready"
    }
  ]

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CEO, Global Education Partners",
      content: "This platform transformed our agency operations. We onboarded 200+ students in the first month!",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Director, Study Abroad Consultants",
      content: "The white-label features allowed us to maintain our brand while scaling operations globally.",
      rating: 5
    },
    {
      name: "Emma Rodriguez",
      role: "Founder, EduPath International",
      content: "From setup to first student enrollment in under 2 hours. Incredible platform!",
      rating: 5
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="container mx-auto px-4 py-20 lg:py-32">
            <div className="text-center">
              <Badge variant="secondary" className="mb-4">
                🚀 Launch in 15 Minutes
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Launch Your Student Agency in 15 Minutes
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                The complete white-label SaaS platform for education agencies. Manage international student recruitment, 
                university partnerships, and visa processing - all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button size="lg" className="text-lg px-8 py-6" onClick={() => window.location.href = '/signup'}>
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 py-6" onClick={() => window.location.href = '/admin'}>
                  Admin Login
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20" id="features">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Everything You Need to Scale Your Education Agency
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Comprehensive features designed specifically for international student recruitment agencies
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Self-Service Onboarding */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                  Self-Service Onboarding in 4 Simple Steps
                </h2>
                <p className="text-xl text-muted-foreground">
                  Get your agency up and running without any technical expertise
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-semibold">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Instant Signup</h3>
                      <p className="text-muted-foreground">
                        Email/password or Google SSO. Agency name → auto-generated subdomain
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-semibold">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Brand Studio</h3>
                      <p className="text-muted-foreground">
                        Upload logo + set colors. Preview mobile/desktop views in under 5 minutes
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-semibold">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Team Bootstrap</h3>
                      <p className="text-muted-foreground">
                        CSV user import, role assignment, and permission setup in 3 minutes
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-semibold">
                      4
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Go Live</h3>
                      <p className="text-muted-foreground">
                        Custom domain verification and launch your agency immediately
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Trusted by Education Agencies Worldwide
              </h2>
              <p className="text-xl text-muted-foreground">
                Join hundreds of agencies scaling their student recruitment
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic">
                      "{testimonial.content}"
                    </p>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Ready to Launch Your Education Agency?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join the hundreds of agencies already scaling with our platform
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6" onClick={() => window.location.href = '/signup'}>
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-primary">
                Contact Sales
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}