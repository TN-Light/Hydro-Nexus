'use client'

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEffect } from "react"
import { redirect } from "next/navigation"
import { Leaf, Sprout, Bug, Droplet } from "lucide-react"

export default function CropsPage() {
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      redirect("/login")
    }
  }, [user, isLoading])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crop Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage crop types, varieties, and growing parameters for your hydroponic system.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <Leaf className="w-8 h-8 text-green-500 mb-2" />
            <CardTitle>Leafy Greens</CardTitle>
            <CardDescription>Fast-growing, nutrient-rich crops</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Lettuce</span>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Spinach</span>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Kale</span>
                <Badge variant="secondary">Inactive</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Sprout className="w-8 h-8 text-blue-500 mb-2" />
            <CardTitle>Herbs</CardTitle>
            <CardDescription>Aromatic and culinary herbs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Basil</span>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Mint</span>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Cilantro</span>
                <Badge variant="secondary">Inactive</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Droplet className="w-8 h-8 text-purple-500 mb-2" />
            <CardTitle>Exotic Crops</CardTitle>
            <CardDescription>High-value specialty crops</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Microgreens</span>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Strawberries</span>
                <Badge variant="secondary">Inactive</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Tomatoes</span>
                <Badge variant="secondary">Inactive</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Coming Soon</CardTitle>
          <CardDescription>
            Full crop management features including crop selection, parameter customization, and growth tracking.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
