"use client"

import { useAuth } from "@/components/auth-provider"
import { useRealtime } from "@/components/realtime-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SensorCard } from "@/components/sensor-card"
import { QuickActions } from "@/components/quick-actions"
import { AlertPanel } from "@/components/alert-panel"
import { Thermometer, Droplets, Zap, Activity, Wind, Beaker } from "lucide-react"
import { useEffect, useState } from "react"
import { redirect } from "next/navigation"

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const { sensorData, isConnected, alerts } = useRealtime()
  const [selectedGrowBag, setSelectedGrowBag] = useState("grow-bag-1")

  useEffect(() => {
    // Immediate redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      window.location.replace("/login")
      return
    }
  }, [isLoading, isAuthenticated])

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const currentData = sensorData[selectedGrowBag]
  const growBagIds = Object.keys(sensorData)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Real-time monitoring for {growBagIds.length} grow bags</p>
        </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </Badge>
            <Badge variant="outline">
              Last update: {currentData ? new Date(currentData.timestamp).toLocaleTimeString() : "N/A"}
            </Badge>
          </div>
        </div>

        {/* Grow Bag Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
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
                  className="h-16 flex flex-col"
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
        {currentData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SensorCard
              title="Room Temperature"
              value={currentData.roomTemp}
              unit="°C"
              icon={Thermometer}
              status={currentData.roomTemp >= 22 && currentData.roomTemp <= 28 ? "good" : "warning"}
              trend={Math.random() > 0.5 ? "up" : "down"}
              data={Array.from({ length: 24 }, (_, i) => ({
                time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
                value: 24 + Math.random() * 6 + Math.sin(i / 4) * 3,
              }))}
            />

            <SensorCard
              title="pH Level"
              value={currentData.pH}
              unit=""
              icon={Beaker}
              status={currentData.pH >= 5.5 && currentData.pH <= 6.5 ? "good" : "alert"}
              trend={Math.random() > 0.5 ? "up" : "down"}
              data={Array.from({ length: 24 }, (_, i) => ({
                time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
                value: 6.0 + Math.random() * 0.6 + Math.sin(i / 6) * 0.2,
              }))}
            />

            <SensorCard
              title="Electrical Conductivity"
              value={currentData.ec}
              unit="mS/cm"
              icon={Zap}
              status={currentData.ec >= 1.2 && currentData.ec <= 2.5 ? "good" : "warning"}
              trend={Math.random() > 0.5 ? "up" : "down"}
              data={Array.from({ length: 24 }, (_, i) => ({
                time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
                value: 1.8 + Math.random() * 0.6 + Math.sin(i / 8) * 0.3,
              }))}
            />

            <SensorCard
              title="Substrate Moisture"
              value={currentData.moisture}
              unit="%"
              icon={Droplets}
              status={currentData.moisture >= 60 ? "good" : "warning"}
              trend={Math.random() > 0.5 ? "up" : "down"}
              data={Array.from({ length: 24 }, (_, i) => ({
                time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
                value: 70 + Math.random() * 20 + Math.sin(i / 5) * 10,
              }))}
            />

            <SensorCard
              title="Water Level"
              value={currentData.waterLevel === "Below Required Level" ? 0 : 100}
              unit="%"
              icon={Activity}
              status={currentData.waterLevel === "Below Required Level" ? "alert" : "good"}
              trend={"stable"}
              data={Array.from({ length: 24 }, (_, i) => ({
                time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
                value: Math.random() > 0.8 ? 0 : 1, // 0 for low, 1 for ok
              }))}
            />

            <SensorCard
              title="Humidity"
              value={currentData.humidity}
              unit="%"
              icon={Wind}
              status={currentData.humidity <= 85 ? "good" : "warning"}
              trend={Math.random() > 0.5 ? "up" : "down"}
              data={Array.from({ length: 24 }, (_, i) => ({
                time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
                value: 70 + Math.random() * 20 + Math.sin(i / 3) * 10,
              }))}
            />
          </div>
        )}

        {/* Quick Actions */}
        <QuickActions selectedGrowBag={selectedGrowBag} />

        {/* Alerts Panel */}
        <AlertPanel alerts={alerts.slice(0, 10)} />
      </div>
  )
}
