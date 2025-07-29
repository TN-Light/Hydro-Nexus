"use client"

import { useAuth } from "@/components/auth-provider"
import { useRealtime } from "@/components/realtime-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SensorCard } from "@/components/sensor-card"
import { QuickActions } from "@/components/quick-actions"
import { AlertPanel } from "@/components/alert-panel"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Thermometer, Droplets, Zap, Activity, Wind, Beaker } from "lucide-react"
import { useEffect, useState } from "react"
import { redirect } from "next/navigation"

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const { sensorData, isConnected, alerts } = useRealtime()
  const [selectedGrowBag, setSelectedGrowBag] = useState("grow-bag-1")
  const [sensorChartData, setSensorChartData] = useState<Record<string, Array<{ time: string; value: number }>>>({})
  const [sensorTrends, setSensorTrends] = useState<Record<string, "up" | "down">>({})
  const [isDataReady, setIsDataReady] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      redirect("/login")
    }
  }, [user, isLoading])

  // Generate chart data and trends on client side only
  useEffect(() => {
    const chartData: Record<string, Array<{ time: string; value: number }>> = {}
    const trends: Record<string, "up" | "down"> = {}
    
    const sensors = ["waterTemp", "pH", "ec", "orp", "do", "humidity"]
    
    sensors.forEach(sensor => {
      chartData[sensor] = Array.from({ length: 24 }, (_, i) => {
        let baseValue: number
        let variation: number
        
        switch (sensor) {
          case "waterTemp":
            baseValue = 22
            variation = 4
            break
          case "pH":
            baseValue = 6.0
            variation = 0.6
            break
          case "ec":
            baseValue = 1.8
            variation = 0.6
            break
          case "orp":
            baseValue = 250
            variation = 100
            break
          case "do":
            baseValue = 6
            variation = 2
            break
          case "humidity":
            baseValue = 70
            variation = 20
            break
          default:
            baseValue = 0
            variation = 1
        }
        
        return {
          time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
          value: baseValue + Math.random() * variation + Math.sin(i / 4) * (variation / 2),
        }
      })
      
      trends[sensor] = Math.random() > 0.5 ? "up" : "down"
    })
    
    setSensorChartData(chartData)
    setSensorTrends(trends)
    setIsDataReady(true)
  }, [])
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-soil-950/70">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const currentData = sensorData[selectedGrowBag]
  const growBagIds = Object.keys(sensorData)

  const handleDownload = () => {
    const data = sensorData[selectedGrowBag]
    if (!data) return

    const headers = Object.keys(data)
    const values = Object.values(data)
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + values.join(",")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${selectedGrowBag}_data.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-soil-950 dark:text-white">Dashboard</h1>
            <p className="text-soil-950/70 dark:text-gray-300">Real-time monitoring for {growBagIds.length} grow bags</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleDownload}>Download</Button>
            <Badge variant={isConnected ? "default" : "destructive"} className="bg-green-100 text-green-700">
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </Badge>
            <Badge variant="outline" className="border-green-200">
              Last update: {currentData ? new Date(currentData.timestamp).toLocaleTimeString() : "N/A"}
            </Badge>
          </div>
        </div>

        {/* Grow Bag Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-700" />
              Grow Bag Selection
            </CardTitle>
            <CardDescription>Select a grow bag to view detailed sensor data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {growBagIds.map((bagId) => (
                <Button
                  key={bagId}
                  variant={selectedGrowBag === bagId ? "default" : "outline"}
                  className={`h-16 flex flex-col ${
                    selectedGrowBag === bagId
                      ? "agriculture-gradient text-white"
                      : "border-green-200 hover:border-green-400"
                  }`}
                  onClick={() => setSelectedGrowBag(bagId)}
                >
                  <span className="font-semibold">{bagId.replace("grow-bag-", "Bag ")}</span>
                  <span className="text-xs opacity-80">{sensorData[bagId] ? "Active" : "Offline"}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sensor Data Grid */}
        {currentData && isDataReady && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SensorCard
              title="Water Temperature"
              value={currentData.waterTemp}
              unit="°C"
              icon={Thermometer}
              status={currentData.waterTemp >= 20 && currentData.waterTemp <= 28 ? "good" : "warning"}
              trend={sensorTrends.waterTemp || "up"}
              data={sensorChartData.waterTemp || []}
            />

            <SensorCard
              title="pH Level"
              value={currentData.pH}
              unit=""
              icon={Beaker}
              status={currentData.pH >= 5.5 && currentData.pH <= 6.5 ? "good" : "alert"}
              trend={sensorTrends.pH || "up"}
              data={sensorChartData.pH || []}
            />

            <SensorCard
              title="Electrical Conductivity"
              value={currentData.ec}
              unit="mS/cm"
              icon={Zap}
              status={currentData.ec >= 1.2 && currentData.ec <= 2.5 ? "good" : "warning"}
              trend={sensorTrends.ec || "up"}
              data={sensorChartData.ec || []}
            />

            <SensorCard
              title="ORP"
              value={currentData.orp}
              unit="mV"
              icon={Activity}
              status={currentData.orp >= 200 ? "good" : "warning"}
              trend={sensorTrends.orp || "up"}
              data={sensorChartData.orp || []}
            />

            <SensorCard
              title="Dissolved Oxygen"
              value={currentData.do}
              unit="mg/L"
              icon={Droplets}
              status={currentData.do >= 4.0 ? "good" : "alert"}
              trend={sensorTrends.do || "up"}
              data={sensorChartData.do || []}
            />

            <SensorCard
              title="Humidity"
              value={currentData.humidity}
              unit="%"
              icon={Wind}
              status={currentData.humidity <= 85 ? "good" : "warning"}
              trend={sensorTrends.humidity || "up"}
              data={sensorChartData.humidity || []}
            />
          </div>
        )}

        {/* Loading state for sensor data */}
        {currentData && !isDataReady && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <QuickActions selectedGrowBag={selectedGrowBag} />

        {/* Alerts Panel */}
        <AlertPanel alerts={alerts.slice(0, 5)} />
      </div>
    </DashboardLayout>
  )
}
