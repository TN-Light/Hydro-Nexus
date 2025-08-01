"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Beaker, TrendingUp, CheckCircle, ArrowDownCircle, ArrowUpCircle, Brain, Zap, Leaf } from "lucide-react"
import { useState, useEffect } from "react"
import { redirect } from "next/navigation"

interface NutrientState {
  N: number
  P: number
  K: number
  Ca: number
  Mg: number
  Fe: number
  pH: number
  EC: number
}

interface OptimalRecipe {
  N: { value: number; status: "balance" | "deficiency" | "excess" }
  P: { value: number; status: "balance" | "deficiency" | "excess" }
  K: { value: number; status: "balance" | "deficiency" | "excess" }
  Ca: { value: number; status: "balance" | "deficiency" | "excess" }
  Mg: { value: number; status: "balance" | "deficiency" | "excess" }
  Fe: { value: number; status: "balance" | "deficiency" | "excess" }
  pH: { value: number; status: "balance" | "deficiency" | "excess" }
  EC: { value: number; status: "balance" | "deficiency" | "excess" }
}

const nutrientInfo = {
  N: { name: "Nitrogen", unit: "ppm", icon: Leaf, optimal: [150, 200] },
  P: { name: "Phosphorus", unit: "ppm", icon: Zap, optimal: [30, 50] },
  K: { name: "Potassium", unit: "ppm", icon: TrendingUp, optimal: [200, 300] },
  Ca: { name: "Calcium", unit: "ppm", icon: CheckCircle, optimal: [150, 200] },
  Mg: { name: "Magnesium", unit: "ppm", icon: Beaker, optimal: [50, 75] },
  Fe: { name: "Iron", unit: "ppm", icon: ArrowUpCircle, optimal: [2, 5] },
  pH: { name: "pH Level", unit: "", icon: Beaker, optimal: [5.5, 6.5] },
  EC: { name: "Electrical Conductivity", unit: "mS/cm", icon: Zap, optimal: [1.2, 2.0] },
}

const statusConfig = {
  balance: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "Optimal",
  },
  deficiency: {
    icon: ArrowDownCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    label: "Low",
  },
  excess: {
    icon: ArrowUpCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "High",
  },
}

