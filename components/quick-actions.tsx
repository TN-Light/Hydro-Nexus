"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StableSwitch } from "@/components/ui/stable-switch"
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

  const handleAction = useCallback(async (action: string, newState: boolean) => {
    if (isLoading) return // Prevent multiple simultaneous actions
    
    setIsLoading(action)

    try {
      // Map UI actions to ESP32 commands
      let commandAction = ''
      switch (action) {
        case "pump":
          commandAction = newState ? 'water_pump_on' : 'water_pump_off'
          break
        case "led":
          commandAction = newState ? 'led_on' : 'led_off'
          break
        case "dosing":
          commandAction = newState ? 'nutrient_pump_on' : 'nutrient_pump_off'
          break
      }

      // Send real command to ESP32 via API
      const response = await fetch(`/api/devices/${selectedGrowBag}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: commandAction,
          parameters: {},
          priority: 'high'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send command to device')
      }

      const result = await response.json()
      console.log('Command sent:', result)

      // Update UI state on success
      switch (action) {
        case "pump":
          setPumpActive(newState)
          toast({
            title: `Water Pump ${newState ? "Started" : "Stopped"}`,
            description: `Command sent to ${selectedGrowBag}. ESP32 will execute in ~30 seconds.`,
          })
          break
        case "led":
          setLedActive(newState)
          toast({
            title: `LED Lights ${newState ? "On" : "Off"}`,
            description: `Command sent to ${selectedGrowBag}. ESP32 will execute in ~30 seconds.`,
          })
          break
        case "dosing":
          setDosingActive(newState)
          toast({
            title: `Nutrient Dosing ${newState ? "Started" : "Stopped"}`,
            description: `Command sent to ${selectedGrowBag}. ESP32 will execute in ~30 seconds.`,
          })
          break
      }
    } catch (error) {
      console.error('Action failed:', error)
      toast({
        title: "Command Failed",
        description: `Unable to send command to ${selectedGrowBag}. Check connection.`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(null)
    }
  }, [isLoading, selectedGrowBag, toast])

  const runDosingCycle = useCallback(async () => {
    if (isLoading) return // Prevent multiple simultaneous actions
    
    setIsLoading("cycle")

    try {
      // Send manual dosing cycle command to ESP32
      const response = await fetch(`/api/devices/${selectedGrowBag}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_dosing_cycle',
          parameters: {
            duration: 10 // 10 seconds dosing cycle
          },
          priority: 'high'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start dosing cycle')
      }

      const result = await response.json()
      console.log('Dosing cycle command sent:', result)

      toast({
        title: "Dosing Cycle Started",
        description: `Manual nutrient cycle initiated for ${selectedGrowBag}. ESP32 will execute in ~30 seconds.`,
      })
    } catch (error) {
      console.error('Dosing cycle failed:', error)
      toast({
        title: "Cycle Failed",
        description: `Unable to start dosing cycle for ${selectedGrowBag}. Check connection.`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(null)
    }
  }, [isLoading, selectedGrowBag, toast])

  // Memoized handlers to prevent recreation on every render
  const handlePumpChange = useCallback((checked: boolean) => {
    handleAction("pump", checked)
  }, [handleAction])

  const handleLedChange = useCallback((checked: boolean) => {
    handleAction("led", checked)
  }, [handleAction])

  const handleDosingChange = useCallback((checked: boolean) => {
    handleAction("dosing", checked)
  }, [handleAction])

  // Memoized display name to prevent unnecessary re-renders
  const displayName = useMemo(() => 
    selectedGrowBag.replace("grow-bag-", "Grow Bag "), 
    [selectedGrowBag]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Quick Actions
        </CardTitle>
        <CardDescription>Control systems for {displayName}</CardDescription>
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
              <StableSwitch
                id="pump-switch"
                checked={pumpActive}
                onCheckedChange={handlePumpChange}
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
              <StableSwitch
                id="led-switch"
                checked={ledActive}
                onCheckedChange={handleLedChange}
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
                Nutrient Pump
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <StableSwitch
                id="dosing-switch"
                checked={dosingActive}
                onCheckedChange={handleDosingChange}
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
