"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useEffect } from "react"
import { redirect } from "next/navigation"

// Import placeholder components
import { Greeting } from "@/components/greeting"
import { ExoticCropCard } from "@/components/exotic-crop-card"
import { GreenhousePreview } from "@/components/greenhouse-preview"
import { QuickNav } from "@/components/quick-nav"
import { SustainabilityScore } from "@/components/sustainability-score"

export default function WelcomeHubPage() {
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      redirect("/login")
    }
  }, [user, isLoading])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Greeting />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ExoticCropCard />
            <QuickNav />
          </div>
          <div className="space-y-6">
            <GreenhousePreview />
            <SustainabilityScore />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
