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
import { Settings, Thermometer, Droplets, Zap, TestTube, Leaf, ArrowUpDown, Save, RotateCcw } from "lucide-react"
import { useState, useEffect } from "react"
import { redirect } from "next/navigation"

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
  phosphorus: { min: 30, max: 50 },
  potassium: { min: 200, max: 300 },
  calcium: { min: 150, max: 200 },
  magnesium: { min: 50, max: 75 },
  iron: { min: 2, max: 5 },
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
  const [selectedDevice, setSelectedDevice] = useState<string>("all")

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="environmental" className="flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            Environmental
          </TabsTrigger>
          <TabsTrigger value="chemical" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Chemical
          </TabsTrigger>
          <TabsTrigger value="nutrients" className="flex items-center gap-2">
            <Leaf className="h-4 w-4" />
            Nutrients
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
