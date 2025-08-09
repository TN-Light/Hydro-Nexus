"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import Image from "next/image"
import { Thermometer, Droplets, Zap, Wind } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { redirect } from "next/navigation"

interface Crop {
  name: string
  image: string
  conditions: {
    pH: { min: number; max: number }
    ec: { min: number; max: number }
    temp: { min: number; max: number }
    humidity: { min: number; max: number }
  }
  yield: string
  marketPrice: string
}

export default function ExoticCropsInfoPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [crops, setCrops] = useState<Crop[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthLoading && !user) {
      redirect("/login")
    }
  }, [user, isAuthLoading])

  useEffect(() => {
    if (user) {
      fetch("/api/exotic-crops")
        .then((res) => res.json())
        .then((data) => {
          setCrops(data)
          setIsLoading(false)
        })
    }
  }, [user])

  if (isAuthLoading || isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading crop data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Exotic Crops</h1>
        <p className="text-muted-foreground">
          Discover high-value exotic crops you can cultivate with Hydro Nexus.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {crops.map((crop) => (
          <Card key={crop.name}>
            <CardHeader>
              <div className="relative h-48 w-full mb-4">
                <Image
                  src={crop.image}
                  alt={crop.name}
                  fill
                  className="rounded-t-lg object-cover"
                />
              </div>
              <CardTitle>{crop.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Ideal Conditions</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-primary" />
                    <span>
                      pH: {crop.conditions.pH.min} - {crop.conditions.pH.max}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>
                      EC: {crop.conditions.ec.min} - {crop.conditions.ec.max} mS/cm
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-primary" />
                    <span>
                      Temp: {crop.conditions.temp.min}° - {crop.conditions.temp.max}°C
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 text-primary" />
                    <span>
                      Humidity: {crop.conditions.humidity.min}% - {crop.conditions.humidity.max}%
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Potential</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Yield: {crop.yield}</Badge>
                  <Badge variant="secondary">Price: {crop.marketPrice}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
