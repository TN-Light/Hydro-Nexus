"use client"

import { useAuth } from "@/components/auth-provider"
import { useRealtime } from "@/components/realtime-provider"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  FlaskConical,
  Droplets,
  Sun,
  Thermometer,
  Calendar,
  Target,
  Zap,
  Leaf,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  TrendingUp,
  BarChart3,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { redirect } from "next/navigation"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PAWApplication {
  id: string
  date: string
  h2o2_um: number
  volumePercent: number
  appliedBy: string
}

interface StressProtocolConfig {
  // PAW
  pawEnabled: boolean
  pawH2O2Min: number // µM
  pawH2O2Max: number // µM
  pawVolumePercent: number // 5-10%
  pawFrequency: "2x_week" | "3x_week" | "daily"
  pawStartWeeksBefore: number // 2-4 weeks before harvest
  pawApplications: PAWApplication[]
  // Nutrient restriction
  phosphorusTargetMin: number // ppm
  phosphorusTargetMax: number // ppm
  ecTargetMin: number
  ecTargetMax: number
  phTargetMin: number
  phTargetMax: number
  // LED
  ledEnabled: boolean
  ledRedNm: number
  ledBlueNm: number
  ledRatio: string // "1:1" etc
  ledIntensityMin: number // µmol/m²/s
  ledIntensityMax: number
  ledPhotoperiodHours: number
  // GDD / Harvest
  cropType: "turmeric" | "chili"
  plantingDate: string // ISO date
  gddTarget: number // total GDD to harvest
  gddBase: number // base temp for GDD calc
  // Calibration
  phOffset: number
  ecOffset: number
  tempOffset: number
}

const DEFAULT_CONFIG: StressProtocolConfig = {
  pawEnabled: true,
  pawH2O2Min: 20,
  pawH2O2Max: 50,
  pawVolumePercent: 7,
  pawFrequency: "2x_week",
  pawStartWeeksBefore: 3,
  pawApplications: [],
  phosphorusTargetMin: 40,
  phosphorusTargetMax: 60,
  ecTargetMin: 1.2,
  ecTargetMax: 2.4,
  phTargetMin: 5.5,
  phTargetMax: 6.5,
  ledEnabled: true,
  ledRedNm: 660,
  ledBlueNm: 450,
  ledRatio: "1:1",
  ledIntensityMin: 200,
  ledIntensityMax: 300,
  ledPhotoperiodHours: 16,
  cropType: "turmeric",
  plantingDate: new Date().toISOString().split("T")[0],
  gddTarget: 3000,
  gddBase: 15,
  phOffset: 0,
  ecOffset: 0,
  tempOffset: 0,
}

const STORAGE_KEY = "qbm-stress-protocol"

function loadConfig(): StressProtocolConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

function saveConfig(config: StressProtocolConfig) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

