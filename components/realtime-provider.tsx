"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { usePathname } from "next/navigation"
import { usePreferencesStore } from "@/lib/stores/preferences-store"

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
  isRealData: boolean
  alerts: Array<{
    id: string
    deviceId: string
    message: string
    severity: "info" | "warning" | "alert" | "error"
    timestamp: string
  }>
  clearParametersCache: () => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [sensorData, setSensorData] = useState<Record<string, SensorData>>({})
  const [isConnected, setIsConnected] = useState(false)
  const [alerts, setAlerts] = useState<RealtimeContextType["alerts"]>([])
  const [isRealData, setIsRealData] = useState(false) // Track if using real ESP32 data
  const lastWaterAlertTimeRef = useRef<Record<string, number>>({})
  const lastRealDataTimeRef = useRef<number>(0) // Track when we last got real data
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()
  const { notificationSettings } = usePreferencesStore()
  
  // Determine if we need real-time updates based on current page
  const needsRealTimeUpdates = useMemo(() => {
    return pathname === '/dashboard' || pathname === '/digital-twin'
  }, [pathname])
  
  // Determine if we need alerts based on current page  
  const needsAlerts = useMemo(() => {
    return pathname === '/dashboard' || needsRealTimeUpdates
  }, [pathname, needsRealTimeUpdates])
  
  // Stable interval ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  // Ref to track current authentication state in interval
  const isAuthenticatedRef = useRef(isAuthenticated)
  // Ref to store initial water levels for each device (simulate slow depletion)
  const initialWaterLevelsRef = useRef<Record<string, number>>({})

  // Fetch user-specific parameters from API and populate cache
  const fetchUserParameters = useCallback(async (deviceId?: string) => {
    if (!isAuthenticated) return
    
    try {
      const deviceParam = deviceId || ''
      const response = await fetch(`/api/user/parameters?deviceId=${deviceParam}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const params = result.parameters
          const thresholds = {
            temperature: params.temperature || { min: 20, max: 28 },
            humidity: params.humidity || { min: 60, max: 80 },
            pH: params.pH || { min: 5.5, max: 6.8 },
            ec: params.ec || { min: 1.2, max: 2.4 },
          }
          
          const cacheKey = deviceId || 'all'
          parametersCache.current[cacheKey] = thresholds
          
          // Also cache for specific devices if loading "all"
          if (!deviceId) {
            for (let i = 1; i <= 6; i++) {
              parametersCache.current[`grow-bag-${i}`] = thresholds
            }
          }
          
          lastCacheUpdateRef.current = Date.now()
          console.log('✅ User parameters loaded from API:', cacheKey)
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch user parameters:', error)
    }
  }, [isAuthenticated])

  // Generate unique ID for alerts
  const generateUniqueId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Cache parameters to avoid frequent localStorage reads
  const parametersCache = useRef<Record<string, any>>({})
  const lastCacheUpdateRef = useRef<number>(0)
  const CACHE_DURATION = 10000 // 10 seconds cache

  // Function to clear parameters cache and refetch (call when parameters are updated)
  const clearParametersCache = useCallback(() => {
    parametersCache.current = {}
    lastCacheUpdateRef.current = 0
    // Refetch from API to get updated values
    fetchUserParameters()
  }, [fetchUserParameters])

  // Get device-specific alert thresholds with caching
  const getDeviceAlertThresholds = useCallback((deviceId: string) => {
    const now = Date.now()
    const cacheKey = deviceId
    
    // Return cached version if still valid
    if (parametersCache.current[cacheKey] && (now - lastCacheUpdateRef.current) < CACHE_DURATION) {
      return parametersCache.current[cacheKey]
    }

    // Define fallback defaults with new structure (no threshold fields)
    const defaultThresholds = {
      temperature: { min: 20, max: 28 },
      humidity: { min: 60, max: 80 },
      pH: { min: 5.5, max: 6.8 },
      ec: { min: 1.2, max: 2.4 },
    }

    // Note: This function is called synchronously in alerts, so we use cached data
    // The cache is populated by fetchUserParameters function at component mount
    // If no cached data exists yet, we return defaults
    
    try {
      // Check if we have cached parameters from the API
      if (parametersCache.current[cacheKey]) {
        return parametersCache.current[cacheKey]
      }
      
      // Cache and return defaults if no API data loaded yet
      parametersCache.current[cacheKey] = defaultThresholds
      lastCacheUpdateRef.current = now
      return defaultThresholds
    } catch (error) {
      console.error('Failed to parse device-specific parameters:', error)
      parametersCache.current[cacheKey] = defaultThresholds
      lastCacheUpdateRef.current = now
      return defaultThresholds
    }
  }, [])

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

  // Check for alerts based on sensor thresholds with new ±2/±4 logic
  const checkForAlerts = useCallback((data: SensorData) => {
    const thresholds = getDeviceAlertThresholds(data.deviceId)
    const newAlerts: RealtimeContextType["alerts"] = []
    const now = Date.now()

    // Helper function to check parameter status - ONLY add alerts (±4) to alerts array
    const checkParameter = (value: number, range: { min: number; max: number }, paramName: string, unit: string) => {
      if (value < range.min - 4 || value > range.max + 4) {
        // Alert: ±4 from range - add to alerts array for notifications
        newAlerts.push({
          id: generateUniqueId(),
          deviceId: data.deviceId,
          message: `${paramName} alert: ${value.toFixed(1)}${unit} (Range: ${range.min}-${range.max}${unit})`,
          severity: "alert",
          timestamp: new Date(now).toISOString(),
        })
      }
      // Warning alerts (±2 from range) are NOT added to alerts array - they only show in components
    }

    // Check each parameter
    checkParameter(data.roomTemp, thresholds.temperature, "Temperature", "°C")
    checkParameter(data.pH, thresholds.pH, "pH", "")
    checkParameter(data.ec, thresholds.ec, "EC", " mS/cm")
    checkParameter(data.humidity, thresholds.humidity, "Humidity", "%")

    // Water level check (simple) - critical system error
    if (data.waterLevel === "Below Required Level") {
      const lastAlertTime = lastWaterAlertTimeRef.current[data.deviceId] || 0
      if (now - lastAlertTime > 60000) { // Only alert every minute
        newAlerts.push({
          id: generateUniqueId(),
          deviceId: data.deviceId,
          message: "Water level is below required level",
          severity: "error",
          timestamp: new Date(now).toISOString(),
        })
        lastWaterAlertTimeRef.current[data.deviceId] = now
      }
    }

    // Low moisture is only a warning - do NOT add to alerts array
    // It will only be displayed in the component itself

    return newAlerts
  }, [getDeviceAlertThresholds, generateUniqueId])

  // Stable reference to toast and functions used in interval
  const stableToast = useCallback((options: Parameters<typeof toast>[0]) => {
    toast(options)
  }, [toast])

  const stableCheckForAlerts = useCallback((data: SensorData) => {
    return checkForAlerts(data)
  }, [checkForAlerts])

  // Load user parameters when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserParameters() // Load global "all devices" parameters
    }
  }, [isAuthenticated, fetchUserParameters])

  useEffect(() => {
    // Always show mock data for the dashboard UI, but only update when needed
    setIsConnected(true)
    
    // Update the ref whenever authentication state changes
    isAuthenticatedRef.current = isAuthenticated
    
    // Clear alerts when not authenticated or when alerts aren't needed
    if (!isAuthenticated || !needsAlerts) {
      setAlerts([])
      console.log('Alerts disabled - user not authenticated or page does not need alerts')
    } else {
      console.log('User authenticated and alerts enabled for this page')
    }

    // Fetch real sensor data from API
    const fetchRealSensorData = async () => {
      try {
        const response = await fetch('/api/sensors/latest')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            // Check if we got actual data from database
            const deviceKeys = Object.keys(result.data)
            if (deviceKeys.length > 0) {
              console.log('✅ Fetched real ESP32 data from database:', deviceKeys)
              setSensorData(result.data)
              setIsRealData(true)
              lastRealDataTimeRef.current = Date.now()
              return
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch real sensor data, using mock data:', error)
      }
      
      // Check if we recently had real data (within last 2 minutes)
      const timeSinceRealData = Date.now() - lastRealDataTimeRef.current
      if (timeSinceRealData > 120000) { // 2 minutes
        setIsRealData(false)
        console.log('⚠️ No ESP32 data for >2 minutes, switching to demo mode')
      }
      
      // Fallback to mock data if API fails or no real data
      const initialData: Record<string, SensorData> = {}
      for (let i = 1; i <= 6; i++) {
        initialData[`grow-bag-${i}`] = generateMockSensorData(`grow-bag-${i}`)
      }
      setSensorData(initialData)
    }
    
    fetchRealSensorData()

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Only start intensive real-time updates if needed
    if (needsRealTimeUpdates && isAuthenticated) {
      console.log('Starting real-time updates for page:', pathname)
      
      // Fetch real-time updates every 5 seconds
      intervalRef.current = setInterval(async () => {
        // Check if component is still mounted and authenticated
        if (!isAuthenticatedRef.current) {
          return
        }
        
        try {
          const response = await fetch('/api/sensors/latest')
          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              // NEW FORMAT: Convert room + bags back to legacy format for compatibility
              const legacyData: Record<string, any> = {}
              
              if (result.bags) {
                Object.values(result.bags).forEach((bag: any) => {
                  legacyData[bag.deviceId] = {
                    deviceId: bag.deviceId,
                    moisture: bag.moisture,
                    moistureTimestamp: bag.moistureTimestamp,
                    // Add room sensors to each bag for backward compatibility
                    roomTemp: result.room?.roomTemp || 0,
                    humidity: result.room?.humidity || 0,
                    pH: result.room?.pH || 0,
                    ec: result.room?.ec || 0,
                    waterLevel: result.room?.waterLevel || 'Unknown',
                    timestamp: result.room?.timestamp || bag.moistureTimestamp
                  }
                })
              }
              
              console.log('🔄 Real-time update:', Object.keys(legacyData).length, 'devices')
              
              setSensorData((prev) => {
                const updated = { ...legacyData }
                const allNewAlerts: RealtimeContextType["alerts"] = []
                
                // Check for alerts if needed
                if (isAuthenticatedRef.current && needsAlerts) {
                  Object.values(updated).forEach((deviceData: any) => {
                    const newAlerts = stableCheckForAlerts(deviceData)
                    allNewAlerts.push(...newAlerts)
                  })
                  
                  // Update alerts
                  if (allNewAlerts.length > 0) {
                    setAlerts((prevAlerts) => [...allNewAlerts, ...prevAlerts].slice(0, 50))
                  }
                }
                
                return updated
              })
              return
            }
          }
        } catch (error) {
          console.error('❌ Failed to fetch real-time data:', error)
        }
        
        // Fallback to mock data if API fails
        setSensorData((prev) => {
          const updated = { ...prev }
          const allNewAlerts: RealtimeContextType["alerts"] = []
          
          Object.keys(updated).forEach((deviceId) => {
            updated[deviceId] = generateMockSensorData(deviceId)
            
            // Only check for alerts if needed for this page
            if (isAuthenticatedRef.current && needsAlerts) {
              // Check for alerts
              const newAlerts = stableCheckForAlerts(updated[deviceId])
              allNewAlerts.push(...newAlerts)
            }
          })
          
          // Update alerts if any new ones were found and alerts are needed
          if (allNewAlerts.length > 0 && isAuthenticatedRef.current && needsAlerts) {
            console.log('New alerts generated:', allNewAlerts.length)
            setAlerts((prev) => {
              // Combine new alerts with existing ones
              const combined = [...allNewAlerts, ...prev]
              // Remove duplicates based on ID
              const uniqueAlerts = combined.filter((alert, index, self) => 
                self.findIndex(a => a.id === alert.id) === index
              )
              // Keep only the 50 most recent alerts
              return uniqueAlerts.slice(0, 50)
            })
            
            // Show toast notifications for alerts (±4) and errors (system issues)
            setTimeout(() => {
              allNewAlerts.forEach((alert) => {
                // Show popup notifications for both 'alert' (±4 sensor) and 'error' (system) severity
                if ((alert.severity === "alert" || alert.severity === "error") && notificationSettings.masterEnabled) {
                  const title = alert.severity === "error" ? "Critical System Error" : "Sensor Alert"
                  stableToast({
                    title: `${title}: ${alert.deviceId}`,
                    description: alert.message,
                    variant: "destructive",
                  })
                }
              })
            }, 0)
          }
          
          return updated
        })
      }, 5000) // Reduced frequency to 5 seconds for better performance
    } else {
      console.log('Real-time updates disabled for page:', pathname)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (!needsRealTimeUpdates) {
        setIsConnected(false)
      }
    }
  }, [isAuthenticated, needsRealTimeUpdates, needsAlerts, pathname, generateMockSensorData, stableCheckForAlerts, stableToast, notificationSettings.masterEnabled]) // Include notification settings

  // Separate effect for cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    sensorData,
    isConnected,
    isRealData,
    alerts,
    clearParametersCache
  }), [sensorData, isConnected, isRealData, alerts, clearParametersCache])

  return <RealtimeContext.Provider value={contextValue}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider")
  }
  return context
}
