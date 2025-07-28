"use client"

import { useAuth } from "@/components/auth-provider"
import { useRealtime } from "@/components/realtime-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, Html } from "@react-three/drei"
import { Suspense, useState, useRef, useEffect } from "react"
import { redirect } from "next/navigation"
import { CuboidIcon as Cube, Settings, Play, RotateCcw } from "lucide-react"
import type * as THREE from "three"

// 3D Greenhouse Component
function GreenhouseScene({ onGrowBagClick, selectedBag, sensorData }: any) {
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005
    }
  })

  return (
    <group ref={groupRef}>
      {/* Greenhouse Structure */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[12, 4, 8]} />
        <meshStandardMaterial color="#e8f5e8" transparent opacity={0.3} />
      </mesh>

      {/* Floor */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#8b7355" />
      </mesh>

      {/* Grow Bags */}
      {Array.from({ length: 6 }, (_, i) => {
        const bagId = `grow-bag-${i + 1}`
        const x = (i % 3) * 3 - 3
        const z = Math.floor(i / 3) * 2 - 1
        const isSelected = selectedBag === bagId
        const data = sensorData[bagId]

        return (
          <group key={bagId} position={[x, 0.5, z]}>
            {/* Grow Bag */}
            <mesh
              onClick={() => onGrowBagClick(bagId)}
              onPointerOver={(e) => {
                e.object.material.color.setHex(0x22c55e)
                document.body.style.cursor = "pointer"
              }}
              onPointerOut={(e) => {
                e.object.material.color.setHex(isSelected ? 0x15803d : 0x16a34a)
                document.body.style.cursor = "default"
              }}
            >
              <cylinderGeometry args={[0.8, 0.8, 1, 8]} />
              <meshStandardMaterial color={isSelected ? "#15803d" : "#16a34a"} />
            </mesh>

            {/* Plant */}
            <mesh position={[0, 1, 0]}>
              <coneGeometry args={[0.3, 0.8, 8]} />
              <meshStandardMaterial color="#22c55e" />
            </mesh>

            {/* Info Panel */}
            {isSelected && data && (
              <Html position={[0, 2, 0]} center>
                <div className="bg-white p-3 rounded-lg shadow-lg border border-green-200 min-w-48">
                  <h3 className="font-semibold text-sm mb-2 text-soil-950">
                    {bagId.replace("grow-bag-", "Grow Bag ")}
                  </h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>pH:</span>
                      <span className="font-mono">{data.pH.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>EC:</span>
                      <span className="font-mono">{data.ec.toFixed(1)} mS/cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Temp:</span>
                      <span className="font-mono">{data.waterTemp.toFixed(1)}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DO:</span>
                      <span className="font-mono">{data.do.toFixed(1)} mg/L</span>
                    </div>
                  </div>
                </div>
              </Html>
            )}
          </group>
        )
      })}

      {/* Lighting System */}
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[10, 0.2, 6]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
      </mesh>
    </group>
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
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-soil-950/70">Loading digital twin...</p>
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
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-soil-950">Digital Twin</h1>
            <p className="text-soil-950/70">Interactive 3D greenhouse simulation and scenario modeling</p>
          </div>
          <Badge variant="outline" className="border-green-200">
            <Cube className="h-3 w-3 mr-1" />
            3D Visualization Active
          </Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 3D Visualization */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Greenhouse Overview</CardTitle>
                <CardDescription>Click on any grow bag to view detailed sensor information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 w-full bg-gradient-to-b from-sky-200 to-green-100 rounded-lg overflow-hidden">
                  <Canvas camera={{ position: [8, 6, 8], fov: 60 }}>
                    <Suspense fallback={null}>
                      <ambientLight intensity={0.4} />
                      <directionalLight position={[10, 10, 5]} intensity={1} />
                      <GreenhouseScene
                        onGrowBagClick={handleGrowBagClick}
                        selectedBag={selectedBag}
                        sensorData={sensorData}
                      />
                      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
                      <Environment preset="park" />
                    </Suspense>
                  </Canvas>
                </div>

                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Selected:</strong> {selectedBag.replace("grow-bag-", "Grow Bag ")}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Use mouse to rotate, zoom, and pan around the greenhouse. Click on grow bags for details.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scenario Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-green-700" />
                  Scenario Simulation
                </CardTitle>
                <CardDescription>Adjust parameters to simulate different growing conditions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  <p className="text-xs text-soil-950/70">Adjust LED intensity for photosynthesis optimization</p>
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
                  <p className="text-xs text-soil-950/70">Modify nutrient concentration in the solution</p>
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
                  <p className="text-xs text-soil-950/70">Set optimal water temperature for root health</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={applyScenario}
                    disabled={isApplying}
                    className="flex-1 agriculture-gradient text-white hover:opacity-90"
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
                    className="border-green-200 hover:border-green-400 bg-transparent"
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
                      <span className="text-soil-950/70">pH Level</span>
                      <div className="font-mono text-lg text-green-700">{sensorData[selectedBag].pH.toFixed(1)}</div>
                    </div>
                    <div>
                      <span className="text-soil-950/70">EC</span>
                      <div className="font-mono text-lg text-green-700">{sensorData[selectedBag].ec.toFixed(1)}</div>
                    </div>
                    <div>
                      <span className="text-soil-950/70">Temperature</span>
                      <div className="font-mono text-lg text-green-700">
                        {sensorData[selectedBag].waterTemp.toFixed(1)}°C
                      </div>
                    </div>
                    <div>
                      <span className="text-soil-950/70">Dissolved O₂</span>
                      <div className="font-mono text-lg text-green-700">{sensorData[selectedBag].do.toFixed(1)}</div>
                    </div>
                    <div>
                      <span className="text-soil-950/70">ORP</span>
                      <div className="font-mono text-lg text-green-700">{sensorData[selectedBag].orp.toFixed(0)}mV</div>
                    </div>
                    <div>
                      <span className="text-soil-950/70">Humidity</span>
                      <div className="font-mono text-lg text-green-700">
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
    </DashboardLayout>
  )
}
