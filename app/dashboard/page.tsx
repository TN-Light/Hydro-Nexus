"use client"

import { useAuth } from "@/components/auth-provider"
import { useRealtime } from "@/components/realtime-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SensorCard } from "@/components/sensor-card"
import { QuickActions } from "@/components/quick-actions"
import { AlertPanel } from "@/components/alert-panel"
import { QubitButton } from "@/components/qubit-assistant"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  getTemperatureStatus, 
  getHumidityStatus, 
  getPHStatus, 
  getECStatus, 
  getMoistureStatus, 
  getWaterLevelStatus,
  getAMFSymbiosisStatus,
  calculateBioactiveIndex,
  getBioactiveIndexStatus,
  getPAWStressStatus,
} from "@/lib/parameter-utils"
import { QBM_CROPS } from "@/lib/crop-database"
import { Thermometer, Droplets, Zap, Activity, Wind, Beaker, FlaskConical, Waves, Award } from "lucide-react"
import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { usePersistedState } from "@/hooks/use-persisted-state"
import ErrorBoundary from "@/components/error-boundary"

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const { sensorData, isConnected, isRealData, alerts } = useRealtime()
  const { toast } = useToast()
  const [selectedGrowBag, setSelectedGrowBag] = usePersistedState("dash:selectedGrowBag", "grow-bag-1")
  const [historicalData, setHistoricalData] = useState<any>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [crops, setCrops] = useState<any[]>([])
  const [deviceCrops, setDeviceCrops] = useState<Record<string, any>>({})
  const [isChangingCrop, setIsChangingCrop] = useState(false)
  // QBM: manual phosphorus readings per bag (loaded from DB)
  const [manualPhosphorus, setManualPhosphorus] = useState<Record<string, number | null>>({})
  // QBM: accumulated GDD per bag (loaded from DB)
  const [accumulatedGDD, setAccumulatedGDD] = useState<Record<string, number>>({})
  // QBM: harvest dates per bag
  const [harvestDates, setHarvestDates] = useState<Record<string, Date | null>>({})

  // Load QBM grow-cycle data from DB for the selected bag
  useEffect(() => {
    if (!isAuthenticated || !selectedGrowBag) return
    fetch(`/api/grow-cycle?deviceId=${selectedGrowBag}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setManualPhosphorus(prev => ({ ...prev, [selectedGrowBag]: data.phosphorus_ppm ?? null }))
        setAccumulatedGDD(prev => ({ ...prev, [selectedGrowBag]: parseFloat(data.accumulated_gdd) || 0 }))
        setHarvestDates(prev => ({ ...prev, [selectedGrowBag]: data.harvest_date ? new Date(data.harvest_date) : null }))
      })
      .catch(() => { /* ignore — show defaults */ })
  }, [isAuthenticated, selectedGrowBag])
  const currentData = useMemo(() => sensorData[selectedGrowBag], [sensorData, selectedGrowBag])

  // Stabilize growBagIds via JSON key comparison so it doesn't re-trigger fetchDeviceCrops every poll cycle
  const growBagIdsKey = useMemo(() => JSON.stringify(Object.keys(sensorData).sort()), [sensorData])
  const growBagIds = useMemo(() => JSON.parse(growBagIdsKey) as string[], [growBagIdsKey])

  // Fetch available crops on mount
  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const response = await fetch('/api/crops')
        if (response.ok) {
          const result = await response.json()
          setCrops(result.crops || [])
        }
      } catch (error) {
        console.error('Failed to fetch crops:', error)
      }
    }

    if (isAuthenticated) {
      fetchCrops()
    }
  }, [isAuthenticated])

  // Fetch device crop assignments
  useEffect(() => {
    const fetchDeviceCrops = async () => {
      const cropData: Record<string, any> = {}
      
      for (const bagId of growBagIds) {
        try {
          const response = await fetch(`/api/devices/${bagId}/crop`)
          if (response.ok) {
            const result = await response.json()
            cropData[bagId] = result.device
          }
        } catch (error) {
          console.error(`Failed to fetch crop for ${bagId}:`, error)
        }
      }
      
      setDeviceCrops(cropData)
    }

    if (isAuthenticated && growBagIds.length > 0) {
      fetchDeviceCrops()
    }
  }, [isAuthenticated, growBagIds])

  // Handle crop change for a device
  const handleCropChange = async (deviceId: string, cropId: string) => {
    setIsChangingCrop(true)
    try {
      const response = await fetch(`/api/devices/${deviceId}/crop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropId })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update local state
        setDeviceCrops(prev => ({
          ...prev,
          [deviceId]: result.device
        }))

        toast({
          title: "Crop Updated",
          description: `Device ${deviceId} is now growing ${crops.find(c => c.id === cropId)?.name ?? cropId}`,
        })
      } else {
        throw new Error('Failed to update crop')
      }
    } catch (error) {
      console.error('Error updating crop:', error)
      toast({
        title: "Update Failed",
        description: "Could not update crop type. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsChangingCrop(false)
    }
  }

  // Fetch historical data when grow bag changes
  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!selectedGrowBag || !isAuthenticated) return
      
      setIsLoadingHistory(true)
      try {
        const response = await fetch(
          `/api/sensors/history?deviceId=${selectedGrowBag}&hours=24&interval=60`
        )
        if (response.ok) {
          const result = await response.json()
          setHistoricalData(result.data)
          console.log(`✅ Loaded ${result.dataPoints} historical points for ${selectedGrowBag}`)
        } else {
          console.warn('⚠️ Historical data API failed, will use fallback')
          setHistoricalData(null)
        }
      } catch (error) {
        console.error('❌ Failed to fetch historical data:', error)
        setHistoricalData(null)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    fetchHistoricalData()
  }, [selectedGrowBag, isAuthenticated])

  useEffect(() => {
    // Immediate redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      window.location.replace("/login")
      return
    }
  }, [isLoading, isAuthenticated])

  // Helper function to generate chart data - uses real data if available, fallback to mock
  const getChartData = (dataKey: 'roomTemp' | 'pH' | 'ec' | 'moisture' | 'humidity') => {
    // If we have historical data from API, use it
    if (historicalData && historicalData.length > 0) {
      return historicalData.map((point: any) => ({
        time: point.time,
        value: point[dataKey] || 0
      }))
    }

    // Fallback: Generate mock data with patterns (for demo when no ESP32 data)
    const mockPatterns: Record<typeof dataKey, { base: number, range: number, wave: number }> = {
      roomTemp: { base: 24, range: 6, wave: 3 },
      pH: { base: 6.0, range: 0.6, wave: 0.2 },
      ec: { base: 1.8, range: 0.6, wave: 0.3 },
      moisture: { base: 70, range: 20, wave: 10 },
      humidity: { base: 70, range: 20, wave: 10 }
    }

    const pattern = mockPatterns[dataKey]
    return Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
      value: pattern.base + Math.random() * pattern.range + Math.sin(i / 6) * pattern.wave,
    }))
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show redirect message (but don't render main content)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Real-time monitoring for {growBagIds.length} grow bags</p>
        </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isRealData ? (
              <Badge className="bg-green-600 hover:bg-green-700 text-white">
                🟢 ESP32 Connected — Live Data
              </Badge>
            ) : (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                🎭 Demo Mode — ESP32 Disconnected
              </Badge>
            )}
            <Badge variant="outline">
              Last update: {currentData ? new Date(currentData.timestamp).toLocaleTimeString() : "N/A"}
            </Badge>
          </div>
        </div>

        {/* Grow Bag Selector with Crop Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Grow Bag Selection & Crop Assignment
            </CardTitle>
            <CardDescription>Select a grow bag and assign crop type for optimal parameter tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Grow Bag Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {growBagIds.map((bagId) => (
                <Button
                  key={bagId}
                  variant={selectedGrowBag === bagId ? "default" : "outline"}
                  className="h-16 flex flex-col"
                  onClick={() => setSelectedGrowBag(bagId)}
                >
                  <span className="font-semibold">{bagId.replace("grow-bag-", "Bag ")}</span>
                  <span className="text-xs opacity-80">{sensorData[bagId] ? "Active" : "Offline"}</span>
                </Button>
              ))}
            </div>

            {/* Crop Selector for Selected Bag */}
            {selectedGrowBag && (
              <div className="border-t pt-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium text-muted-foreground">
                      Crop for {selectedGrowBag.replace("grow-bag-", "Bag ")}:
                    </span>
                    {deviceCrops[selectedGrowBag]?.cropName && (
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                        🌱 {deviceCrops[selectedGrowBag].cropName}
                      </Badge>
                    )}
                  </div>
                  <Select
                    value={deviceCrops[selectedGrowBag]?.cropId?.toString() || ""}
                    onValueChange={(value) => handleCropChange(selectedGrowBag, value)}
                    disabled={isChangingCrop}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Select crop type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {crops.map((crop) => (
                        <SelectItem key={crop.id} value={crop.id.toString()}>
                          {crop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {deviceCrops[selectedGrowBag]?.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    💡 {deviceCrops[selectedGrowBag].notes}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sensor Data Grid */}
        {currentData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SensorCard
              title="Room Temperature"
              value={currentData.roomTemp}
              unit="°C"
              icon={Thermometer}
              status={getTemperatureStatus(currentData.roomTemp, selectedGrowBag)}
              trend={"stable"}
              data={getChartData('roomTemp')}
            />

            <SensorCard
              title="pH Level"
              value={currentData.pH}
              unit=""
              icon={Beaker}
              status={getPHStatus(currentData.pH, selectedGrowBag)}
              trend={"stable"}
              data={getChartData('pH')}
            />

            <SensorCard
              title="Electrical Conductivity"
              value={currentData.ec}
              unit="mS/cm"
              icon={Zap}
              status={getECStatus(currentData.ec, selectedGrowBag)}
              trend={"stable"}
              data={getChartData('ec')}
            />

            <SensorCard
              title="Substrate Moisture"
              value={currentData.moisture}
              unit="%"
              icon={Droplets}
              status={getMoistureStatus(currentData.moisture)}
              trend={"stable"}
              data={getChartData('moisture')}
            />

            <SensorCard
              title="Water Level"
              value={currentData.waterLevel === "Below Required Level" ? 0 : 100}
              unit="%"
              icon={Activity}
              status={getWaterLevelStatus(currentData.waterLevel)}
              trend={"stable"}
              data={Array.from({ length: 24 }, (_, i) => ({
                time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
                value: Math.random() > 0.8 ? 0 : 1, // Water level is binary, keep mock for now
              }))}
            />

            <SensorCard
              title="Humidity"
              value={currentData.humidity}
              unit="%"
              icon={Wind}
              status={getHumidityStatus(currentData.humidity, selectedGrowBag)}
              trend={"stable"}
              data={getChartData('humidity')}
            />
          </div>
        )}

        {/* Quick Actions */}
        <QuickActions selectedGrowBag={selectedGrowBag} />

        {/* ═══════════════════════════════════════ */}
        {/* QBM Intelligence Panel                  */}
        {/* ═══════════════════════════════════════ */}
        {(() => {
          const cropInfo = deviceCrops[selectedGrowBag]
          const qbmCrop = QBM_CROPS.find(c => c.name === cropInfo?.cropName || c.id === cropInfo?.cropSlug)
          const phosphorusPpm = manualPhosphorus[selectedGrowBag] ?? null
          const amfStatus = getAMFSymbiosisStatus(phosphorusPpm)
          const gdd = accumulatedGDD[selectedGrowBag] ?? 0
          const gddTarget = qbmCrop?.gdd_profile?.target_gdd_max ?? 2200
          const gddMin = qbmCrop?.gdd_profile?.target_gdd_min ?? 1800
          const gddProgress = Math.min(100, Math.round((gdd / gddTarget) * 100))
          const harvestDate = harvestDates[selectedGrowBag] ?? null
          const daysUntilHarvest = harvestDate ? Math.round((harvestDate.getTime() - Date.now()) / 86400000) : null
          const pawStatus = getPAWStressStatus({ isActive: false, h2o2ConcentrationUm: null, applicationsThisWeek: 0, daysUntilHarvest })
          const bioactiveIndex = calculateBioactiveIndex({
            gddProgressPercent: gddProgress,
            pawApplicationsCount: 0,
            pawApplicationsTarget: 8,
            pCompliantDays: 0,
            totalCycleDays: 1,
          })
          const bioactiveType = qbmCrop?.bioactive_type === "capsaicin" ? "capsaicin" : "curcumin"
          const bioStatus = getBioactiveIndexStatus(bioactiveIndex, bioactiveType)

          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-emerald-600" />
                  QBM Intelligence — {selectedGrowBag.replace("grow-bag-", "Bag ")}
                  {qbmCrop && <Badge variant="outline" className="ml-2 text-xs">{qbmCrop.name}</Badge>}
                </CardTitle>
                <CardDescription>AMF symbiosis · PAW protocol · Bioactive accumulation index</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                  {/* AMF Status */}
                  <div className={`p-4 rounded border ${
                    amfStatus.color === "green" ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30"
                    : amfStatus.color === "yellow" ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30"
                    : amfStatus.color === "red" ? "border-red-200 bg-red-50 dark:bg-red-950/30"
                    : amfStatus.color === "orange" ? "border-orange-200 bg-orange-50 dark:bg-orange-950/30"
                    : "border-gray-200 bg-gray-50 dark:bg-gray-800/30"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <FlaskConical className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wide">AMF Symbiosis</span>
                    </div>
                    <div className="font-bold text-sm">{amfStatus.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{amfStatus.description}</div>
                    {phosphorusPpm === null && (
                      <div className="text-xs text-muted-foreground mt-2 italic">
                        Log P reading in Settings → AMF / P tab
                      </div>
                    )}
                  </div>

                  {/* PAW Protocol */}
                  <div className={`p-4 rounded border ${
                    pawStatus.color === "green" ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30"
                    : pawStatus.color === "yellow" ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30"
                    : "border-gray-200 bg-gray-50 dark:bg-gray-800/30"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Waves className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wide">PAW Protocol</span>
                    </div>
                    <div className="font-bold text-sm">{pawStatus.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{pawStatus.description}</div>
                    {daysUntilHarvest === null && (
                      <div className="text-xs text-muted-foreground mt-2 italic">
                        Set harvest date in Settings → PAW Protocol
                      </div>
                    )}
                  </div>

                  {/* Bioactive Index */}
                  <div className={`p-4 rounded border ${
                    bioStatus.color === "green" ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30"
                    : bioStatus.color === "orange" ? "border-orange-200 bg-orange-50 dark:bg-orange-950/30"
                    : bioStatus.color === "yellow" ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30"
                    : "border-gray-200 bg-gray-50 dark:bg-gray-800/30"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wide">Bioactive Index</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="font-bold text-2xl">{bioactiveIndex}</span>
                      <span className="text-xs text-muted-foreground mb-1">/ 100</span>
                    </div>
                    <div className="font-medium text-sm">{bioStatus.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">Est. {bioStatus.estimate}</div>
                    {/* Progress bar */}
                    <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${bioactiveIndex}%` }} />
                    </div>
                  </div>

                </div>

                {/* GDD Progress */}
                <div className="mt-4 p-3 rounded border border-border bg-muted/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide">GDD Progress</span>
                    <span className="text-xs text-muted-foreground">
                      {gdd.toFixed(0)} / {gddMin}–{gddTarget} °C·days
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-2 rounded-full transition-all ${gddProgress >= 100 ? "bg-green-500" : gddProgress > 70 ? "bg-yellow-500" : "bg-blue-500"}`}
                      style={{ width: `${gddProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {gddProgress}% · {gdd >= gddMin ? "HARVEST WINDOW" : `${(gddMin - gdd).toFixed(0)} GDD until harvest window`}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Alerts Panel */}
        <AlertPanel alerts={alerts.slice(0, 10)} />

        {/* Qubit AI Voice Assistant - Floating Button */}
        <QubitButton />
      </div>
  )
}
