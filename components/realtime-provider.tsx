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
  // ESP32 hardware fields
  temperature?: number
  tds_ppm?: number
  substrate_moisture?: number
  nutrient_pump_status?: boolean
  paw_pump_status?: boolean
  wifi_signal?: number
  free_heap?: number
  uptime_ms?: number
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
  // Throttle toast notifications: key = "deviceId-severity", value = last fire time
  const lastToastTimeRef = useRef<Record<string, number>>({})
  const TOAST_THROTTLE_MS = 15 * 60 * 1000 // 15 minutes
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
  // SSE EventSource ref
  const eventSourceRef = useRef<EventSource | null>(null)
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
          
          // Also cache for sensor bags (first + last only — bags are interconnected)
          if (!deviceId) {
            for (const bagId of ['grow-bag-1', 'grow-bag-6']) {
              parametersCache.current[bagId] = thresholds
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
      const numValue = Number(value)
      if (isNaN(numValue)) return
      if (numValue < range.min - 4 || numValue > range.max + 4) {
        // Alert: ±4 from range - add to alerts array for notifications
        newAlerts.push({
          id: generateUniqueId(),
          deviceId: data.deviceId,
          message: `${paramName} alert: ${numValue.toFixed(1)}${unit} (Range: ${range.min}-${range.max}${unit})`,
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
    // Update the ref whenever authentication state changes
    isAuthenticatedRef.current = isAuthenticated

    // Clear alerts when not authenticated or when alerts aren't needed
    if (!isAuthenticated || !needsAlerts) {
      setAlerts([])
    }

    // ─── Helper: convert API room+bags response to legacy per-device format ───
    const convertToLegacy = (result: any): Record<string, SensorData> => {
      const legacyData: Record<string, SensorData> = {}
      if (result.bags && typeof result.bags === 'object') {
        Object.values(result.bags).forEach((bag: any) => {
          legacyData[bag.deviceId] = {
            deviceId: bag.deviceId,
            moisture: Number(bag.moisture) || 0,
            roomTemp: Number(result.room?.roomTemp) || 0,
            humidity: Number(result.room?.humidity) || 0,
            pH: Number(result.room?.pH) || 0,
            ec: Number(result.room?.ec) || 0,
            waterLevel: result.room?.waterLevel ?? 'Unknown',
            timestamp: result.room?.timestamp ?? bag.moistureTimestamp ?? new Date().toISOString(),
            // ESP32 hardware fields (pass through from raw ingest data)
            temperature: Number(result.room?.roomTemp) || 0,
            tds_ppm: Number(result.room?.tds_ppm) || 0,
            substrate_moisture: Number(bag.moisture) || 0,
            nutrient_pump_status: result.room?.nutrient_pump_status ?? false,
            paw_pump_status: result.room?.paw_pump_status ?? false,
            wifi_signal: Number(result.room?.wifi_signal) || 0,
            free_heap: Number(result.room?.free_heap) || 0,
            uptime_ms: Number(result.room?.uptime_ms) || 0,
          } as SensorData
        })
      }
      return legacyData
    }

    // ─── Helper: fire alerts + toasts for a set of devices ───
    // All bags are interconnected and share room-level sensors (temp, pH, EC, humidity).
    // Only check room-level alerts once (on the first bag) to avoid duplicate notifications.
    const processAlerts = (devices: Record<string, SensorData>) => {
      if (!isAuthenticatedRef.current || !needsAlerts) return
      const allNewAlerts: RealtimeContextType["alerts"] = []
      const deviceEntries = Object.values(devices)
      if (deviceEntries.length > 0) {
        // Check room-level + moisture for first bag only (room sensors are shared)
        allNewAlerts.push(...stableCheckForAlerts(deviceEntries[0]))
      }
      if (allNewAlerts.length === 0) return
      setAlerts((prev) => {
        const combined = [...allNewAlerts, ...prev]
        const unique = combined.filter((a, i, self) => self.findIndex(x => x.id === a.id) === i)
        return unique.slice(0, 50)
      })
      if (notificationSettings.masterEnabled) {
        setTimeout(() => {
          const now = Date.now()
          allNewAlerts.forEach((alert) => {
            if (alert.severity === "alert" || alert.severity === "error") {
              // Throttle: only show toast once per 15 minutes per device+severity
              const toastKey = `${alert.deviceId}-${alert.severity}`
              const lastFired = lastToastTimeRef.current[toastKey] ?? 0
              if (now - lastFired < TOAST_THROTTLE_MS) return
              lastToastTimeRef.current[toastKey] = now
              stableToast({
                title: alert.severity === "error" ? `🚨 Critical: ${alert.deviceId}` : `⚠️ Sensor Alert: ${alert.deviceId}`,
                description: alert.message,
                variant: "destructive",
              })
            }
          })
        }, 0)
      }
    }

    // ─── Helper: switch to demo/mock mode ───
    const switchToMockMode = () => {
      const timeSinceReal = Date.now() - lastRealDataTimeRef.current
      // If we received real data within the last 30 seconds, keep showing it
      // (don't overwrite real data with mock on a single transient failure)
      if (timeSinceReal < 30000 && lastRealDataTimeRef.current > 0) {
        return // Keep existing real data briefly
      }
      setIsRealData(false)
      setIsConnected(false)
      // Populate with mock data for first + last bag (interconnected system)
      const mockData: Record<string, SensorData> = {}
      for (const bagId of ['grow-bag-1', 'grow-bag-6']) {
        mockData[bagId] = generateMockSensorData(bagId)
      }
      setSensorData((prev) => {
        const next = Object.keys(prev).length > 0
          ? Object.fromEntries(Object.keys(prev).map(id => [id, generateMockSensorData(id)]))
          : mockData
        processAlerts(next)
        return next
      })
    }

    // ─── Initial fetch ───
    const initialFetch = async () => {
      try {
        const res = await fetch('/api/sensors/latest')
        if (res.ok) {
          const result = await res.json()
          // Only treat as live if data exists AND is fresh (< 5 min old)
          if (result.success && result.isDataFresh && result.bags && Object.keys(result.bags).length > 0) {
            const legacyData = convertToLegacy(result)
            console.log('✅ Initial real ESP32 data:', Object.keys(legacyData))
            setSensorData(legacyData)
            setIsRealData(true)
            setIsConnected(true)
            lastRealDataTimeRef.current = Date.now()
            processAlerts(legacyData)
            return
          }
          if (result.success && !result.isDataFresh) {
            console.log(`🕰️ DB data is stale (${result.dataAgeSeconds}s old) — Demo Mode`)
          }
        }
      } catch (err) {
        console.error('❌ Initial fetch failed:', err)
      }
      console.log('🎭 No live ESP32 data — starting in Demo Mode')
      setIsRealData(false)
      setIsConnected(false)
      switchToMockMode()
    }

    initialFetch()

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    if (needsRealTimeUpdates && isAuthenticated) {
      console.log('▶️ Starting real-time SSE stream for:', pathname)

      // ── Try SSE first, fall back to polling ──
      let sseConnected = false

      try {
        const es = new EventSource('/api/sensors/stream')
        eventSourceRef.current = es

        es.onopen = () => {
          console.log('✅ SSE connected')
          sseConnected = true
        }

        es.onmessage = (event) => {
          if (!isAuthenticatedRef.current) return
          try {
            const result = JSON.parse(event.data)
            if (result.success && result.isDataFresh && result.bags && Object.keys(result.bags).length > 0) {
              const legacyData = convertToLegacy(result)
              setIsRealData(true)
              setIsConnected(true)
              lastRealDataTimeRef.current = Date.now()
              setSensorData(legacyData)
              processAlerts(legacyData)
            } else {
              switchToMockMode()
            }
          } catch {
            // Ignore parse errors (keepalive pings, etc.)
          }
        }

        es.onerror = () => {
          console.log('⚠️ SSE error — falling back to polling')
          es.close()
          eventSourceRef.current = null
          sseConnected = false
          // Fall through to polling below
          startPolling()
        }
      } catch {
        console.log('⚠️ SSE not available — using polling')
        startPolling()
      }

      function startPolling() {
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(async () => {
          if (!isAuthenticatedRef.current) return

          try {
            const res = await fetch('/api/sensors/latest')
            if (res.ok) {
              const result = await res.json()
              if (result.success && result.isDataFresh && result.bags && Object.keys(result.bags).length > 0) {
                const legacyData = convertToLegacy(result)
                setIsRealData(true)
                setIsConnected(true)
                lastRealDataTimeRef.current = Date.now()
                setSensorData(legacyData)
                processAlerts(legacyData)
                return
              }
            }
          } catch (err) {
            console.error('❌ Interval fetch failed:', err)
          }

          switchToMockMode()
        }, 5000)
      }
    } else {
      console.log('⏸ Real-time updates disabled for page:', pathname)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [isAuthenticated, needsRealTimeUpdates, needsAlerts, pathname, generateMockSensorData, stableCheckForAlerts, stableToast, notificationSettings.masterEnabled])

  // Separate effect for cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // ── Periodic 15-minute browser notification with system status ──
  const notifIntervalRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (!isAuthenticated || !needsRealTimeUpdates || !notificationSettings.masterEnabled) {
      if (notifIntervalRef.current) {
        clearInterval(notifIntervalRef.current)
        notifIntervalRef.current = null
      }
      return
    }

    // Request browser notification permission on first load
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const sendPeriodicNotification = () => {
      const devices = Object.values(sensorData)
      if (devices.length === 0) return

      // Compute summary
      const temps = devices.map(d => d.roomTemp).filter(Boolean)
      const pHs = devices.map(d => d.pH).filter(Boolean)
      const moistures = devices.map(d => d.moisture).filter(Boolean)
      const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '—'
      const avgpH = pHs.length ? (pHs.reduce((a, b) => a + b, 0) / pHs.length).toFixed(1) : '—'
      const avgMoisture = moistures.length ? (moistures.reduce((a, b) => a + b, 0) / moistures.length).toFixed(0) : '—'

      // Count issues
      const warnings: string[] = []
      devices.forEach(d => {
        if (d.roomTemp > 28) warnings.push(`${d.deviceId}: Temp ${d.roomTemp.toFixed(1)}°C HIGH`)
        else if (d.roomTemp < 20) warnings.push(`${d.deviceId}: Temp ${d.roomTemp.toFixed(1)}°C LOW`)
        if (d.pH > 6.8 || d.pH < 5.5) warnings.push(`${d.deviceId}: pH ${d.pH.toFixed(1)} OUT OF RANGE`)
        if (d.moisture < 50) warnings.push(`${d.deviceId}: Moisture ${d.moisture.toFixed(0)}% LOW`)
      })

      const statusLine = warnings.length > 0
        ? `⚠️ ${warnings.length} issue${warnings.length > 1 ? 's' : ''} detected`
        : '✅ All systems normal'

      const body = `Temp: ${avgTemp}°C | pH: ${avgpH} | Moisture: ${avgMoisture}%\n${statusLine}`

      // Browser notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('QBM-HydroNet Status', {
          body,
          icon: '/icon-192x192.png',
          tag: 'qbm-periodic-status', // Replace previous notification
          silent: warnings.length === 0,
        })
      }

      // Also show in-app toast
      toast({
        title: warnings.length > 0 ? '⚠️ System Status Update' : '✅ System Status Update',
        description: `Avg Temp: ${avgTemp}°C | pH: ${avgpH} | Moisture: ${avgMoisture}%${warnings.length > 0 ? ` — ${warnings.length} issue(s)` : ''}`,
        variant: warnings.length > 0 ? 'destructive' : undefined,
      })
    }

    // Fire every 15 minutes
    notifIntervalRef.current = setInterval(sendPeriodicNotification, 15 * 60 * 1000)

    return () => {
      if (notifIntervalRef.current) {
        clearInterval(notifIntervalRef.current)
        notifIntervalRef.current = null
      }
    }
  }, [isAuthenticated, needsRealTimeUpdates, notificationSettings.masterEnabled, sensorData, toast])

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
