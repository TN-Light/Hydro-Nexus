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
  getWaterLevelStatus 
} from "@/lib/parameter-utils"
import { Thermometer, Droplets, Zap, Activity, Wind, Beaker } from "lucide-react"
import { useEffect, useState, useMemo, memo, Suspense } from "react"
import { redirect } from "next/navigation"
import ErrorBoundary from "@/components/error-boundary"

// Memoized components to prevent unnecessary re-renders
const MemoizedSensorCard = memo(SensorCard)
const MemoizedQuickActions = memo(QuickActions)
const MemoizedAlertPanel = memo(AlertPanel)

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const { sensorData, isConnected, isRealData, alerts } = useRealtime()
  const { toast } = useToast()
  const [selectedGrowBag, setSelectedGrowBag] = useState("grow-bag-1")
  const [historicalData, setHistoricalData] = useState<any>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [crops, setCrops] = useState<any[]>([])
  const [deviceCrops, setDeviceCrops] = useState<Record<string, any>>({})
  const [isChangingCrop, setIsChangingCrop] = useState(false)

  // Memoize expensive calculations
  const currentData = useMemo(() => sensorData[selectedGrowBag], [sensorData, selectedGrowBag])
  const growBagIds = useMemo(() => Object.keys(sensorData), [sensorData])

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
  const handleCropChange = async (deviceId: string, cropId: number) => {
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
          description: `Device ${deviceId} is now growing ${crops.find(c => c.id === cropId)?.name}`,
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
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </Badge>
            <Badge 
              variant={isRealData ? "default" : "secondary"}
              className={isRealData ? "bg-green-600 hover:bg-green-700" : "bg-amber-500 hover:bg-amber-600"}
            >
              {isRealData ? "📡 Live ESP32 Data" : "🎭 Demo Mode"}
            </Badge>
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
                    onValueChange={(value) => handleCropChange(selectedGrowBag, parseInt(value))}
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
              trend={Math.random() > 0.5 ? "up" : "down"}
              data={getChartData('roomTemp')}
            />

            <SensorCard
              title="pH Level"
              value={currentData.pH}
              unit=""
              icon={Beaker}
              status={getPHStatus(currentData.pH, selectedGrowBag)}
              trend={Math.random() > 0.5 ? "up" : "down"}
              data={getChartData('pH')}
            />

            <SensorCard
              title="Electrical Conductivity"
              value={currentData.ec}
              unit="mS/cm"
              icon={Zap}
              status={getECStatus(currentData.ec, selectedGrowBag)}
              trend={Math.random() > 0.5 ? "up" : "down"}
              data={getChartData('ec')}
            />

            <SensorCard
              title="Substrate Moisture"
              value={currentData.moisture}
              unit="%"
              icon={Droplets}
              status={getMoistureStatus(currentData.moisture)}
              trend={Math.random() > 0.5 ? "up" : "down"}
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
              trend={Math.random() > 0.5 ? "up" : "down"}
              data={getChartData('humidity')}
            />
          </div>
        )}

        {/* Quick Actions */}
        <QuickActions selectedGrowBag={selectedGrowBag} />

        {/* Alerts Panel */}
        <AlertPanel alerts={alerts.slice(0, 10)} />

        {/* Qubit AI Voice Assistant - Floating Button */}
        <QubitButton />
      </div>
  )
}
