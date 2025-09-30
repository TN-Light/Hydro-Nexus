"use client"

import { useAuth } from "@/components/auth-provider"
import { useRealtime } from "@/components/realtime-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Suspense, useState, useEffect } from "react"
import { redirect } from "next/navigation"
import { CuboidIcon as Cube, Settings, Play, RotateCcw, AlertTriangle } from "lucide-react"

// Temporary fallback component while we fix React Three Fiber compatibility
function DigitalTwinFallback({ selectedBag, sensorData }: any) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cube className="h-5 w-5 text-primary" />
          3D Greenhouse Visualization
        </CardTitle>
        <CardDescription>Interactive digital twin of your hydroponic system</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-16 w-16 mx-auto text-yellow-500" />
          <div>
            <h3 className="text-lg font-semibold">3D Visualization Temporarily Unavailable</h3>
            <p className="text-muted-foreground max-w-md">
              The 3D greenhouse view is being updated for compatibility. Please check back soon.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 max-w-md">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{selectedBag?.replace("grow-bag-", "")}</div>
              <div className="text-sm text-muted-foreground">Selected Grow Bag</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">6</div>
              <div className="text-sm text-muted-foreground">Total Grow Bags</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DigitalTwinPage() {
  const { user, isLoading } = useAuth()
  const { sensorData } = useRealtime()
  const { toast } = useToast()
  const [selectedBag, setSelectedBag] = useState("grow-bag-1")
  const [lightingLevel, setLightingLevel] = useState([75])
  const [nutrientDose, setNutrientDose] = useState([50])
  const [temperature, setTemperature] = useState([24])
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      redirect("/login")
    }
  }, [user, isLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading digital twin...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const handleGrowBagClick = (bagId: string) => {
    setSelectedBag(bagId)
    toast({
      title: "Grow Bag Selected",
      description: `Now viewing ${bagId.replace("grow-bag-", "Grow Bag ")}`,
    })
  }

  const applyScenario = async () => {
    setIsApplying(true)

    // Simulate applying changes
    await new Promise((resolve) => setTimeout(resolve, 2000))

    toast({
      title: "Scenario Applied",
      description: `Configuration updated for ${selectedBag.replace("grow-bag-", "Grow Bag ")}`,
    })

    setIsApplying(false)
  }

  const resetScenario = () => {
    setLightingLevel([75])
    setNutrientDose([50])
    setTemperature([24])

    toast({
      title: "Scenario Reset",
      description: "All parameters reset to default values",
    })
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Digital Twin</h1>
            <p className="text-muted-foreground">Interactive greenhouse simulation and scenario modeling</p>
          </div>
          <Badge variant="outline">
            <Cube className="h-3 w-3 mr-1" />
            Simulation Active
          </Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 3D Visualization Fallback */}
          <div className="lg:col-span-2">
            <DigitalTwinFallback selectedBag={selectedBag} sensorData={sensorData} />
          </div>

          {/* Scenario Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Scenario Simulation
                </CardTitle>
                <CardDescription>Adjust parameters to simulate different growing conditions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Grow Bag Selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selected Grow Bag</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.keys(sensorData).map((bagId) => (
                      <Button
                        key={bagId}
                        variant={selectedBag === bagId ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleGrowBagClick(bagId)}
                      >
                        {bagId.replace("grow-bag-", "")}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Lighting Level */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Lighting Level: {lightingLevel[0]}%</Label>
                  <Slider
                    value={lightingLevel}
                    onValueChange={setLightingLevel}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Adjust LED intensity for photosynthesis optimization</p>
                </div>

                {/* Nutrient Dose */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nutrient Dose: {nutrientDose[0]}%</Label>
                  <Slider
                    value={nutrientDose}
                    onValueChange={setNutrientDose}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Modify nutrient concentration in the solution</p>
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Target Temperature: {temperature[0]}°C</Label>
                  <Slider
                    value={temperature}
                    onValueChange={setTemperature}
                    max={30}
                    min={18}
                    step={0.5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Set optimal room temperature for plant growth</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={applyScenario}
                    disabled={isApplying}
                    className="flex-1"
                  >
                    {isApplying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Applying...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Apply Scenario
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetScenario}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Readings */}
            {sensorData[selectedBag] && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Live Readings</CardTitle>
                  <CardDescription>
                    Current sensor data for {selectedBag.replace("grow-bag-", "Grow Bag ")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">pH Level</span>
                      <div className="font-mono text-lg text-primary">{sensorData[selectedBag].pH.toFixed(1)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">EC</span>
                      <div className="font-mono text-lg text-primary">{sensorData[selectedBag].ec.toFixed(1)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Room Temp</span>
                      <div className="font-mono text-lg text-primary">
                        {sensorData[selectedBag].roomTemp.toFixed(1)}°C
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Moisture</span>
                      <div className="font-mono text-lg text-primary">{sensorData[selectedBag].moisture.toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Water Level</span>
                      <div className="font-mono text-lg text-primary">{sensorData[selectedBag].waterLevel}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Humidity</span>
                      <div className="font-mono text-lg text-primary">
                        {sensorData[selectedBag].humidity.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
    </div>
  )
}
