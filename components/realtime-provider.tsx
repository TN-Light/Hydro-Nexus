"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"

interface SensorData {
  deviceId: string
  timestamp: string
  roomTemp: number
  pH: number
  ec: number
  moisture: number
  waterLevel: string
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
  const lastWaterAlertTimeRef = useRef<Record<string, number>>({})
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()
  
  // Stable interval ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  // Ref to track current authentication state in interval
  const isAuthenticatedRef = useRef(isAuthenticated)
  // Ref to store initial water levels for each device (simulate slow depletion)
  const initialWaterLevelsRef = useRef<Record<string, number>>({})

  const generateMockSensorData = useCallback((deviceId: string): SensorData => {
    const baseValues = {
      roomTemp: 24 + Math.random() * 6, // 24-30°C
      pH: 5.8 + Math.random() * 0.8, // 5.8-6.6
      ec: 1.8 + Math.random() * 0.6, // 1.8-2.4
      moisture: 60 + Math.random() * 30, // 60-90%
      humidity: 65 + Math.random() * 20, // 65-85%
    }

    // Add some diurnal variation
    const hour = new Date().getHours()
    const dayFactor = Math.sin((hour / 24) * 2 * Math.PI)

    // Initialize water level if not exists (start with adequate levels)
    if (!initialWaterLevelsRef.current[deviceId]) {
      // Start with water levels well above the required threshold (22-25cm)
      initialWaterLevelsRef.current[deviceId] = 22 + Math.random() * 3
    }

    // Very slow water level depletion (realistic 2-day cycle)
    // Deplete by approximately 0.1cm every 3 hours (8 updates per day = ~0.8cm/day)
    const currentTime = Date.now()
    const startTime = initialWaterLevelsRef.current[`${deviceId}_startTime`] || currentTime
    if (!initialWaterLevelsRef.current[`${deviceId}_startTime`]) {
      initialWaterLevelsRef.current[`${deviceId}_startTime`] = currentTime
    }
    
    const hoursElapsed = (currentTime - startTime) / (1000 * 60 * 60)
    const depletionRate = 0.1 / 3 // 0.1cm every 3 hours
    const currentWaterLevel = Math.max(
      15, // Minimum possible level
      initialWaterLevelsRef.current[deviceId] - (hoursElapsed * depletionRate)
    )
    
    // Add small random fluctuation (±0.1cm) to simulate measurement noise
    const waterLevelCm = currentWaterLevel + (Math.random() - 0.5) * 0.2
    const requiredLevel = 20 // Required minimum 20cm
    const waterLevelStatus = waterLevelCm < requiredLevel ? "Below Required Level" : "Adequate"

    return {
      deviceId,
      timestamp: new Date().toISOString(),
      roomTemp: Math.max(18, Math.min(35, baseValues.roomTemp + dayFactor * 3)),
      pH: Math.max(5.0, Math.min(7.0, baseValues.pH + dayFactor * 0.2)),
      ec: Math.max(1.0, Math.min(3.0, baseValues.ec + dayFactor * 0.3)),
      moisture: Math.max(40, Math.min(95, baseValues.moisture + dayFactor * 10)),
      waterLevel: waterLevelStatus,
      humidity: Math.max(40, Math.min(95, baseValues.humidity + dayFactor * 10)),
    }
  }, [])

