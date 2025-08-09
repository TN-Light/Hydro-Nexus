"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Leaf } from "lucide-react"

export function SustainabilityScore() {
  // Mock data for now
  const score = 82

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Leaf className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>Sustainability Score</CardTitle>
            <CardDescription>Your farm's eco-friendliness rating.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold text-primary">{score}</span>
          <Progress value={score} className="w-full" />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Based on water usage, energy consumption, and waste reduction.
        </p>
      </CardContent>
    </Card>
  )
}
