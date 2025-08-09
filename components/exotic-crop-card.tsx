"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import Image from "next/image"
import { Thermometer, Droplets, Zap, Wind } from "lucide-react"

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

export function ExoticCropCard() {
  const [crop, setCrop] = useState<Crop | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/exotic-crops")
      .then((res) => res.json())
      .then((data) => {
        setCrop(data)
        setIsLoading(false)
      })
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Featured: Exotic Crop of the Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-48 bg-muted rounded-md"></div>
            <div className="space-y-2 mt-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!crop) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Featured: Exotic Crop of the Week</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Could not load crop data.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Featured: {crop.name}</CardTitle>
        <CardDescription>Discover a new high-value crop to cultivate.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Image
              src={crop.image}
              alt={crop.name}
              width={400}
              height={300}
              className="rounded-lg object-cover w-full h-full"
            />
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Ideal Conditions</h3>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
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
              <h3 className="font-semibold text-foreground">Potential</h3>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">Yield: {crop.yield}</Badge>
                <Badge variant="secondary">Price: {crop.marketPrice}</Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