  const checkForAlerts = useCallback((data: SensorData) => {
    // Generate alerts regardless of authentication status
    const newAlerts: RealtimeContextType["alerts"] = []
    const baseTimestamp = Date.now()
    const currentTime = Date.now()

    if (data.pH < 5.2 || data.pH > 6.8) {
      newAlerts.push({
        id: `${data.deviceId}-ph-${baseTimestamp}-${newAlerts.length}`,
        deviceId: data.deviceId,
        message: `pH out of range: ${data.pH.toFixed(2)}`,
        severity: "error",
        timestamp: data.timestamp,
      })
    }

    if (data.ec < 0.8 || data.ec > 2.9) {
      newAlerts.push({
        id: `${data.deviceId}-ec-${baseTimestamp}-${newAlerts.length}`,
        deviceId: data.deviceId,
        message: `EC out of range: ${data.ec.toFixed(2)} mS/cm`,
        severity: "warning",
        timestamp: data.timestamp,
      })
    }

    // Water level alert with 5-minute throttling
    if (data.waterLevel === "Below Required Level") {
      const lastAlertTime = lastWaterAlertTimeRef.current[data.deviceId] || 0
      const timeSinceLastAlert = currentTime - lastAlertTime
      const fiveMinutes = 5 * 60 * 1000 // 5 minutes in milliseconds
      
      if (timeSinceLastAlert >= fiveMinutes) {
        newAlerts.push({
          id: `${data.deviceId}-water-${baseTimestamp}-${newAlerts.length}`,
          deviceId: data.deviceId,
          message: `Water level below required threshold`,
          severity: "error",
          timestamp: data.timestamp,
        })
        
        // Update the last alert time for this device
        lastWaterAlertTimeRef.current[data.deviceId] = currentTime
      }
    }

    if (data.moisture < 50) {
      newAlerts.push({
        id: `${data.deviceId}-moisture-${baseTimestamp}-${newAlerts.length}`,
        deviceId: data.deviceId,
        message: `Low substrate moisture: ${data.moisture.toFixed(1)}%`,
        severity: "warning",
        timestamp: data.timestamp,
      })
    }

    if (data.roomTemp < 18 || data.roomTemp > 32) {
      newAlerts.push({
        id: `${data.deviceId}-temp-${baseTimestamp}-${newAlerts.length}`,
        deviceId: data.deviceId,
        message: `Room temperature out of range: ${data.roomTemp.toFixed(1)}°C`,
        severity: "warning",
        timestamp: data.timestamp,
      })
    }

    if (data.humidity > 90) {
      newAlerts.push({
        id: `${data.deviceId}-humidity-${baseTimestamp}-${newAlerts.length}`,
        deviceId: data.deviceId,
        message: `High humidity: ${data.humidity.toFixed(1)}%`,
        severity: "warning",
        timestamp: data.timestamp,
      })
    }

    return newAlerts
  }, [])

  // Stable reference to toast and functions used in interval
  const stableToast = useCallback((options: Parameters<typeof toast>[0]) => {
    toast(options)
  }, [toast])

  const stableCheckForAlerts = useCallback((data: SensorData) => {
    return checkForAlerts(data)
  }, [checkForAlerts])

  useEffect(() => {
    // Always show mock data for the dashboard UI
    setIsConnected(true)
    
    // Update the ref whenever authentication state changes
    isAuthenticatedRef.current = isAuthenticated
    
    // Clear alerts when not authenticated
    if (!isAuthenticated) {
      setAlerts([])
      console.log('User not authenticated, clearing alerts')
    } else {
      console.log('User authenticated, alerts enabled')
    }

    // Generate initial mock data for 6 grow bags
    const initialData: Record<string, SensorData> = {}
    for (let i = 1; i <= 6; i++) {
      initialData[`grow-bag-${i}`] = generateMockSensorData(`grow-bag-${i}`)
    }
    setSensorData(initialData)

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Simulate real-time updates every 3 seconds
    intervalRef.current = setInterval(() => {
      setSensorData((prev) => {
        const updated = { ...prev }
        const allNewAlerts: RealtimeContextType["alerts"] = []
        
        Object.keys(updated).forEach((deviceId) => {
          updated[deviceId] = generateMockSensorData(deviceId)
          
          // Only check for alerts and show notifications if authenticated (using ref for current state)
          if (isAuthenticatedRef.current) {
            // Check for alerts
            const newAlerts = stableCheckForAlerts(updated[deviceId])
            allNewAlerts.push(...newAlerts)
          }
        })
        
        // Update alerts if any new ones were found and user is authenticated
        if (allNewAlerts.length > 0 && isAuthenticatedRef.current) {
          console.log('New alerts generated:', allNewAlerts.length)
          setAlerts((prev) => [...allNewAlerts, ...prev].slice(0, 50))
          
          // Show toast notifications only for authenticated users
          setTimeout(() => {
            allNewAlerts.forEach((alert) => {
              stableToast({
                title: `Alert: ${alert.deviceId}`,
                description: alert.message,
                variant: alert.severity === "error" ? "destructive" : "default",
              })
            })
          }, 0)
        }
        
        return updated
      })
    }, 3000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsConnected(false)
    }
  }, [isAuthenticated, generateMockSensorData, stableCheckForAlerts, stableToast]) // Stable dependencies

  // Separate effect for cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return <RealtimeContext.Provider value={{ sensorData, isConnected, alerts }}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider")
  }
  return context
}
