"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"

interface SensorData {
  deviceId: string
  timestamp: string
  waterTemp: number
  pH: number
  ec: number
  orp: number
  do: number
  humidity: number
}

interface RealtimeContextType {
  sensorData: Record<string, SensorData>
  isConnected: boolean
  alerts: Array<{
    id: string
    deviceId: string
    message: string
    severity: "info" | "warning" | "error"
    timestamp: string
  }>
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [sensorData, setSensorData] = useState<Record<string, SensorData>>({})
  const [isConnected, setIsConnected] = useState(false)
  const [alerts, setAlerts] = useState<RealtimeContextType["alerts"]>([])
  const { toast } = useToast()

  useEffect(() => {
    // Simulate WebSocket connection
    setIsConnected(true)

    // Generate initial mock data for 6 grow bags
    const initialData: Record<string, SensorData> = {}
    for (let i = 1; i <= 6; i++) {
      initialData[`grow-bag-${i}`] = generateMockSensorData(`grow-bag-${i}`)
    }
    setSensorData(initialData)

    // Simulate real-time updates every 3 seconds
    const interval = setInterval(() => {
      setSensorData((prev) => {
        const updated = { ...prev }
        Object.keys(updated).forEach((deviceId) => {
          updated[deviceId] = generateMockSensorData(deviceId)

          // Check for alerts
          const data = updated[deviceId]
          checkForAlerts(data)
        })
        return updated
      })
    }, 3000)

    return () => {
      clearInterval(interval)
      setIsConnected(false)
    }
  }, [checkForAlerts])

  const generateMockSensorData = (deviceId: string): SensorData => {
    const baseValues = {
      waterTemp: 22 + Math.random() * 4, // 22-26°C
      pH: 5.8 + Math.random() * 0.8, // 5.8-6.6
      ec: 1.8 + Math.random() * 0.6, // 1.8-2.4
      orp: 250 + Math.random() * 100, // 250-350 mV
      do: 6 + Math.random() * 2, // 6-8 mg/L
      humidity: 65 + Math.random() * 20, // 65-85%
    }

    // Add some diurnal variation
    const hour = new Date().getHours()
    const dayFactor = Math.sin((hour / 24) * 2 * Math.PI)

    return {
      deviceId,
      timestamp: new Date().toISOString(),
      waterTemp: baseValues.waterTemp + dayFactor * 2,
      pH: Math.max(5.0, Math.min(7.0, baseValues.pH + dayFactor * 0.2)),
      ec: Math.max(1.0, Math.min(3.0, baseValues.ec + dayFactor * 0.3)),
      orp: Math.max(150, Math.min(400, baseValues.orp + dayFactor * 50)),
      do: Math.max(3, Math.min(10, baseValues.do + dayFactor * 1)),
      humidity: Math.max(40, Math.min(95, baseValues.humidity + dayFactor * 10)),
    }
  }

  const checkForAlerts = useCallback((data: SensorData) => {
    const newAlerts: RealtimeContextType["alerts"] = []

    if (data.pH < 5.2 || data.pH > 6.8) {
      newAlerts.push({
        id: `${data.deviceId}-ph-${Date.now()}`,
        deviceId: data.deviceId,
        message: `pH out of range: ${data.pH.toFixed(2)}`,
        severity: "error",
        timestamp: data.timestamp,
      })
    }

    if (data.ec < 0.8 || data.ec > 2.9) {
      newAlerts.push({
        id: `${data.deviceId}-ec-${Date.now()}`,
        deviceId: data.deviceId,
        message: `EC out of range: ${data.ec.toFixed(2)} mS/cm`,
        severity: "warning",
        timestamp: data.timestamp,
      })
    }

    if (data.do < 4.0) {
      newAlerts.push({
        id: `${data.deviceId}-do-${Date.now()}`,
        deviceId: data.deviceId,
        message: `Low dissolved oxygen: ${data.do.toFixed(1)} mg/L`,
        severity: "error",
        timestamp: data.timestamp,
      })
    }

    if (data.orp < 200) {
      newAlerts.push({
        id: `${data.deviceId}-orp-${Date.now()}`,
        deviceId: data.deviceId,
        message: `Low ORP: ${data.orp.toFixed(0)} mV`,
        severity: "warning",
        timestamp: data.timestamp,
      })
    }

    if (data.humidity > 90) {
      newAlerts.push({
        id: `${data.deviceId}-humidity-${Date.now()}`,
        deviceId: data.deviceId,
        message: `High humidity: ${data.humidity.toFixed(1)}%`,
        severity: "warning",
        timestamp: data.timestamp,
      })
    }

    // Show toast for new alerts
    newAlerts.forEach((alert) => {
      toast({
        title: `Alert: ${alert.deviceId}`,
        description: alert.message,
        variant: alert.severity === "error" ? "destructive" : "default",
      })
    })

    if (newAlerts.length > 0) {
      setAlerts((prev) => [...newAlerts, ...prev].slice(0, 50)) // Keep last 50 alerts
    }
  }, [toast])

  return <RealtimeContext.Provider value={{ sensorData, isConnected, alerts }}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider")
  }
  return context
}