/** Load stress-protocol config from DB (falls back to localStorage) */
async function loadConfigFromDB(): Promise<StressProtocolConfig | null> {
  try {
    const res = await fetch('/api/user/preferences', { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    const custom = data.preferences?.custom_settings
    if (custom?.stressProtocol) {
      return { ...DEFAULT_CONFIG, ...custom.stressProtocol }
    }
  } catch { /* ignore */ }
  return null
}

/** Save stress-protocol config to DB (alongside localStorage) */
async function saveConfigToDB(config: StressProtocolConfig) {
  try {
    await fetch('/api/user/preferences', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        custom_settings: { stressProtocol: config },
      }),
    })
  } catch { /* silent — localStorage is the fallback */ }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GaugeRing({ value, min, max, label, unit, color }: {
  value: number | undefined
  min: number
  max: number
  label: string
  unit: string
  color: string
}) {
  const v = value ?? 0
  const inRange = v >= min && v <= max
  const pct = Math.min(100, Math.max(0, ((v - (min - (max - min) * 0.3)) / ((max + (max - min) * 0.3) - (min - (max - min) * 0.3))) * 100))

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={inRange ? color : "#ef4444"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${pct * 2.64} ${264 - pct * 2.64}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold">{value?.toFixed(1) ?? "—"}</span>
          <span className="text-[10px] text-muted-foreground">{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-muted-foreground">{min}–{max} {unit}</div>
        {value !== undefined && (
          <Badge variant={inRange ? "default" : "destructive"} className="text-[9px] mt-1 px-1.5 py-0">
            {inRange ? "In Range" : "Out of Range"}
          </Badge>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function StressProtocolPage() {
  const { user, isLoading } = useAuth()
  const { sensorData, isConnected } = useRealtime()
  const { toast } = useToast()

  const [config, setConfig] = useState<StressProtocolConfig>(DEFAULT_CONFIG)
  const [mounted, setMounted] = useState(false)

  // Load from DB first, fall back to localStorage
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Try DB first (survives re-login / device change)
      const dbConfig = await loadConfigFromDB()
      if (!cancelled && dbConfig) {
        setConfig(dbConfig)
        saveConfig(dbConfig) // sync localStorage with DB value
      } else if (!cancelled) {
        // Fall back to localStorage
        setConfig(loadConfig())
      }
      if (!cancelled) setMounted(true)
    })()
    return () => { cancelled = true }
  }, [])

  // Persist changes to both localStorage AND DB
  const updateConfig = useCallback((patch: Partial<StressProtocolConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch }
      saveConfig(next)
      saveConfigToDB(next) // async, fire-and-forget
      return next
    })
  }, [])

  useEffect(() => {
    if (!isLoading && !user) redirect("/login")
  }, [user, isLoading])

  // Aggregate live sensor values from first & last bag
  const liveSensors = useMemo(() => {
    const bag1 = sensorData["grow-bag-1"]
    const bag6 = sensorData["grow-bag-6"]
    const avg = (a?: number, b?: number) => {
      if (a !== undefined && b !== undefined) return (a + b) / 2
      return a ?? b
    }
    return {
      temperature: avg(bag1?.roomTemp, bag6?.roomTemp),
      humidity: avg(bag1?.humidity, bag6?.humidity),
      ph: avg(bag1?.pH, bag6?.pH),
      ec: avg(bag1?.ec, bag6?.ec),
      moisture: avg(bag1?.moisture ?? bag1?.substrate_moisture, bag6?.moisture ?? bag6?.substrate_moisture),
      tds: avg(bag1?.tds_ppm, bag6?.tds_ppm),
    }
  }, [sensorData])

  // GDD calculation
  const gddAccumulated = useMemo(() => {
    if (!config.plantingDate) return 0
    const plantDate = new Date(config.plantingDate)
    const now = new Date()
    const daysPassed = Math.max(0, Math.floor((now.getTime() - plantDate.getTime()) / 86400000))
    // Use current temp as representative daily avg (simplified — real system would use logged daily averages)
    const avgTemp = liveSensors.temperature ?? 28
    const dailyGDD = Math.max(0, avgTemp - config.gddBase)
    return Math.round(daysPassed * dailyGDD)
  }, [config.plantingDate, config.gddBase, liveSensors.temperature])

  const gddProgress = Math.min(100, (gddAccumulated / config.gddTarget) * 100)

  // Estimated harvest date
  const estimatedHarvest = useMemo(() => {
    if (!config.plantingDate) return null
    const avgTemp = liveSensors.temperature ?? 28
    const dailyGDD = Math.max(0.1, avgTemp - config.gddBase)
    const remainingGDD = Math.max(0, config.gddTarget - gddAccumulated)
    const daysRemaining = Math.ceil(remainingGDD / dailyGDD)
    const harvestDate = new Date()
    harvestDate.setDate(harvestDate.getDate() + daysRemaining)
    return { date: harvestDate, daysRemaining }
  }, [config.plantingDate, config.gddTarget, config.gddBase, gddAccumulated, liveSensors.temperature])

  // Stress protocol window
  const stressWindowActive = useMemo(() => {
    if (!estimatedHarvest) return false
    return estimatedHarvest.daysRemaining <= config.pawStartWeeksBefore * 7
  }, [estimatedHarvest, config.pawStartWeeksBefore])

  // Log a PAW application
  const logPAWApplication = useCallback(() => {
    const application: PAWApplication = {
      id: Date.now().toString(36),
      date: new Date().toISOString(),
      h2o2_um: (config.pawH2O2Min + config.pawH2O2Max) / 2,
      volumePercent: config.pawVolumePercent,
      appliedBy: user?.username ?? "operator",
    }
    updateConfig({
      pawApplications: [...config.pawApplications, application],
    })
    toast({
      title: "PAW Application Logged",
      description: `H₂O₂: ${application.h2o2_um}µM, Volume: ${application.volumePercent}%`,
    })
  }, [config, updateConfig, user, toast])

  // Send calibration to ESP32
  const handleCalibrationSave = useCallback(async () => {
    try {
      const targets = ["grow-bag-1", "grow-bag-6"]
      await Promise.all(
        targets.map(deviceId =>
          fetch(`/api/devices/${deviceId}/commands`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update_settings",
              parameters: {
                settings: {
                  ph_offset: config.phOffset,
                  ec_offset: config.ecOffset,
                  temp_offset: config.tempOffset,
                },
              },
              priority: "normal",
            }),
          })
        )
      )
      toast({ title: "Calibration Sent", description: "Offsets will apply on next ESP32 poll (~30s)." })
    } catch {
      toast({ title: "Failed", description: "Could not send calibration.", variant: "destructive" })
    }
  }, [config.phOffset, config.ecOffset, config.tempOffset, toast])

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    )
  }
  if (!user) return null

  const phosphorusEstimate = liveSensors.ec
    ? Math.round(liveSensors.ec * 25) // rough P ppm estimate from EC
    : undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="h-8 w-8 text-purple-500" />
            Stress Protocol
          </h1>
          <p className="text-muted-foreground">
            PAW dosing, nutrient restriction, LED spectrum &amp; harvest tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={isConnected ? "border-green-500 text-green-500" : "border-red-500 text-red-500"}
          >
            {isConnected ? "Live Data" : "Offline"}
          </Badge>
          {stressWindowActive && (
            <Badge className="bg-purple-600 text-white animate-pulse">
              <Zap className="h-3 w-3 mr-1" />
              Stress Window Active
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="paw" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="paw" className="gap-1">
            <Droplets className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PAW</span>
          </TabsTrigger>
          <TabsTrigger value="nutrients" className="gap-1">
            <Target className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nutrients</span>
          </TabsTrigger>
          <TabsTrigger value="led" className="gap-1">
            <Sun className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">LED</span>
          </TabsTrigger>
          <TabsTrigger value="harvest" className="gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Harvest</span>
          </TabsTrigger>
          <TabsTrigger value="calibration" className="gap-1">
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Calibration</span>
          </TabsTrigger>
        </TabsList>

        {/* ============================================== */}
        {/* TAB: PAW Schedule                              */}
        {/* ============================================== */}
        <TabsContent value="paw" className="space-y-4">
          {/* Status card */}
          <Card className={stressWindowActive ? "border-purple-500/50 bg-purple-500/5" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-purple-500" />
                    Plasma-Activated Water (PAW) Schedule
                  </CardTitle>
                  <CardDescription>
                    Controlled oxidative stress to upregulate secondary metabolite pathways
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="paw-toggle" className="text-sm">Enabled</Label>
                  <Switch
                    id="paw-toggle"
                    checked={config.pawEnabled}
                    onCheckedChange={(v) => updateConfig({ pawEnabled: v })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* H₂O₂ concentration */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-1.5">
                    <FlaskConical className="h-3.5 w-3.5 text-purple-500" />
                    H₂O₂ Concentration
                  </Label>
                  <div className="text-2xl font-bold text-purple-600">
                    {config.pawH2O2Min}–{config.pawH2O2Max} µM
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Min: {config.pawH2O2Min} µM</span>
                      <span>Max: {config.pawH2O2Max} µM</span>
                    </div>
                    <Slider
                      value={[config.pawH2O2Min, config.pawH2O2Max]}
                      min={10}
                      max={80}
                      step={5}
                      onValueChange={([min, max]) => updateConfig({ pawH2O2Min: min, pawH2O2Max: max })}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Safe range: 20–50 µM. Below 20 µM has no effect; above 60 µM risks AMF damage.
                  </p>
                </div>

                {/* Volume % */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-1.5">
                    <Droplets className="h-3.5 w-3.5 text-blue-500" />
                    PAW Volume (% of irrigation)
                  </Label>
                  <div className="text-2xl font-bold text-blue-600">{config.pawVolumePercent}%</div>
                  <Slider
                    value={[config.pawVolumePercent]}
                    min={3}
                    max={15}
                    step={1}
                    onValueChange={([v]) => updateConfig({ pawVolumePercent: v })}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Recommended: 5–10% of total irrigation volume
                  </p>
                </div>

                {/* Frequency & timing */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-green-500" />
                    Application Schedule
                  </Label>
                  <Select
                    value={config.pawFrequency}
                    onValueChange={(v) => updateConfig({ pawFrequency: v as StressProtocolConfig["pawFrequency"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2x_week">2× per week (recommended)</SelectItem>
                      <SelectItem value="3x_week">3× per week</SelectItem>
                      <SelectItem value="daily">Daily (aggressive)</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="space-y-1">
                    <Label className="text-xs">Start before harvest (weeks)</Label>
                    <Slider
                      value={[config.pawStartWeeksBefore]}
                      min={1}
                      max={6}
                      step={1}
                      onValueChange={([v]) => updateConfig({ pawStartWeeksBefore: v })}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Currently: {config.pawStartWeeksBefore} weeks before harvest. Recommended: 2–4 weeks.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Log Application */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-sm">Log PAW Application</h4>
                  <p className="text-xs text-muted-foreground">
                    Record each PAW dose for the Quality Certificate audit trail
                  </p>
                </div>
                <Button
                  onClick={logPAWApplication}
                  disabled={!config.pawEnabled}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Log Application Now
                </Button>
              </div>

              {/* Application History */}
              {config.pawApplications.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Application History ({config.pawApplications.length})</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateConfig({ pawApplications: [] })}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" /> Clear
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                    {[...config.pawApplications].reverse().map((app) => (
                      <div key={app.id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Droplets className="h-3 w-3 text-purple-500" />
                          <span className="font-mono">
                            {new Date(app.date).toLocaleDateString()} {new Date(app.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>{app.h2o2_um} µM</span>
                          <span>{app.volumePercent}%</span>
                          <span>{app.appliedBy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================== */}
        {/* TAB: Nutrient Protocol                         */}
        {/* ============================================== */}
        <TabsContent value="nutrients" className="space-y-4">
          {/* Live Gauges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                Forced Symbiosis — Nutrient Restriction
              </CardTitle>
              <CardDescription>
                Low-P strategy forces AMF colonization. Monitor live readings against target ranges.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Live reading gauges */}
              <div className="flex flex-wrap justify-center gap-8">
                <GaugeRing
                  value={liveSensors.ph}
                  min={config.phTargetMin}
                  max={config.phTargetMax}
                  label="pH"
                  unit=""
                  color="#22c55e"
                />
                <GaugeRing
                  value={liveSensors.ec}
                  min={config.ecTargetMin}
                  max={config.ecTargetMax}
                  label="EC"
                  unit="mS/cm"
                  color="#3b82f6"
                />
                <GaugeRing
                  value={phosphorusEstimate}
                  min={config.phosphorusTargetMin}
                  max={config.phosphorusTargetMax}
                  label="Phosphorus (est.)"
                  unit="ppm"
                  color="#a855f7"
                />
                <GaugeRing
                  value={liveSensors.moisture}
                  min={40}
                  max={75}
                  label="Substrate Moisture"
                  unit="%"
                  color="#06b6d4"
                />
              </div>

              <Separator />

              {/* Target configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Phosphorus Target (ppm)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="5"
                      value={config.phosphorusTargetMin}
                      onChange={(e) => updateConfig({ phosphorusTargetMin: Number(e.target.value) })}
                      className="w-20"
                    />
                    <span className="self-center text-muted-foreground">–</span>
                    <Input
                      type="number"
                      step="5"
                      value={config.phosphorusTargetMax}
                      onChange={(e) => updateConfig({ phosphorusTargetMax: Number(e.target.value) })}
                      className="w-20"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Standard hydro: 110–120. QBM restricts to 40–60.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">EC Target (mS/cm)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={config.ecTargetMin}
                      onChange={(e) => updateConfig({ ecTargetMin: Number(e.target.value) })}
                      className="w-20"
                    />
                    <span className="self-center text-muted-foreground">–</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.ecTargetMax}
                      onChange={(e) => updateConfig({ ecTargetMax: Number(e.target.value) })}
                      className="w-20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">pH Target</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={config.phTargetMin}
                      onChange={(e) => updateConfig({ phTargetMin: Number(e.target.value) })}
                      className="w-20"
                    />
                    <span className="self-center text-muted-foreground">–</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.phTargetMax}
                      onChange={(e) => updateConfig({ phTargetMax: Number(e.target.value) })}
                      className="w-20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Current TDS</Label>
                  <div className="text-2xl font-bold text-foreground">
                    {liveSensors.tds?.toFixed(0) ?? "—"} <span className="text-sm font-normal text-muted-foreground">ppm</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Total Dissolved Solids from ESP32 TDS sensor</p>
                </div>
              </div>

              {/* Compliance Alert */}
              {liveSensors.ec !== undefined && (
                <div className={`rounded-lg p-3 flex items-center gap-3 ${
                  phosphorusEstimate !== undefined && phosphorusEstimate >= config.phosphorusTargetMin && phosphorusEstimate <= config.phosphorusTargetMax
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                }`}>
                  {phosphorusEstimate !== undefined && phosphorusEstimate >= config.phosphorusTargetMin && phosphorusEstimate <= config.phosphorusTargetMax ? (
                    <>
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">Phosphorus Within Target</div>
                        <div className="text-xs opacity-80">AMF symbiosis conditions are being enforced correctly</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">Phosphorus Outside Target Range</div>
                        <div className="text-xs opacity-80">
                          Estimated {phosphorusEstimate ?? "?"} ppm — target is {config.phosphorusTargetMin}–{config.phosphorusTargetMax} ppm. 
                          Adjust nutrient solution concentration.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================== */}
        {/* TAB: LED Spectrum                              */}
        {/* ============================================== */}
        <TabsContent value="led" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sun className="h-5 w-5 text-amber-500" />
                    LED Spectrum Control
                  </CardTitle>
                  <CardDescription>
                    Photosynthetic quantum yield optimization via targeted spectral tuning
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="led-toggle" className="text-sm">Enabled</Label>
                  <Switch
                    id="led-toggle"
                    checked={config.ledEnabled}
                    onCheckedChange={(v) => updateConfig({ ledEnabled: v })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Spectrum visual */}
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div
                    className="w-20 h-20 rounded-full shadow-lg mx-auto mb-2"
                    style={{
                      background: `radial-gradient(circle, rgba(255,20,20,0.8), rgba(255,20,20,0.2))`,
                      boxShadow: "0 0 30px rgba(255,20,20,0.4)",
                    }}
                  />
                  <div className="text-sm font-semibold text-red-500">{config.ledRedNm} nm</div>
                  <div className="text-xs text-muted-foreground">Red</div>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">
                  {config.ledRatio}
                </div>
                <div className="text-center">
                  <div
                    className="w-20 h-20 rounded-full shadow-lg mx-auto mb-2"
                    style={{
                      background: `radial-gradient(circle, rgba(40,40,255,0.8), rgba(40,40,255,0.2))`,
                      boxShadow: "0 0 30px rgba(40,40,255,0.4)",
                    }}
                  />
                  <div className="text-sm font-semibold text-blue-500">{config.ledBlueNm} nm</div>
                  <div className="text-xs text-muted-foreground">Blue</div>
                </div>
              </div>

              <Separator />

              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs">Crop Preset</Label>
                  <Select
                    value={config.cropType}
                    onValueChange={(v) => {
                      const presets = {
                        turmeric: { ledRatio: "1:1", ledIntensityMin: 200, ledIntensityMax: 300, ledPhotoperiodHours: 16, gddTarget: 3000, gddBase: 15 },
                        chili: { ledRatio: "2:1", ledIntensityMin: 250, ledIntensityMax: 400, ledPhotoperiodHours: 14, gddTarget: 2200, gddBase: 10 },
                      }
                      updateConfig({ cropType: v as "turmeric" | "chili", ...presets[v as keyof typeof presets] })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="turmeric">
                        <div className="flex items-center gap-2"><Leaf className="h-3.5 w-3.5 text-yellow-600" /> Turmeric (Curcuma longa)</div>
                      </SelectItem>
                      <SelectItem value="chili">
                        <div className="flex items-center gap-2"><Leaf className="h-3.5 w-3.5 text-red-600" /> Chili (Capsicum spp.)</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Red:Blue Ratio</Label>
                  <Select
                    value={config.ledRatio}
                    onValueChange={(v) => updateConfig({ ledRatio: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">1:1 (balanced — turmeric)</SelectItem>
                      <SelectItem value="2:1">2:1 (red-dominant — fruiting)</SelectItem>
                      <SelectItem value="3:1">3:1 (heavy red — flowering)</SelectItem>
                      <SelectItem value="1:2">1:2 (blue-dominant — vegetative)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Intensity (µmol/m²/s)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={config.ledIntensityMin}
                      onChange={(e) => updateConfig({ ledIntensityMin: Number(e.target.value) })}
                      className="w-20"
                    />
                    <span className="self-center text-muted-foreground">–</span>
                    <Input
                      type="number"
                      value={config.ledIntensityMax}
                      onChange={(e) => updateConfig({ ledIntensityMax: Number(e.target.value) })}
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Photoperiod</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[config.ledPhotoperiodHours]}
                      min={8}
                      max={20}
                      step={1}
                      onValueChange={([v]) => updateConfig({ ledPhotoperiodHours: v })}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold w-12 text-right">{config.ledPhotoperiodHours}h</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Sun className="h-3 w-3 text-amber-500" />
                    {config.ledPhotoperiodHours}h light / {24 - config.ledPhotoperiodHours}h dark
                  </div>
                </div>
              </div>

              {/* Info banner */}
              <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                <strong>Spectral synergy:</strong> During the final stress window, the LED spectrum accelerates
                secondary metabolite biosynthesis (phenylpropanoid / jasmonic acid pathways) alongside PAW application.
                {config.cropType === "turmeric"
                  ? " For Turmeric: maintain 1:1 R:B at 200–300 µmol/m²/s for optimal curcumin accumulation."
                  : " For Chili: use 2:1 R:B at 250–400 µmol/m²/s to maximize capsaicin production during fruiting."
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================== */}
        {/* TAB: GDD Harvest Tracker                       */}
        {/* ============================================== */}
        <TabsContent value="harvest" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* GDD Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Growing Degree Days (GDD)
                </CardTitle>
                <CardDescription>
                  Accumulated heat units since planting — predicts harvest maturity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-black text-foreground">
                    {gddAccumulated.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    of {config.gddTarget.toLocaleString()} GDD target
                  </div>
                </div>
                <Progress value={gddProgress} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Planted: {config.plantingDate || "Not set"}</span>
                  <span>{gddProgress.toFixed(1)}% complete</span>
                </div>

                {/* Planting config */}
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Planting Date</Label>
                    <Input
                      type="date"
                      value={config.plantingDate}
                      onChange={(e) => updateConfig({ plantingDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">GDD Target</Label>
                    <Input
                      type="number"
                      value={config.gddTarget}
                      onChange={(e) => updateConfig({ gddTarget: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Base Temp (°C)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={config.gddBase}
                      onChange={(e) => updateConfig({ gddBase: Number(e.target.value) })}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {config.cropType === "turmeric" ? "Turmeric: 15°C" : "Chili: 10°C"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Current Avg Temp</Label>
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-orange-500" />
                      <span className="text-lg font-bold">{liveSensors.temperature?.toFixed(1) ?? "—"}°C</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Daily GDD: {liveSensors.temperature ? Math.max(0, liveSensors.temperature - config.gddBase).toFixed(1) : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Harvest Countdown */}
            <Card className={stressWindowActive ? "border-purple-500/50" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  Harvest Countdown
                </CardTitle>
                <CardDescription>
                  Estimated time to harvest and stress window activation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {estimatedHarvest ? (
                  <>
                    <div className="text-center space-y-1">
                      <div className="text-5xl font-black text-foreground">
                        {estimatedHarvest.daysRemaining}
                      </div>
                      <div className="text-sm text-muted-foreground">days remaining</div>
                      <div className="text-xs text-muted-foreground">
                        Est. harvest: {estimatedHarvest.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>

                    <Separator />

                    {/* Timeline */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${stressWindowActive ? "bg-purple-500 animate-pulse" : "bg-muted-foreground/30"}`} />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Stress Window</div>
                          <div className="text-xs text-muted-foreground">
                            Starts {config.pawStartWeeksBefore * 7} days before harvest
                            {stressWindowActive ? " — ACTIVE NOW" : ` — in ${Math.max(0, estimatedHarvest.daysRemaining - config.pawStartWeeksBefore * 7)} days`}
                          </div>
                        </div>
                        <Badge variant={stressWindowActive ? "default" : "outline"} className={stressWindowActive ? "bg-purple-600" : ""}>
                          {stressWindowActive ? "Active" : "Pending"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${gddProgress >= 100 ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                        <div className="flex-1">
                          <div className="text-sm font-medium">GDD Maturity</div>
                          <div className="text-xs text-muted-foreground">
                            {gddAccumulated.toLocaleString()} / {config.gddTarget.toLocaleString()} GDD
                          </div>
                        </div>
                        <Badge variant={gddProgress >= 100 ? "default" : "outline"}>
                          {gddProgress >= 100 ? "Ready" : `${gddProgress.toFixed(0)}%`}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${config.pawApplications.length > 0 ? "bg-purple-500" : "bg-muted-foreground/30"}`} />
                        <div className="flex-1">
                          <div className="text-sm font-medium">PAW Applications</div>
                          <div className="text-xs text-muted-foreground">
                            {config.pawApplications.length} doses logged
                          </div>
                        </div>
                        <Badge variant="outline">{config.pawApplications.length}</Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Set a planting date to begin tracking</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================== */}
        {/* TAB: Calibration                               */}
        {/* ============================================== */}
        <TabsContent value="calibration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-500" />
                Sensor Calibration
              </CardTitle>
              <CardDescription>
                Offset values are sent to both ESP32 controllers (grow-bag-1 &amp; grow-bag-6)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cal-ph">pH Offset</Label>
                  <Input
                    id="cal-ph"
                    type="number"
                    step="0.1"
                    value={config.phOffset}
                    onChange={(e) => updateConfig({ phOffset: Number(e.target.value) })}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Current reading: {liveSensors.ph?.toFixed(2) ?? "—"}. 
                    Corrected: {liveSensors.ph ? (liveSensors.ph + config.phOffset).toFixed(2) : "—"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cal-ec">EC Offset (mS/cm)</Label>
                  <Input
                    id="cal-ec"
                    type="number"
                    step="0.1"
                    value={config.ecOffset}
                    onChange={(e) => updateConfig({ ecOffset: Number(e.target.value) })}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Current reading: {liveSensors.ec?.toFixed(2) ?? "—"}.
                    Corrected: {liveSensors.ec ? (liveSensors.ec + config.ecOffset).toFixed(2) : "—"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cal-temp">Temperature Offset (°C)</Label>
                  <Input
                    id="cal-temp"
                    type="number"
                    step="0.1"
                    value={config.tempOffset}
                    onChange={(e) => updateConfig({ tempOffset: Number(e.target.value) })}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Current reading: {liveSensors.temperature?.toFixed(1) ?? "—"}°C.
                    Corrected: {liveSensors.temperature ? (liveSensors.temperature + config.tempOffset).toFixed(1) : "—"}°C
                  </p>
                </div>
              </div>

              <Button onClick={handleCalibrationSave} className="w-full" variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Send Calibration to Both ESP32s
              </Button>

              {/* Hardware pin reference (collapsed) */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  ESP32 Pin Reference ▸
                </summary>
                <div className="mt-3 overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Component</th>
                        <th className="px-3 py-2 text-left font-medium">Pin</th>
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr><td className="px-3 py-1.5">DHT11</td><td className="px-3 py-1.5"><Badge variant="outline" className="text-[10px]">P4</Badge></td><td className="px-3 py-1.5">Temperature + Humidity</td></tr>
                      <tr><td className="px-3 py-1.5">TDS Sensor</td><td className="px-3 py-1.5"><Badge variant="outline" className="text-[10px]">P13</Badge></td><td className="px-3 py-1.5">EC / PPM (nutrient concentration)</td></tr>
                      <tr><td className="px-3 py-1.5">Soil Moisture</td><td className="px-3 py-1.5"><Badge variant="outline" className="text-[10px]">P12</Badge></td><td className="px-3 py-1.5">Substrate moisture (0-100%)</td></tr>
                      <tr><td className="px-3 py-1.5">pH Sensor</td><td className="px-3 py-1.5"><Badge variant="outline" className="text-[10px]">P34</Badge></td><td className="px-3 py-1.5">pH level (ADC1)</td></tr>
                      <tr className="bg-green-500/5"><td className="px-3 py-1.5 text-green-600 font-medium">Nutrition Pump</td><td className="px-3 py-1.5"><Badge className="bg-green-600 text-[10px]">P19</Badge></td><td className="px-3 py-1.5">Nutrient solution relay</td></tr>
                      <tr className="bg-purple-500/5"><td className="px-3 py-1.5 text-purple-600 font-medium">PAW Pump</td><td className="px-3 py-1.5"><Badge className="bg-purple-600 text-[10px]">P22</Badge></td><td className="px-3 py-1.5">Plasma Activated Water relay</td></tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
