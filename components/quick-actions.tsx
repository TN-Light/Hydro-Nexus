"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Droplets, Lightbulb, Zap, Play, Pause } from "lucide-react"

interface QuickActionsProps {
  selectedGrowBag: string
}

export function QuickActions({ selectedGrowBag }: QuickActionsProps) {
  const [pumpActive, setPumpActive] = useState(false)
  const [ledActive, setLedActive] = useState(true)
  const [dosingActive, setDosingActive] = useState(false)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const handleAction = async (action: string, newState: boolean) => {
    setIsLoading(action)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    switch (action) {
      case "pump":
        setPumpActive(newState)
        toast({
          title: `Water Pump ${newState ? "Started" : "Stopped"}`,
          description: `${selectedGrowBag} water circulation ${newState ? "activated" : "deactivated"}`,
        })
        break
      case "led":
        setLedActive(newState)
        toast({
          title: `LED Lights ${newState ? "On" : "Off"}`,
          description: `${selectedGrowBag} lighting system ${newState ? "enabled" : "disabled"}`,
        })
        break
      case "dosing":
        setDosingActive(newState)
        toast({
          title: `Nutrient Dosing ${newState ? "Started" : "Stopped"}`,
          description: `${selectedGrowBag} nutrient injection ${newState ? "activated" : "deactivated"}`,
        })
        break
    }

    setIsLoading(null)
  }

  const runDosingCycle = async () => {
    setIsLoading("cycle")

    // Simulate dosing cycle
    await new Promise((resolve) => setTimeout(resolve, 2000))

    toast({
      title: "Dosing Cycle Complete",
      description: `Nutrient dosing cycle completed for ${selectedGrowBag}`,
    })

    setIsLoading(null)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-green-700 animate-pulse-glow" />
          Quick Actions
        </CardTitle>
        <CardDescription>Control systems for {selectedGrowBag.replace("grow-bag-", "Grow Bag ")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Water Pump Control */}
          <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-blue-50/50 to-transparent border border-blue-100/50 hover:border-blue-200 transition-all duration-300 interactive-element">
            <div className="flex items-center space-x-2">
              <Droplets className={`h-5 w-5 transition-all duration-300 ${pumpActive ? 'text-blue-600 animate-bounce-subtle' : 'text-blue-400'}`} />
              <Label htmlFor="pump-switch" className="text-sm font-semibold">
                Water Pump
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="pump-switch"
                checked={pumpActive}
                onCheckedChange={(checked) => handleAction("pump", checked)}
                disabled={isLoading === "pump"}
                className="data-[state=checked]:bg-blue-600"
              />
              <span className={`text-xs font-medium transition-colors duration-300 ${pumpActive ? 'text-blue-600' : 'text-soil-950/70'}`}>
                {pumpActive ? "Running" : "Stopped"}
              </span>
            </div>
            {isLoading === "pump" && <div className="text-xs text-green-700 animate-pulse">Updating...</div>}
          </div>

          {/* LED Lights Control */}
          <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-yellow-50/50 to-transparent border border-yellow-100/50 hover:border-yellow-200 transition-all duration-300 interactive-element">
            <div className="flex items-center space-x-2">
              <Lightbulb className={`h-5 w-5 transition-all duration-300 ${ledActive ? 'text-yellow-500 animate-pulse' : 'text-yellow-400'}`} />
              <Label htmlFor="led-switch" className="text-sm font-semibold">
                LED Lights
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="led-switch"
                checked={ledActive}
                onCheckedChange={(checked) => handleAction("led", checked)}
                disabled={isLoading === "led"}
                className="data-[state=checked]:bg-yellow-500"
              />
              <span className={`text-xs font-medium transition-colors duration-300 ${ledActive ? 'text-yellow-600' : 'text-soil-950/70'}`}>
                {ledActive ? "On" : "Off"}
              </span>
            </div>
            {isLoading === "led" && <div className="text-xs text-green-700 animate-pulse">Updating...</div>}
          </div>

          {/* Nutrient Dosing */}
          <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-green-50/50 to-transparent border border-green-100/50 hover:border-green-200 transition-all duration-300 interactive-element">
            <div className="flex items-center space-x-2">
              <Droplets className={`h-5 w-5 transition-all duration-300 ${dosingActive ? 'text-green-600 animate-bounce-subtle' : 'text-green-400'}`} />
              <Label htmlFor="dosing-switch" className="text-sm font-semibold">
                Auto Dosing
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="dosing-switch"
                checked={dosingActive}
                onCheckedChange={(checked) => handleAction("dosing", checked)}
                disabled={isLoading === "dosing"}
                className="data-[state=checked]:bg-green-600"
              />
              <span className={`text-xs font-medium transition-colors duration-300 ${dosingActive ? 'text-green-600' : 'text-soil-950/70'}`}>
                {dosingActive ? "Active" : "Inactive"}
              </span>
            </div>
            {isLoading === "dosing" && <div className="text-xs text-green-700 animate-pulse">Updating...</div>}
          </div>

          {/* Manual Dosing Cycle */}
          <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-purple-50/50 to-transparent border border-purple-100/50 hover:border-purple-200 transition-all duration-300 interactive-element">
            <div className="flex items-center space-x-2">
              <Play className={`h-5 w-5 transition-all duration-300 ${isLoading === "cycle" ? 'text-purple-600 animate-spin' : 'text-purple-600'}`} />
              <Label className="text-sm font-semibold">Manual Cycle</Label>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-purple-200 hover:border-purple-400 bg-transparent hover:bg-purple-50 transition-all duration-300"
              onClick={runDosingCycle}
              disabled={isLoading === "cycle"}
            >
              {isLoading === "cycle" ? (
                <>
                  <Pause className="h-3 w-3 mr-1 animate-pulse" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Start Cycle
                </>
              )}
            </Button>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-6 p-6 bg-gradient-to-r from-green-50 via-green-50/50 to-transparent dark:from-green-900/20 dark:to-transparent rounded-xl border border-green-100 dark:border-green-800">
          <h4 className="text-sm font-bold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            System Status
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium">
            <div>
              <span className="text-green-700 dark:text-green-400 font-semibold">Pump:</span>
              <span className={`ml-2 font-mono px-2 py-1 rounded text-xs ${pumpActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {pumpActive ? "ON" : "OFF"}
              </span>
            </div>
            <div>
              <span className="text-green-700 dark:text-green-400 font-semibold">Lights:</span>
              <span className={`ml-2 font-mono px-2 py-1 rounded text-xs ${ledActive ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                {ledActive ? "ON" : "OFF"}
              </span>
            </div>
            <div>
              <span className="text-green-700 dark:text-green-400 font-semibold">Dosing:</span>
              <span className={`ml-2 font-mono px-2 py-1 rounded text-xs ${dosingActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {dosingActive ? "AUTO" : "MANUAL"}
              </span>
            </div>
            <div>
              <span className="text-green-700 dark:text-green-400 font-semibold">Status:</span>
              <span className="ml-2 font-mono px-2 py-1 rounded text-xs bg-green-100 text-green-700 animate-pulse-glow">
                OPTIMAL
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
