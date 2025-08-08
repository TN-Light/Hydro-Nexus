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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Quick Actions
        </CardTitle>
        <CardDescription>Control systems for {selectedGrowBag.replace("grow-bag-", "Grow Bag ")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Water Pump Control */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <Label htmlFor="pump-switch" className="text-sm font-medium">
                Water Pump
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="pump-switch"
                checked={pumpActive}
                onCheckedChange={(checked) => handleAction("pump", checked)}
                disabled={isLoading === "pump"}
              />
              <span className="text-xs text-muted-foreground">{pumpActive ? "Running" : "Stopped"}</span>
            </div>
            {isLoading === "pump" && <div className="text-xs text-primary">Updating...</div>}
          </div>

          {/* LED Lights Control */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <Label htmlFor="led-switch" className="text-sm font-medium">
                LED Lights
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="led-switch"
                checked={ledActive}
                onCheckedChange={(checked) => handleAction("led", checked)}
                disabled={isLoading === "led"}
              />
              <span className="text-xs text-muted-foreground">{ledActive ? "On" : "Off"}</span>
            </div>
            {isLoading === "led" && <div className="text-xs text-primary">Updating...</div>}
          </div>

          {/* Nutrient Dosing */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Droplets className="h-4 w-4 text-green-500" />
              <Label htmlFor="dosing-switch" className="text-sm font-medium">
                Auto Dosing
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="dosing-switch"
                checked={dosingActive}
                onCheckedChange={(checked) => handleAction("dosing", checked)}
                disabled={isLoading === "dosing"}
              />
              <span className="text-xs text-muted-foreground">{dosingActive ? "Active" : "Inactive"}</span>
            </div>
            {isLoading === "dosing" && <div className="text-xs text-primary">Updating...</div>}
          </div>

          {/* Manual Dosing Cycle */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4 text-purple-500" />
              <Label className="text-sm font-medium">Manual Cycle</Label>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={runDosingCycle}
              disabled={isLoading === "cycle"}
            >
              {isLoading === "cycle" ? (
                <>
                  <Pause className="h-3 w-3 mr-1" />
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
        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
          <h4 className="text-sm font-medium text-primary mb-2">System Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-primary/80">Pump:</span>
              <span className="ml-1 font-mono text-foreground">{pumpActive ? "ON" : "OFF"}</span>
            </div>
            <div>
              <span className="text-primary/80">Lights:</span>
              <span className="ml-1 font-mono text-foreground">{ledActive ? "ON" : "OFF"}</span>
            </div>
            <div>
              <span className="text-primary/80">Dosing:</span>
              <span className="ml-1 font-mono text-foreground">{dosingActive ? "AUTO" : "MANUAL"}</span>
            </div>
            <div>
              <span className="text-primary/80">Status:</span>
              <span className="ml-1 font-mono text-primary">OPTIMAL</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
