"use client"

import { useAuth } from "@/components/auth-provider"
import { useRealtime } from "@/components/realtime-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { usePersistedState } from "@/hooks/use-persisted-state"
import { useState, useEffect, useMemo } from "react"
import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import {
  CuboidIcon as Cube,
  Eye,
  Droplets,
  Sun,
  FlaskConical,
  Leaf,
  Thermometer,
  Zap,
  Wifi,
  WifiOff,
} from "lucide-react"

// Dynamic import of Three.js canvas (no SSR)
const DigitalTwinCanvas = dynamic(
  () => import("@/components/digital-twin-3d"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-[#0a0a1a] rounded-lg">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto" />
          <p className="text-cyan-400 text-sm">Loading 3D Scene…</p>
        </div>
      </div>
    ),
  }
)

export default function DigitalTwinPage() {
  const { user, isLoading } = useAuth()
  const { sensorData, isConnected } = useRealtime()
  const { toast } = useToast()

  const [selectedBag, setSelectedBag] = usePersistedState("dt:selectedBag", "grow-bag-1")
  const [lightingLevel, setLightingLevel] = usePersistedState("dt:lightingLevel", 75)
  const [showFungalNetwork, setShowFungalNetwork] = usePersistedState("dt:showFungalNetwork", true)
  const [showWaterFlow, setShowWaterFlow] = usePersistedState("dt:showWaterFlow", true)
  const [pawActive, setPawActive] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) redirect("/login")
  }, [user, isLoading])

  // Build sensor value objects for the 3D scene
  const bag1Data = useMemo(() => {
    const d = sensorData["grow-bag-1"]
    return {
      pH: d?.pH ?? 6.0,
      ec: d?.ec ?? 1.8,
      moisture: d?.moisture ?? d?.substrate_moisture ?? 55,
      temperature: d?.temperature ?? d?.roomTemp ?? 26,
      humidity: d?.humidity ?? 65,
      nutrientPumpOn: d?.nutrient_pump_status ?? false,
      pawPumpOn: d?.paw_pump_status ?? pawActive,
    }
  }, [sensorData, pawActive])

  const bag6Data = useMemo(() => {
    const d = sensorData["grow-bag-6"]
    return {
      pH: d?.pH ?? 6.2,
      ec: d?.ec ?? 1.6,
      moisture: d?.moisture ?? d?.substrate_moisture ?? 48,
      temperature: d?.temperature ?? d?.roomTemp ?? 25,
      humidity: d?.humidity ?? 62,
      nutrientPumpOn: d?.nutrient_pump_status ?? false,
      pawPumpOn: d?.paw_pump_status ?? false,
    }
  }, [sensorData])

  // Current bag's data for the sidebar
  const selectedData = useMemo(() => {
    return sensorData[selectedBag] ?? null
  }, [sensorData, selectedBag])

  const handleBagClick = (bagId: string) => {
    setSelectedBag(bagId)
    const n = parseInt(bagId.replace("grow-bag-", ""))
    const row = n <= 6 ? "Front" : n <= 12 ? "Middle" : "Back"
    toast({
      title: "Grow Bag Selected",
      description: `Bag ${n} (${row} Row)` +
        (bagId === "grow-bag-1" ? " — Inlet, has sensor" :
         bagId === "grow-bag-6" ? " — has sensor" :
         " — connected via CMN"),
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    )
  }
  if (!user) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Cube className="h-8 w-8 text-cyan-500" />
            Digital Twin
          </h1>
          <p className="text-muted-foreground">
            Interactive 3D model of your QBM-HydroNet grow system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={isConnected ? "border-green-500 text-green-500" : "border-red-500 text-red-500"}
          >
            {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isConnected ? "Live Data" : "Offline"}
          </Badge>
          <Badge variant="outline" className="border-cyan-500 text-cyan-500">
            <Cube className="h-3 w-3 mr-1" />
            18 Bags — {selectedBag.replace("grow-bag-", "Bag ")} selected
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {/* 3D Canvas — takes 3 out of 4 columns */}
        <div className="lg:col-span-3 h-[600px] rounded-lg overflow-hidden border border-border/50 shadow-lg">
          <DigitalTwinCanvas
            bag1Data={bag1Data}
            bag6Data={bag6Data}
            selectedBag={selectedBag}
            onBagClick={handleBagClick}
            lightingLevel={lightingLevel}
            showFungalNetwork={showFungalNetwork}
            showWaterFlow={showWaterFlow}
            pawActive={pawActive}
          />
        </div>

        {/* Right sidebar — controls & readings */}
        <div className="space-y-4">
          {/* Visualization Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-cyan-500" />
                Visualization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Grow Bag Selector */}
              <div className="space-y-2">
                <Label className="text-xs">Selected Bag</Label>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground mb-1">Front Row</p>
                  <div className="grid grid-cols-6 gap-1">
                    {[1, 2, 3, 4, 5, 6].map((n) => {
                      const id = `grow-bag-${n}`
                      const hasSensor = n === 1 || n === 6
                      return (
                        <Button
                          key={n}
                          variant={selectedBag === id ? "default" : "outline"}
                          size="sm"
                          className={`text-xs px-0 ${hasSensor ? "ring-1 ring-cyan-500/50" : ""}`}
                          onClick={() => handleBagClick(id)}
                        >
                          {n}
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-1">Middle Row</p>
                  <div className="grid grid-cols-6 gap-1">
                    {[7, 8, 9, 10, 11, 12].map((n) => {
                      const id = `grow-bag-${n}`
                      return (
                        <Button
                          key={n}
                          variant={selectedBag === id ? "default" : "outline"}
                          size="sm"
                          className="text-xs px-0"
                          onClick={() => handleBagClick(id)}
                        >
                          {n}
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-1">Back Row</p>
                  <div className="grid grid-cols-6 gap-1">
                    {[13, 14, 15, 16, 17, 18].map((n) => {
                      const id = `grow-bag-${n}`
                      return (
                        <Button
                          key={n}
                          variant={selectedBag === id ? "default" : "outline"}
                          size="sm"
                          className="text-xs px-0"
                          onClick={() => handleBagClick(id)}
                        >
                          {n}
                        </Button>
                      )
                    })}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Bags 1 & 6 have ESP32 sensors (ringed). 18 bags in serpentine layout.
                </p>
              </div>

              <Separator />

              {/* LED Intensity */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Sun className="h-3 w-3 text-amber-500" />
                  LED Intensity: {lightingLevel}%
                </Label>
                <Slider
                  value={[lightingLevel]}
                  onValueChange={([v]) => setLightingLevel(v)}
                  max={100}
                  min={0}
                  step={5}
                />
              </div>

              <Separator />

              {/* Toggle layers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fungal-toggle" className="text-xs flex items-center gap-1 cursor-pointer">
                    <Leaf className="h-3 w-3 text-purple-500" />
                    Fungal Network
                  </Label>
                  <Switch
                    id="fungal-toggle"
                    checked={showFungalNetwork}
                    onCheckedChange={setShowFungalNetwork}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="flow-toggle" className="text-xs flex items-center gap-1 cursor-pointer">
                    <Droplets className="h-3 w-3 text-blue-500" />
                    Water Flow
                  </Label>
                  <Switch
                    id="flow-toggle"
                    checked={showWaterFlow}
                    onCheckedChange={setShowWaterFlow}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="paw-toggle" className="text-xs flex items-center gap-1 cursor-pointer">
                    <FlaskConical className="h-3 w-3 text-purple-500" />
                    PAW Simulation
                  </Label>
                  <Switch
                    id="paw-toggle"
                    checked={pawActive}
                    onCheckedChange={setPawActive}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Readings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" />
                {selectedBag.replace("grow-bag-", "Bag ")} Readings
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedBag === "grow-bag-1" || selectedBag === "grow-bag-6"
                  ? "Live from ESP32"
                  : "No direct sensor — inferred via network"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedData ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <FlaskConical className="h-3 w-3 mx-auto text-green-500 mb-0.5" />
                    <div className="font-mono text-sm font-bold">{selectedData.pH.toFixed(1)}</div>
                    <div className="text-muted-foreground">pH</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <Zap className="h-3 w-3 mx-auto text-yellow-500 mb-0.5" />
                    <div className="font-mono text-sm font-bold">{selectedData.ec.toFixed(2)}</div>
                    <div className="text-muted-foreground">EC</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <Thermometer className="h-3 w-3 mx-auto text-orange-500 mb-0.5" />
                    <div className="font-mono text-sm font-bold">{selectedData.roomTemp.toFixed(1)}°C</div>
                    <div className="text-muted-foreground">Temp</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <Droplets className="h-3 w-3 mx-auto text-blue-500 mb-0.5" />
                    <div className="font-mono text-sm font-bold">{selectedData.humidity.toFixed(0)}%</div>
                    <div className="text-muted-foreground">Humidity</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2 text-center col-span-2">
                    <Droplets className="h-3 w-3 mx-auto text-cyan-500 mb-0.5" />
                    <div className="font-mono text-sm font-bold">{selectedData.moisture.toFixed(0)}%</div>
                    <div className="text-muted-foreground">Substrate Moisture</div>
                  </div>

                  {/* Pump status */}
                  {(selectedBag === "grow-bag-1" || selectedBag === "grow-bag-6") && (
                    <>
                      <div className="col-span-2 flex items-center justify-between mt-1">
                        <span className="flex items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full ${selectedData.nutrient_pump_status ? "bg-green-500 animate-pulse" : "bg-red-500/40"}`} />
                          <span className="text-muted-foreground">Nutrition Pump</span>
                        </span>
                        <Badge variant={selectedData.nutrient_pump_status ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                          {selectedData.nutrient_pump_status ? "ON" : "OFF"}
                        </Badge>
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full ${selectedData.paw_pump_status ? "bg-purple-500 animate-pulse" : "bg-red-500/40"}`} />
                          <span className="text-muted-foreground">PAW Pump</span>
                        </span>
                        <Badge variant={selectedData.paw_pump_status ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                          {selectedData.paw_pump_status ? "ON" : "OFF"}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">
                    {selectedBag === "grow-bag-1" || selectedBag === "grow-bag-6"
                      ? "ESP32 not reporting — check connection"
                      : "This bag has no direct sensor. Readings are estimated from Bag 1 & 6."
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-[10px]">
              <div className="flex items-center gap-2">
                <div className="h-2 w-4 rounded bg-[#a855f7]" />
                <span>AMF Fungal Network (hyphae)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-4 rounded bg-[#c4b896]" />
                <span>CMN Cartridges (50µm mesh)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-4 rounded bg-[#22c55e]" />
                <span>Nutrition Pump (P19)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-4 rounded bg-[#8b5cf6]" />
                <span>PAW Pump (P22)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded bg-[#ff4444]" />
                <div className="h-2 w-2 rounded bg-[#4444ff]" />
                <span>LED Array (R:660nm / B:450nm)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-4 rounded bg-cyan-500" />
                <span>ESP32 Sensor Probe</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
