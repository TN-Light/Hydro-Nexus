"use client"

import { useAuth } from "@/components/auth-provider"
import { useRealtime } from "@/components/realtime-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Settings, Thermometer, Droplets, Zap, TestTube, Leaf, ArrowUpDown, Save, RotateCcw, FlaskConical, Sun, Activity, Waves } from "lucide-react"
import { useState, useEffect } from "react"
import { usePersistedState } from "@/hooks/use-persisted-state"
import { redirect } from "next/navigation"
import { getAMFSymbiosisStatus } from "@/lib/parameter-utils"
import { QBM_CROPS } from "@/lib/crop-database"

interface ParameterRange {
  min: number | string
  max: number | string
}

interface SystemParameters {
  temperature: ParameterRange
  humidity: ParameterRange
  pH: ParameterRange
  ec: ParameterRange
  ppm: ParameterRange
  nitrogen: ParameterRange
  phosphorus: ParameterRange
  potassium: ParameterRange
  calcium: ParameterRange
  magnesium: ParameterRange
  iron: ParameterRange
}

const defaultParameters: SystemParameters = {
  temperature: { min: 20, max: 28 },
  humidity: { min: 60, max: 80 },
  pH: { min: 5.5, max: 6.8 },
  ec: { min: 1.2, max: 2.4 },
  ppm: { min: 800, max: 1400 },
  nitrogen: { min: 150, max: 200 },
  // QBM FORCED SYMBIOSIS: Phosphorus MUST stay 40-60 ppm to activate AMF network
  phosphorus: { min: 40, max: 60 },
  potassium: { min: 200, max: 300 },
  calcium: { min: 150, max: 200 },
  magnesium: { min: 50, max: 75 },
  iron: { min: 2, max: 5 },
}

// PAW Protocol local state type
interface PAWConfig {
  targetH2O2Um: number
  applicationsPerWeek: number
  volumePercent: number
  windowWeeksBefore: number
  isActive: boolean
}

// LED Spectrum local state type
interface LEDConfig {
  red660: number
  blue450: number
  ppfd: number
  photoperiodHours: number
  cropPreset: string
}

const defaultPAWConfig: PAWConfig = {
  targetH2O2Um: 35,
  applicationsPerWeek: 2,
  volumePercent: 7,
  windowWeeksBefore: 4,
  isActive: false,
}

const defaultLEDConfig: LEDConfig = {
  red660: 60,
  blue450: 30,
  ppfd: 400,
  photoperiodHours: 14,
  cropPreset: "turmeric-high-curcumin",
}

const LED_PRESETS: Record<string, { red660: number; blue450: number; ppfd: number; photoperiodHours: number; label: string }> = {
  "turmeric-high-curcumin": { red660: 50, blue450: 50, ppfd: 350, photoperiodHours: 14, label: "Turmeric (1:1 R:B)" },
  "bhut-jolokia": { red660: 60, blue450: 30, ppfd: 500, photoperiodHours: 16, label: "Bhut Jolokia (2:1 R:B)" },
  "aji-charapita": { red660: 60, blue450: 30, ppfd: 450, photoperiodHours: 16, label: "Aji Charapita (2:1 R:B)" },
  "kanthari-chili": { red660: 65, blue450: 25, ppfd: 420, photoperiodHours: 15, label: "Kanthari Chili (2.6:1 R:B)" },
}