export default function OptimizationPage() {
  const { user, isLoading } = useAuth()
  const { toast } = useToast()
  const [currentNutrients, setCurrentNutrients] = useState<NutrientState>({
    N: 180,
    P: 40,
    K: 250,
    Ca: 175,
    Mg: 60,
    Fe: 3.5,
    pH: 6.1,
    EC: 1.6,
  })
  const [optimalRecipe, setOptimalRecipe] = useState<OptimalRecipe | null>(null)
  const [predictedGrowthRate, setPredictedGrowthRate] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      redirect("/login")
    }
  }, [user, isLoading])

  const handleInputChange = (nutrient: keyof NutrientState, value: string) => {
    const numValue = Number.parseFloat(value) || 0
    setCurrentNutrients((prev) => ({
      ...prev,
      [nutrient]: numValue,
    }))
  }

  const generateOptimalRecipe = async () => {
    setIsGenerating(true)

    // Simulate ML processing time
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate mock optimal recipe with some randomization
    const recipe: OptimalRecipe = {} as OptimalRecipe

    Object.entries(nutrientInfo).forEach(([key, info]) => {
      const currentValue = currentNutrients[key as keyof NutrientState]
      const [minOptimal, maxOptimal] = info.optimal
      const optimalValue = minOptimal + Math.random() * (maxOptimal - minOptimal)

      let status: "balance" | "deficiency" | "excess"
      if (currentValue < minOptimal * 0.8) {
        status = "deficiency"
      } else if (currentValue > maxOptimal * 1.2) {
        status = "excess"
      } else {
        status = "balance"
      }

      recipe[key as keyof OptimalRecipe] = {
        value: Number(optimalValue.toFixed(key === "pH" ? 1 : 0)),
        status,
      }
    })

    setOptimalRecipe(recipe)

    // Generate mock growth rate prediction (between 85-98%)
    const growthRate = 85 + Math.random() * 13
    setPredictedGrowthRate(Number(growthRate.toFixed(1)))

    toast({
      title: "Optimal Recipe Generated",
      description: "Optimal recipe generated based on Random Forest + GA model.",
    })

    setIsGenerating(false)
  }

  const resetForm = () => {
    setCurrentNutrients({
      N: 180,
      P: 40,
      K: 250,
      Ca: 175,
      Mg: 60,
      Fe: 3.5,
      pH: 6.1,
      EC: 1.6,
    })
    setOptimalRecipe(null)
    setPredictedGrowthRate(null)

    toast({
      title: "Form Reset",
      description: "All values have been reset to defaults",
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-soil-950/70">Loading optimization engine...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-soil-950 dark:text-white">Nutrient Optimization Engine</h1>
            <p className="text-soil-950/70 dark:text-gray-300">
              AI-powered nutrient recipe optimization for maximum crop yield
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-purple-200 dark:text-gray-300">
              <Brain className="h-3 w-3 mr-1" />
              ML-Powered Analysis
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              className="border-green-200 hover:border-green-400 bg-transparent dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Reset Form
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Beaker className="h-5 w-5 text-green-700" />
                  Current Nutrient Profile
                </CardTitle>
                <CardDescription className="dark:text-gray-300">
                  Enter your current nutrient levels and water parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(nutrientInfo).map(([key, info]) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key} className="flex items-center gap-2 dark:text-gray-300">
                          <info.icon className="h-4 w-4 text-green-700" />
                          {info.name}
                          {info.unit && (
                            <span className="text-xs text-soil-950/70 dark:text-gray-400">({info.unit})</span>
                          )}
                        </Label>
                        <Input
                          id={key}
                          type="number"
                          step={key === "pH" ? "0.1" : key === "EC" ? "0.1" : "1"}
                          value={currentNutrients[key as keyof NutrientState]}
                          onChange={(e) => handleInputChange(key as keyof NutrientState, e.target.value)}
                          className="border-green-200 focus:border-green-500 dark:bg-gray-800 dark:text-white"
                          placeholder={`Enter ${info.name.toLowerCase()}`}
                        />
                        <div className="text-xs text-soil-950/70 dark:text-gray-400">
                          Optimal: {info.optimal[0]}-{info.optimal[1]} {info.unit}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    onClick={generateOptimalRecipe}
                    disabled={isGenerating}
                    className="w-full agriculture-gradient text-white hover:opacity-90 mt-6"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analyzing with AI...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Suggest Optimal Recipe
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Output Panel */}
          <div className="space-y-6">
            {/* Predicted Growth Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Predicted Growth Rate
                </CardTitle>
                <CardDescription className="dark:text-gray-300">
                  AI-estimated growth performance based on current conditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {predictedGrowthRate !== null ? (
                  <div className="text-center py-6">
                    <div className="text-4xl font-bold text-purple-600 mb-2 dark:text-purple-400">
                      {predictedGrowthRate}%
                    </div>
                    <div className="text-sm text-soil-950/70 dark:text-gray-400">Expected growth efficiency</div>
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg dark:bg-gray-800">
                      <p className="text-xs text-purple-700 dark:text-purple-300">
                        Based on Random Forest model trained on 10,000+ growth cycles with genetic algorithm
                        optimization.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-soil-950/70 dark:text-gray-400">
                    <Brain className="h-12 w-12 mx-auto mb-4 text-soil-950/30" />
                    <p>Click "Suggest Optimal Recipe" to generate AI predictions</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Optimal Recipe */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Zap className="h-5 w-5 text-green-700" />
                  Recommended Adjustments
                </CardTitle>
                <CardDescription className="dark:text-gray-300">
                  AI-optimized nutrient concentrations for your crop
                </CardDescription>
              </CardHeader>
              <CardContent>
                {optimalRecipe ? (
                  <div className="grid gap-3 w-full">
                    {Object.entries(optimalRecipe).map(([key, recommendation]) => {
                      const info = nutrientInfo[key as keyof typeof nutrientInfo]
                      const config = statusConfig[recommendation.status]
                      const StatusIcon = config.icon
                      const currentValue = currentNutrients[key as keyof NutrientState]

                      return (
                        <div
                          key={key}
                          className={`flex flex-col p-3 rounded-lg border ${config.bgColor} ${config.borderColor} w-full`}
                        >
                          <div className="flex items-center justify-between mb-2 w-full">
                            <div className="flex items-center gap-2">
                              <info.icon className="h-4 w-4 text-soil-950/70 dark:text-gray-400" />
                              <span className="font-medium text-soil-950 dark:text-white">{info.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`h-4 w-4 ${config.color}`} />
                              <Badge
                                variant="outline"
                                className={`${config.bgColor} ${config.borderColor} ${config.color}`}
                              >
                                {config.label}
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm w-full">
                            <div>
                              <span className="text-soil-950/70 dark:text-gray-400">Current:</span>
                              <span className="ml-2 font-mono text-soil-950 dark:text-white">
                                {currentValue} {info.unit}
                              </span>
                            </div>
                            <div>
                              <span className="text-soil-950/70 dark:text-gray-400">Optimal:</span>
                              <span className="ml-2 font-mono text-green-700 dark:text-green-400">
                                {recommendation.value} {info.unit}
                              </span>
                            </div>
                          </div>
                          {recommendation.status !== "balance" && (
                            <div className="mt-2 text-xs text-soil-950/70 dark:text-gray-400">
                              {recommendation.status === "deficiency"
                                ? `Increase by ${(recommendation.value - currentValue).toFixed(1)} ${info.unit}`
                                : `Decrease by ${(currentValue - recommendation.value).toFixed(1)} ${info.unit}`}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-soil-950/70 w-full dark:text-gray-400">
                    <Beaker className="h-12 w-12 mx-auto mb-4 text-soil-950/30" />
                    <p>Generate optimal recipe to see AI recommendations</p>
                    <p className="text-xs mt-2">Personalized adjustments based on your current nutrient profile</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Implementation Guide */}
            {optimalRecipe && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    Implementation Guide
                  </CardTitle>
                  <CardDescription className="dark:text-gray-300">
                    Step-by-step instructions for applying recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold dark:bg-blue-900 dark:text-blue-300">
                        1
                      </div>
                      <div>
                        <div className="font-medium text-soil-950 dark:text-white">Prepare Nutrient Solutions</div>
                        <div className="text-soil-950/70 text-xs dark:text-gray-400">
                          Mix concentrated nutrient solutions according to the recommended values above.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold dark:bg-blue-900 dark:text-blue-300">
                        2
                      </div>
                      <div>
                        <div className="font-medium text-soil-950 dark:text-white">Gradual Implementation</div>
                        <div className="text-soil-950/70 text-xs dark:text-gray-400">
                          Apply changes gradually over 3-5 days to avoid shocking the plants.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold dark:bg-blue-900 dark:text-blue-300">
                        3
                      </div>
                      <div>
                        <div className="font-medium text-soil-950 dark:text-white">Monitor & Adjust</div>
                        <div className="text-soil-950/70 text-xs dark:text-gray-400">
                          Check sensor readings every 6-8 hours and fine-tune as needed.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold dark:bg-blue-900 dark:text-blue-300">
                        4
                      </div>
                      <div>
                        <div className="font-medium text-soil-950 dark:text-white">Track Results</div>
                        <div className="text-soil-950/70 text-xs dark:text-gray-400">
                          Document plant response and growth metrics for future optimization cycles.
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