const parameterInfo = {
  temperature: { name: "Temperature", unit: "°C", icon: Thermometer, category: "environmental", defaultMin: 20, defaultMax: 28 },
  humidity: { name: "Humidity", unit: "%", icon: Droplets, category: "environmental", defaultMin: 60, defaultMax: 80 },
  pH: { name: "pH Level", unit: "", icon: TestTube, category: "chemical", defaultMin: 5.5, defaultMax: 6.8 },
  ec: { name: "Electrical Conductivity", unit: "mS/cm", icon: Zap, category: "chemical", defaultMin: 1.2, defaultMax: 2.4 },
  ppm: { name: "Total PPM", unit: "ppm", icon: TestTube, category: "chemical", defaultMin: 800, defaultMax: 1400 },
  nitrogen: { name: "Nitrogen", unit: "ppm", icon: Leaf, category: "nutrients", defaultMin: 150, defaultMax: 200 },
  phosphorus: { name: "Phosphorus", unit: "ppm", icon: Zap, category: "nutrients", defaultMin: 30, defaultMax: 50 },
  potassium: { name: "Potassium", unit: "ppm", icon: ArrowUpDown, category: "nutrients", defaultMin: 200, defaultMax: 300 },
  calcium: { name: "Calcium", unit: "ppm", icon: TestTube, category: "nutrients", defaultMin: 150, defaultMax: 200 },
  magnesium: { name: "Magnesium", unit: "ppm", icon: TestTube, category: "nutrients", defaultMin: 50, defaultMax: 75 },
  iron: { name: "Iron", unit: "ppm", icon: TestTube, category: "nutrients", defaultMin: 2, defaultMax: 5 },
}

export default function OptimizationPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const { clearParametersCache } = useRealtime()
  const { toast } = useToast()
  const [parameters, setParameters] = useState<SystemParameters>(defaultParameters)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedDevice, setSelectedDevice] = usePersistedState<string>("opt:selectedDevice", "all")
  const [pawConfig, setPAWConfig] = useState<PAWConfig>(defaultPAWConfig)
  const [ledConfig, setLEDConfig] = useState<LEDConfig>(defaultLEDConfig)
  const [manualPhosphorus, setManualPhosphorus] = useState<string>("")

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      redirect("/login")
    }
  }, [isLoading, isAuthenticated])

  useEffect(() => {
    // Load user-specific parameters from API
    const loadParameters = async () => {
      try {
        // Build query params - don't send deviceId at all if "all" is selected
        const params = new URLSearchParams()
        if (selectedDevice !== "all") {
          params.append('deviceId', selectedDevice)
        }
        
        const url = `/api/user/parameters${params.toString() ? '?' + params.toString() : ''}`
        const response = await fetch(url, {
          credentials: 'include', // Ensure cookies are sent
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setParameters(result.parameters)
            console.log('✅ Loaded user-specific parameters:', result.isDefault ? 'defaults' : 'saved', result.parameters)
          } else {
            console.warn('Failed to load parameters, using defaults')
            setParameters(defaultParameters)
          }
        } else {
          const errorText = await response.text()
          console.error('API error loading parameters:', response.status, errorText)
          setParameters(defaultParameters)
        }
      } catch (error) {
        console.error('Failed to load parameters from API:', error)
        setParameters(defaultParameters)
      }
      setHasChanges(false)
    }

    if (isAuthenticated) {
      loadParameters()
    }
  }, [selectedDevice, isAuthenticated]) // Reload when device selection changes

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading optimization settings...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const updateParameter = (
    paramKey: keyof SystemParameters,
    field: keyof ParameterRange,
    value: string
  ) => {
    // Always allow setting the value first (including empty strings)
    setParameters(prev => ({
      ...prev,
      [paramKey]: {
        ...prev[paramKey],
        [field]: value === '' ? value : parseFloat(value) || value
      }
    }))
    setHasChanges(true)
    
    // Only validate if it's a numeric value
    if (value !== '') {
      const numValue = parseFloat(value)
      if (!isNaN(numValue) && numValue >= 0) {
        // Additional validation can be done here if needed
        // For now, we allow all positive numeric values
      }
    }
  }

  const saveParameters = async () => {
    // Convert any string values back to numbers before saving
    const parametersToSave: SystemParameters = {} as SystemParameters
    
    Object.keys(parameters).forEach(key => {
      const paramKey = key as keyof SystemParameters
      const param = parameters[paramKey]
      parametersToSave[paramKey] = {
        min: typeof param.min === 'string' ? parseFloat(param.min) || parameterInfo[paramKey].defaultMin : param.min,
        max: typeof param.max === 'string' ? parseFloat(param.max) || parameterInfo[paramKey].defaultMax : param.max,
      }
    })
    
    try {
      // Save to database via API (user-specific)
      const deviceParam = selectedDevice === "all" ? null : selectedDevice
      const response = await fetch('/api/user/parameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies with token are sent
        body: JSON.stringify({
          deviceId: deviceParam,
          parameters: parametersToSave
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Save failed:', errorData)
        throw new Error(errorData.error || 'Failed to save parameters')
      }

      const result = await response.json()
      console.log('✅ Parameters saved to database:', result)

      // If saving for "all", also save individual device settings
      if (selectedDevice === "all") {
        for (let i = 1; i <= 6; i++) {
          await fetch('/api/user/parameters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              deviceId: `grow-bag-${i}`,
              parameters: parametersToSave
            })
          })
        }
      }

      setParameters(parametersToSave) // Update state with numeric values
      setHasChanges(false)
      
      // Clear the parameters cache in realtime provider so it picks up the new values immediately
      clearParametersCache()
      
      const deviceName = selectedDevice === "all" ? "all devices" : selectedDevice
      toast({
        title: "Settings Saved",
        description: `Parameter ranges for ${deviceName} have been saved to your account. Alerts will now use these thresholds immediately.`,
      })
    } catch (error) {
      console.error('❌ Failed to save parameters:', error)
      toast({
        title: "Save Failed",
        description: "Could not save parameters. Please try again.",
        variant: "destructive"
      })
    }
  }

  const resetToDefaults = () => {
    setParameters(defaultParameters)
    setHasChanges(true)
    toast({
      title: "Reset to Defaults",
      description: "All parameters have been reset to default values.",
    })
  }

  const renderParameterCard = (paramKey: keyof SystemParameters) => {
    const param = parameters[paramKey]
    const info = parameterInfo[paramKey]
    const Icon = info.icon

    return (
      <Card key={paramKey} className="relative">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-primary" />
            {info.name}
            {info.unit && <span className="text-xs text-muted-foreground">({info.unit})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Range Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`${paramKey}-min`} className="text-xs">Minimum</Label>
              <Input
                id={`${paramKey}-min`}
                type="number"
                step={paramKey === 'pH' || paramKey === 'ec' || paramKey === 'iron' ? '0.1' : '1'}
                value={param.min}
                onChange={(e) => updateParameter(paramKey, 'min', e.target.value)}
                onBlur={(e) => {
                  // If empty on blur, restore to default minimum value
                  if (e.target.value === '') {
                    const defaultMin = parameterInfo[paramKey].defaultMin
                    updateParameter(paramKey, 'min', defaultMin.toString())
                  }
                }}
                className="h-8 text-sm"
                min="0"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${paramKey}-max`} className="text-xs">Maximum</Label>
              <Input
                id={`${paramKey}-max`}
                type="number"
                step={paramKey === 'pH' || paramKey === 'ec' || paramKey === 'iron' ? '0.1' : '1'}
                value={param.max}
                onChange={(e) => updateParameter(paramKey, 'max', e.target.value)}
                onBlur={(e) => {
                  // If empty on blur, restore to default maximum value
                  if (e.target.value === '') {
                    const defaultMax = parameterInfo[paramKey].defaultMax
                    updateParameter(paramKey, 'max', defaultMax.toString())
                  }
                }}
                className={`h-8 text-sm ${
                  typeof param.max === 'number' && typeof param.min === 'number' && param.max < param.min 
                    ? 'border-red-500 focus:border-red-500' 
                    : ''
                }`}
                min={typeof param.min === 'number' ? param.min.toString() : '0'}
              />
              {typeof param.max === 'number' && typeof param.min === 'number' && param.max < param.min && (
                <p className="text-xs text-red-500">Maximum must be greater than minimum</p>
              )}
            </div>
          </div>

          {/* Range Display - thresholds are now fixed at ±2 for warning, ±4 for alert */}
          <div className="text-xs text-muted-foreground mb-3">
            Warning: ±2 from range | Alert: ±4 from range
          </div>

          {/* Visual Range Display */}
          <div className="mt-3 p-2 bg-muted/30 rounded text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="text-yellow-600">
                Warning: {
                  typeof param.min === 'number' && typeof param.max === 'number'
                    ? `${(param.min - 2).toFixed(1)} - ${(param.max + 2).toFixed(1)}`
                    : 'Setting values...'
                }
              </span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-green-600">Optimal: {typeof param.min === 'number' && typeof param.max === 'number' ? `${param.min} - ${param.max}` : 'Setting values...'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-red-600">
                Alert: {
                  typeof param.min === 'number' && typeof param.max === 'number'
                    ? `<${(param.min - 4).toFixed(1)} or >${(param.max + 4).toFixed(1)}`
                    : 'Setting values...'
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const environmentalParams = Object.keys(parameterInfo).filter(
    key => parameterInfo[key as keyof typeof parameterInfo].category === 'environmental'
  ) as (keyof SystemParameters)[]

  const chemicalParams = Object.keys(parameterInfo).filter(
    key => parameterInfo[key as keyof typeof parameterInfo].category === 'chemical'
  ) as (keyof SystemParameters)[]

  const nutrientParams = Object.keys(parameterInfo).filter(
    key => parameterInfo[key as keyof typeof parameterInfo].category === 'nutrients'
  ) as (keyof SystemParameters)[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Configuration</h1>
          <p className="text-muted-foreground">Configure parameter ranges for optimal growing conditions. Warnings trigger at ±2 from range, alerts at ±4.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Device Selection */}
          <div className="flex items-center gap-2">
            <Label htmlFor="device-select" className="text-sm font-medium whitespace-nowrap">
              Configure for:
            </Label>
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger id="device-select" className="w-[180px]">
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grow Bags</SelectItem>
                <SelectItem value="grow-bag-1">Grow Bag 1</SelectItem>
                <SelectItem value="grow-bag-2">Grow Bag 2</SelectItem>
                <SelectItem value="grow-bag-3">Grow Bag 3</SelectItem>
                <SelectItem value="grow-bag-4">Grow Bag 4</SelectItem>
                <SelectItem value="grow-bag-5">Grow Bag 5</SelectItem>
                <SelectItem value="grow-bag-6">Grow Bag 6</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Defaults
            </Button>
            <Button
              onClick={saveParameters}
              disabled={!hasChanges}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
            {hasChanges && (
              <Badge variant="secondary" className="ml-2">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="environmental" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="environmental" className="flex items-center gap-1 text-xs">
            <Thermometer className="h-3 w-3" />
            Environmental
          </TabsTrigger>
          <TabsTrigger value="chemical" className="flex items-center gap-1 text-xs">
            <TestTube className="h-3 w-3" />
            Chemical
          </TabsTrigger>
          <TabsTrigger value="nutrients" className="flex items-center gap-1 text-xs">
            <Leaf className="h-3 w-3" />
            Nutrients
          </TabsTrigger>
          <TabsTrigger value="phosphorus" className="flex items-center gap-1 text-xs">
            <FlaskConical className="h-3 w-3" />
            AMF / P
          </TabsTrigger>
          <TabsTrigger value="paw" className="flex items-center gap-1 text-xs">
            <Waves className="h-3 w-3" />
            PAW Protocol
          </TabsTrigger>
          <TabsTrigger value="led" className="flex items-center gap-1 text-xs">
            <Sun className="h-3 w-3" />
            LED Spectrum
          </TabsTrigger>
        </TabsList>

        <TabsContent value="environmental" className="mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            {environmentalParams.map(paramKey => renderParameterCard(paramKey))}
          </div>
        </TabsContent>

        <TabsContent value="chemical" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chemicalParams.map(paramKey => renderParameterCard(paramKey))}
          </div>
        </TabsContent>

        <TabsContent value="nutrients" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nutrientParams.map(paramKey => renderParameterCard(paramKey))}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════ */}
        {/* QBM TAB: Phosphorus / AMF Symbiosis     */}
        {/* ═══════════════════════════════════════ */}
        <TabsContent value="phosphorus" className="mt-6 space-y-6">
          {/* AMF Science Banner */}
          <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <FlaskConical className="h-5 w-5" />
                QBM Forced Symbiosis Protocol
              </CardTitle>
              <CardDescription>
                Arbuscular Mycorrhizal Fungi (AMF) colonise roots only under P-restriction.
                Maintain 40–60 ppm phosphorus to keep the fungal network active and drive bioactive overproduction.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="p-3 rounded bg-emerald-100 dark:bg-emerald-900/40">
                  <div className="font-bold text-emerald-700 dark:text-emerald-300 text-lg">40–60</div>
                  <div className="text-emerald-600 dark:text-emerald-400">ppm P → AMF ACTIVE</div>
                </div>
                <div className="p-3 rounded bg-yellow-100 dark:bg-yellow-900/40">
                  <div className="font-bold text-yellow-700 dark:text-yellow-300 text-lg">&gt;80</div>
                  <div className="text-yellow-600 dark:text-yellow-400">ppm P → AMF SUPPRESSED</div>
                </div>
                <div className="p-3 rounded bg-red-100 dark:bg-red-900/40">
                  <div className="font-bold text-red-700 dark:text-red-300 text-lg">&lt;30</div>
                  <div className="text-red-600 dark:text-red-400">ppm P → P DEFICIENT</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual P Measurement + Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                AMF Symbiosis Status Check
              </CardTitle>
              <CardDescription>
                Enter your most recent manual phosphorus reading to assess AMF status.
                Use a soil P test kit or send a sample to the lab.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="manual-p">Latest Phosphorus Reading (ppm)</Label>
                  <Input
                    id="manual-p"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 52"
                    value={manualPhosphorus}
                    onChange={(e) => setManualPhosphorus(e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
              </div>
              {manualPhosphorus !== "" && !isNaN(parseFloat(manualPhosphorus)) && (() => {
                const amf = getAMFSymbiosisStatus(parseFloat(manualPhosphorus))
                const colorMap: Record<string, string> = {
                  green: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30",
                  yellow: "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30",
                  orange: "border-orange-300 bg-orange-50 dark:bg-orange-950/30",
                  red: "border-red-300 bg-red-50 dark:bg-red-950/30",
                  gray: "border-gray-300 bg-gray-50 dark:bg-gray-950/30",
                }
                return (
                  <div className={`p-4 rounded border ${colorMap[amf.color]}`}>
                    <div className="font-semibold text-sm mb-1">{amf.label}</div>
                    <div className="text-sm text-muted-foreground">{amf.description}</div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* Phosphorus Alert Range (locked) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Phosphorus Alert Thresholds (System-Locked)</CardTitle>
              <CardDescription>
                These ranges are locked to QBM forced-symbiosis requirements. Do not raise above 80 ppm.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200">
                  <div className="font-bold text-red-700">&lt;30 ppm</div>
                  <div className="text-red-600">P Deficient — Alert</div>
                </div>
                <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200">
                  <div className="font-bold text-emerald-700">40–60 ppm</div>
                  <div className="text-emerald-600">AMF Active — Optimal</div>
                </div>
                <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200">
                  <div className="font-bold text-red-700">&gt;80 ppm</div>
                  <div className="text-red-600">AMF Suppressed — Alert</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                * Phosphorus values are read from manual_measurements table. ESP32 should not directly dose phosphorus.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════ */}
        {/* QBM TAB: PAW Protocol                   */}
        {/* ═══════════════════════════════════════ */}
        <TabsContent value="paw" className="mt-6 space-y-6">
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                <Waves className="h-5 w-5" />
                Plasma-Activated Water (PAW) Stress Protocol
              </CardTitle>
              <CardDescription>
                PAW delivers controlled oxidative stress via H₂O₂ in final 2–4 weeks before harvest.
                This triggers jasmonate signalling, forcing higher curcumin / capsaicin accumulation.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Target H2O2 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Target H₂O₂ Concentration</CardTitle>
                <CardDescription>Optimal range: 20–50 µM. Do not exceed 50 µM (root damage).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label>H₂O₂ Target (µM)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={pawConfig.targetH2O2Um}
                      onChange={(e) => setPAWConfig(prev => ({ ...prev, targetH2O2Um: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className={`p-2 rounded text-xs text-center font-medium ${
                  pawConfig.targetH2O2Um >= 20 && pawConfig.targetH2O2Um <= 50
                    ? "bg-emerald-100 text-emerald-700"
                    : pawConfig.targetH2O2Um > 50
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {pawConfig.targetH2O2Um >= 20 && pawConfig.targetH2O2Um <= 50
                    ? `${pawConfig.targetH2O2Um} µM ✓ Within protocol range`
                    : pawConfig.targetH2O2Um > 50
                    ? `${pawConfig.targetH2O2Um} µM ⚠ Too high — root damage risk`
                    : `${pawConfig.targetH2O2Um} µM ⚠ Below effective threshold`}
                </div>
              </CardContent>
            </Card>

            {/* Applications per week */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Application Frequency</CardTitle>
                <CardDescription>Recommended: 2× per week over 4 weeks before harvest.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Applications / Week</Label>
                    <Input
                      type="number"
                      min="1" max="7" step="1"
                      value={pawConfig.applicationsPerWeek}
                      onChange={(e) => setPAWConfig(prev => ({ ...prev, applicationsPerWeek: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Volume (% irrigation)</Label>
                    <Input
                      type="number"
                      min="1" max="20" step="0.5"
                      value={pawConfig.volumePercent}
                      onChange={(e) => setPAWConfig(prev => ({ ...prev, volumePercent: parseFloat(e.target.value) || 5 }))}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Recommended: 2×/wk · 5–10% of total irrigation volume
                </div>
              </CardContent>
            </Card>

            {/* PAW Window */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">PAW Activation Window</CardTitle>
                <CardDescription>How many weeks before harvest should PAW begin?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Weeks Before Harvest</Label>
                  <Input
                    type="number"
                    min="1" max="8" step="1"
                    value={pawConfig.windowWeeksBefore}
                    onChange={(e) => setPAWConfig(prev => ({ ...prev, windowWeeksBefore: parseInt(e.target.value) || 4 }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  QBM protocol: 2–4 weeks. Longer windows risk overstressing the plant.
                </p>
              </CardContent>
            </Card>

            {/* Schedule Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Protocol Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">H₂O₂ target</span>
                  <span className="font-medium">{pawConfig.targetH2O2Um} µM</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frequency</span>
                  <span className="font-medium">{pawConfig.applicationsPerWeek}× per week</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Irrigation volume</span>
                  <span className="font-medium">{pawConfig.volumePercent}%</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PAW window</span>
                  <span className="font-medium">Final {pawConfig.windowWeeksBefore} weeks</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total applications</span>
                  <span className="font-medium">{pawConfig.applicationsPerWeek * pawConfig.windowWeeksBefore} sessions</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save PAW */}
          <div className="flex justify-end">
            <Button onClick={() => {
              localStorage.setItem("qbm-hydronet-paw-config", JSON.stringify(pawConfig))
              toast({ title: "PAW Protocol Saved", description: `H₂O₂ ${pawConfig.targetH2O2Um} µM · ${pawConfig.applicationsPerWeek}×/wk · ${pawConfig.windowWeeksBefore} weeks before harvest` })
            }} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save PAW Protocol
            </Button>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════ */}
        {/* QBM TAB: LED Spectrum                   */}
        {/* ═══════════════════════════════════════ */}
        <TabsContent value="led" className="mt-6 space-y-6">
          <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-300">
                <Sun className="h-5 w-5" />
                LED Spectrum Optimisation
              </CardTitle>
              <CardDescription>
                Red 660 nm drives photosynthesis. Blue 450 nm controls morphology and secondary metabolite
                pathway genes. Turmeric uses 1:1 ratio; chilies use 2:1 Red:Blue.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Crop Preset Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Load Crop Preset</CardTitle>
              <CardDescription>Auto-fill the correct spectrum for your QBM crop.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={ledConfig.cropPreset}
                onValueChange={(cropId) => {
                  const preset = LED_PRESETS[cropId]
                  if (preset) {
                    setLEDConfig({ ...preset, cropPreset: cropId })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a crop preset…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LED_PRESETS).map(([id, p]) => (
                    <SelectItem key={id} value={id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Red + Blue */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Spectrum Channels (%)</CardTitle>
                <CardDescription>Red 660 nm + Blue 450 nm. Sum should be ≤ 100%.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                    Red 660 nm — {ledConfig.red660}%
                  </Label>
                  <Input
                    type="range" min="0" max="100" step="5"
                    value={ledConfig.red660}
                    onChange={(e) => setLEDConfig(prev => ({ ...prev, red660: parseInt(e.target.value) }))}
                    className="accent-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                    Blue 450 nm — {ledConfig.blue450}%
                  </Label>
                  <Input
                    type="range" min="0" max="100" step="5"
                    value={ledConfig.blue450}
                    onChange={(e) => setLEDConfig(prev => ({ ...prev, blue450: parseInt(e.target.value) }))}
                    className="accent-blue-500"
                  />
                </div>
                <div className="text-sm font-medium flex justify-between">
                  <span>R:B Ratio</span>
                  <span>{ledConfig.blue450 > 0 ? (ledConfig.red660 / ledConfig.blue450).toFixed(2) : "—"} : 1</span>
                </div>
                {/* Visual bar */}
                <div className="h-4 rounded overflow-hidden flex">
                  <div className="bg-red-500" style={{ width: `${ledConfig.red660}%` }} />
                  <div className="bg-blue-500" style={{ width: `${ledConfig.blue450}%` }} />
                  <div className="bg-gray-200 flex-1" />
                </div>
              </CardContent>
            </Card>

            {/* PPFD + Photoperiod */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Intensity & Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>PPFD Target (µmol/m²/s)</Label>
                  <Input
                    type="number" min="50" max="1000" step="10"
                    value={ledConfig.ppfd}
                    onChange={(e) => setLEDConfig(prev => ({ ...prev, ppfd: parseInt(e.target.value) || 300 }))}
                  />
                  <p className="text-xs text-muted-foreground">Turmeric: 300–400 · Chilies: 400–600</p>
                </div>
                <div className="space-y-1">
                  <Label>Photoperiod (hours/day)</Label>
                  <Input
                    type="number" min="8" max="20" step="1"
                    value={ledConfig.photoperiodHours}
                    onChange={(e) => setLEDConfig(prev => ({ ...prev, photoperiodHours: parseInt(e.target.value) || 14 }))}
                  />
                  <p className="text-xs text-muted-foreground">Turmeric: 14 h · Chilies: 16 h</p>
                </div>
                <Separator />
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily Light Integral</span>
                    <span className="font-medium">
                      {((ledConfig.ppfd * ledConfig.photoperiodHours * 3600) / 1_000_000).toFixed(1)} mol/m²/d
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save LED */}
          <div className="flex justify-end">
            <Button onClick={() => {
              localStorage.setItem("qbm-hydronet-led-config", JSON.stringify(ledConfig))
              toast({ title: "LED Spectrum Saved", description: `R660 ${ledConfig.red660}% · B450 ${ledConfig.blue450}% · ${ledConfig.ppfd} µmol/m²/s · ${ledConfig.photoperiodHours}h` })
            }} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save LED Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alert Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Alert System Configuration
          </CardTitle>
          <CardDescription>
            How the alert system works with your configured ranges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-800">Optimal Range</span>
              </div>
              <p className="text-sm text-green-700">
                Values within your set minimum and maximum ranges. No alerts triggered.
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="font-medium text-yellow-800">Warning Zone</span>
              </div>
              <p className="text-sm text-yellow-700">
                Values outside optimal range by ±2. Yellow warning alerts triggered.
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-red-50 border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="font-medium text-red-800">Critical Zone</span>
              </div>
              <p className="text-sm text-red-700">
                Values outside optimal range by ±4. Red critical alerts triggered.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
