"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { FlaskConical, Waves, Power, Loader2, StopCircle, Timer, Droplets, Clock, Play, AlertTriangle, Square } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickActionsProps {
  selectedGrowBag: string
}

export function QuickActions({ selectedGrowBag }: QuickActionsProps) {
  const [nutrientPumpOn, setNutrientPumpOn] = useState(false)
  const [pawPumpOn, setPawPumpOn] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [loadingPump, setLoadingPump] = useState<"nutrient" | "paw" | null>(null)
  const [lastCommandTime, setLastCommandTime] = useState<Record<string, Date>>({})
  const [nutrientDuration, setNutrientDuration] = useState(30) // seconds
  const [pawDuration, setPawDuration] = useState(30) // seconds
  const [nutrientCountdown, setNutrientCountdown] = useState(0)
  const [pawCountdown, setPawCountdown] = useState(0)
  const [nutrientPending, setNutrientPending] = useState(false) // waiting for ESP32 to pick up command
  const [pawPending, setPawPending] = useState(false)
  const nutrientTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pawTimerRef = useRef<NodeJS.Timeout | null>(null)
  const nutrientPendingRef = useRef<NodeJS.Timeout | null>(null)
  const pawPendingRef = useRef<NodeJS.Timeout | null>(null)
  const [confirmStop, setConfirmStop] = useState<{ pump: "nutrient" | "paw"; remaining: number } | null>(null)
  const { toast } = useToast()

  const displayName = useMemo(
    () => selectedGrowBag.replace("grow-bag-", "Grow Bag "),
    [selectedGrowBag],
  )

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (nutrientTimerRef.current) clearInterval(nutrientTimerRef.current)
      if (pawTimerRef.current) clearInterval(pawTimerRef.current)
      if (nutrientPendingRef.current) clearTimeout(nutrientPendingRef.current)
      if (pawPendingRef.current) clearTimeout(pawPendingRef.current)
    }
  }, [])

  const startCountdown = useCallback((pump: "nutrient" | "paw", seconds: number) => {
    const setCountdown = pump === "nutrient" ? setNutrientCountdown : setPawCountdown
    const timerRef = pump === "nutrient" ? nutrientTimerRef : pawTimerRef
    const setPumpOn = pump === "nutrient" ? setNutrientPumpOn : setPawPumpOn
    const setPending = pump === "nutrient" ? setNutrientPending : setPawPending
    const pendingRef = pump === "nutrient" ? nutrientPendingRef : pawPendingRef

    // Clear any existing timers
    if (timerRef.current) clearInterval(timerRef.current)
    if (pendingRef.current) clearTimeout(pendingRef.current)

    // Phase 1: Show "Waiting for ESP32..." for ~5 seconds
    setPending(true)
    setPumpOn(true)
    setCountdown(seconds)

    pendingRef.current = setTimeout(() => {
      // Phase 2: ESP32 has picked up the command — start real countdown
      setPending(false)
      pendingRef.current = null
      setCountdown(seconds)

      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            timerRef.current = null
            setPumpOn(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, 5000) // 5s = ESP32 poll interval
  }, [])

  const sendCommand = useCallback(async (action: string, params: Record<string, unknown> = {}) => {
    setLoading(action)
    try {
      const res = await fetch(`/api/devices/${selectedGrowBag}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, parameters: params, priority: "high" }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }))
        const msg = res.status === 403 
          ? 'Insufficient permissions. Log out + log in again, or ask an admin to upgrade your role to operator.'
          : res.status === 401
          ? 'Not authenticated. Please log in again.'
          : errData.error || `Server error (HTTP ${res.status})`
        throw new Error(msg)
      }
      setLastCommandTime(prev => ({ ...prev, [action]: new Date() }))
      return true
    } catch (err: any) {
      toast({
        title: "Command Failed",
        description: err?.message || `Unable to send command to ${selectedGrowBag}. Check connection.`,
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(null)
    }
  }, [selectedGrowBag, toast])

  const forceStopPump = useCallback(async (pump: "nutrient" | "paw") => {
    const action = pump === "nutrient" ? "nutrient_pump_off" : "relay2_off"
    const ok = await sendCommand(action)
    if (ok) {
      const timerRef = pump === "nutrient" ? nutrientTimerRef : pawTimerRef
      const pendingRef = pump === "nutrient" ? nutrientPendingRef : pawPendingRef
      const setPumpOn = pump === "nutrient" ? setNutrientPumpOn : setPawPumpOn
      const setCountdown = pump === "nutrient" ? setNutrientCountdown : setPawCountdown
      const setPending = pump === "nutrient" ? setNutrientPending : setPawPending
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      if (pendingRef.current) { clearTimeout(pendingRef.current); pendingRef.current = null }
      setCountdown(0)
      setPumpOn(false)
      setPending(false)
      toast({
        title: `${pump === "nutrient" ? "Nutrition" : "PAW"} Pump OFF`,
        description: `Timer cancelled. Pump stopped on ${displayName}.`,
        variant: "destructive",
      })
    }
    setConfirmStop(null)
  }, [sendCommand, displayName, toast])

  const stopPump = useCallback(async (pump: "nutrient" | "paw") => {
    const countdown = pump === "nutrient" ? nutrientCountdown : pawCountdown
    if (countdown > 0) {
      setConfirmStop({ pump, remaining: countdown })
      return
    }
    await forceStopPump(pump)
  }, [nutrientCountdown, pawCountdown, forceStopPump])

  const startTimedDosing = useCallback(async (pump: "nutrient" | "paw") => {
    const duration = pump === "nutrient" ? nutrientDuration : pawDuration
    setLoadingPump(pump)
    const ok = await sendCommand("manual_dosing_cycle", {
      duration,
      pump_type: pump,
    })
    setLoadingPump(null)
    if (ok) {
      startCountdown(pump, duration)
      toast({
        title: `${pump === "nutrient" ? "Nutrition" : "PAW"} Pump — Timed Run`,
        description: `Running for ${formatDuration(duration)} on ${displayName}. Executes in ~5s.`,
      })
    }
  }, [nutrientDuration, pawDuration, sendCommand, startCountdown, displayName, toast])

  const emergencyStop = useCallback(async () => {
    const ok = await sendCommand("emergency_stop")
    if (ok) {
      // Clear all timers + pending timeouts
      if (nutrientTimerRef.current) { clearInterval(nutrientTimerRef.current); nutrientTimerRef.current = null }
      if (pawTimerRef.current) { clearInterval(pawTimerRef.current); pawTimerRef.current = null }
      if (nutrientPendingRef.current) { clearTimeout(nutrientPendingRef.current); nutrientPendingRef.current = null }
      if (pawPendingRef.current) { clearTimeout(pawPendingRef.current); pawPendingRef.current = null }
      setNutrientCountdown(0)
      setPawCountdown(0)
      setNutrientPumpOn(false)
      setPawPumpOn(false)
      setNutrientPending(false)
      setPawPending(false)
      setConfirmStop(null)
      toast({
        title: "Emergency Stop",
        description: "All pumps stopped immediately.",
        variant: "destructive",
      })
    }
  }, [sendCommand, toast])

  const isBusy = loading !== null

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Power className="h-5 w-5 text-green-500" />
              Pump Controls
            </CardTitle>
            <CardDescription className="mt-1">
              Control pumps for {displayName}
            </CardDescription>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={isBusy}
            onClick={emergencyStop}
            className="gap-1.5"
          >
            <StopCircle className="h-4 w-4" />
            Stop All
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── Nutrition Pump ──────────────────────────────────────────── */}
          <PumpCard
            title="Nutrition Pump"
            description="Nutrient solution + water for plants"
            icon={<FlaskConical className="h-6 w-6" />}
            isOn={nutrientPumpOn}
            isPending={nutrientPending}
            isLoading={loadingPump === "nutrient" || loading === "nutrient_pump_off" || loading === "nutrient_pump_on"}
            isBusy={isBusy}
            onStop={() => stopPump("nutrient")}
            onTimedStart={() => startTimedDosing("nutrient")}
            onToggleOn={async () => {
              const ok = await sendCommand("nutrient_pump_on")
              if (ok) { setNutrientPumpOn(true); toast({ title: "Nutrition Pump ON", description: `Started on ${displayName}. Executes in ~5s.` }) }
            }}
            duration={nutrientDuration}
            onDurationChange={setNutrientDuration}
            countdown={nutrientCountdown}
            colorOn="green"
            lastCommand={lastCommandTime["nutrient_pump_on"] || lastCommandTime["nutrient_pump_off"] || lastCommandTime["manual_dosing_cycle"]}
          />

          {/* ── PAW Pump ───────────────────────────────────────────────── */}
          <PumpCard
            title="PAW Pump"
            description="Plasma-Activated Water treatment"
            icon={<Waves className="h-6 w-6" />}
            isOn={pawPumpOn}
            isPending={pawPending}
            isLoading={loadingPump === "paw" || loading === "relay2_off" || loading === "relay2_on"}
            isBusy={isBusy}
            onStop={() => stopPump("paw")}
            onTimedStart={() => startTimedDosing("paw")}
            onToggleOn={async () => {
              const ok = await sendCommand("relay2_on")
              if (ok) { setPawPumpOn(true); toast({ title: "PAW Pump ON", description: `Started on ${displayName}. Executes in ~5s.` }) }
            }}
            duration={pawDuration}
            onDurationChange={setPawDuration}
            countdown={pawCountdown}
            colorOn="purple"
            lastCommand={lastCommandTime["relay2_on"] || lastCommandTime["relay2_off"] || lastCommandTime["manual_dosing_cycle"]}
          />
        </div>

        {/* Status Footer */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-green-500" />
              Nutrition: <span className="font-semibold text-foreground">{nutrientPumpOn ? (nutrientPending ? "Sending..." : nutrientCountdown > 0 ? formatDuration(nutrientCountdown) : "Running") : "Off"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Waves className="h-3.5 w-3.5 text-purple-500" />
              PAW: <span className="font-semibold text-foreground">{pawPumpOn ? (pawPending ? "Sending..." : pawCountdown > 0 ? formatDuration(pawCountdown) : "Running") : "Off"}</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            ESP32 polls every ~5s
          </span>
        </div>
      </CardContent>

      {/* ── Stop Confirmation Dialog ─────────────────────────────── */}
      <AlertDialog open={confirmStop !== null} onOpenChange={(open) => !open && setConfirmStop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Stop Pump Early?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  The <strong>{confirmStop?.pump === "nutrient" ? "Nutrition" : "PAW"} Pump</strong> is running on a timer.
                </p>
                <p className="text-base font-semibold text-foreground">
                  ⏱ {confirmStop ? formatDuration(confirmStop.remaining) : ""} remaining
                </p>
                <p>
                  Are you sure you want to stop it now? The pump will turn off immediately.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Running</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => confirmStop && forceStopPump(confirmStop.pump)}
            >
              Yes, Stop Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ─── Helper: format seconds to mm:ss ──────────────────────────────────────────

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs.toString().padStart(2, "0")}s`
}

// Duration presets in seconds
const DURATION_PRESETS = [
  { label: "10s", value: 10 },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "5m", value: 300 },
  { label: "10m", value: 600 },
]

// ─── PumpCard Sub-component ───────────────────────────────────────────────────

interface PumpCardProps {
  title: string
  description: string
  icon: React.ReactNode
  isOn: boolean
  isPending: boolean
  isLoading: boolean
  isBusy: boolean
  onStop: () => void
  onTimedStart: () => void
  onToggleOn: () => void
  duration: number
  onDurationChange: (val: number) => void
  countdown: number
  colorOn: "green" | "purple"
  lastCommand?: Date
}

function PumpCard({
  title,
  description,
  icon,
  isOn,
  isPending,
  isLoading,
  isBusy,
  onStop,
  onTimedStart,
  onToggleOn,
  duration,
  onDurationChange,
  countdown,
  colorOn,
  lastCommand,
}: PumpCardProps) {
  const [customMin, setCustomMin] = useState("")
  const [customSec, setCustomSec] = useState("")
  const colors = {
    green: {
      bg: "bg-green-500/10 border-green-500/30",
      bgOn: "bg-green-500/20 border-green-500/50 shadow-green-500/10 shadow-lg",
      icon: "text-green-500",
      badge: "bg-green-600",
      button: "bg-green-600 hover:bg-green-700 text-white",
      buttonOff: "bg-red-600 hover:bg-red-700 text-white",
      timedButton: "bg-emerald-600 hover:bg-emerald-700 text-white",
      glow: "shadow-green-500/20",
      preset: "border-green-500/40 hover:bg-green-500/20 data-[active=true]:bg-green-500/30 data-[active=true]:border-green-500",
      slider: "[&_[role=slider]]:bg-green-500",
    },
    purple: {
      bg: "bg-purple-500/10 border-purple-500/30",
      bgOn: "bg-purple-500/20 border-purple-500/50 shadow-purple-500/10 shadow-lg",
      icon: "text-purple-500",
      badge: "bg-purple-600",
      button: "bg-purple-600 hover:bg-purple-700 text-white",
      buttonOff: "bg-red-600 hover:bg-red-700 text-white",
      timedButton: "bg-violet-600 hover:bg-violet-700 text-white",
      glow: "shadow-purple-500/20",
      preset: "border-purple-500/40 hover:bg-purple-500/20 data-[active=true]:bg-purple-500/30 data-[active=true]:border-purple-500",
      slider: "[&_[role=slider]]:bg-purple-500",
    },
  }

  const c = colors[colorOn]

  return (
    <div
      className={cn(
        "relative rounded-xl border p-5 transition-all duration-300",
        isOn ? c.bgOn : c.bg,
      )}
    >
      {/* Indicator dot */}
      <div className="absolute top-3 right-3">
        <div className={cn(
          "h-2.5 w-2.5 rounded-full transition-colors",
          isOn ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30",
        )} />
      </div>

      <div className="flex flex-col items-center text-center space-y-3">
        {/* Icon */}
        <div className={cn(
          "rounded-full p-3 transition-all duration-300",
          isOn
            ? `${c.icon} bg-background/80 ${c.glow} shadow-lg`
            : "text-muted-foreground bg-muted",
        )}>
          {icon}
        </div>

        {/* Label */}
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>

        {/* Status Badge */}
        <Badge
          variant={isOn ? "default" : "outline"}
          className={cn("text-xs px-3", isOn && c.badge)}
        >
          {isOn
            ? isPending
              ? "⏳ Sending to ESP32..."
              : countdown > 0
                ? `⏱ ${formatDuration(countdown)}`
                : "RUNNING"
            : "OFF"}
        </Badge>

        {/* ── Single Action: Select duration → Run  /  Stop when running ── */}
        {isOn ? (
          /* PUMP IS RUNNING — show Stop button + countdown */
          <div className="w-full space-y-2">
            <Button
              className={cn("w-full gap-2 font-semibold", c.buttonOff)}
              size="sm"
              disabled={isBusy}
              onClick={onStop}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  Stop Pump
                </>
              )}
            </Button>
          </div>
        ) : (
          /* PUMP IS OFF — show duration picker + single Run button */
          <div className="w-full space-y-2">
            {/* Duration Presets */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.value}
                  data-active={duration === p.value}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all",
                    c.preset,
                  )}
                  onClick={() => { onDurationChange(p.value); setCustomMin(""); setCustomSec("") }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Manual min:sec input */}
            <div className="flex items-center gap-1.5 justify-center px-1">
              <Input
                type="number"
                min={0}
                max={60}
                placeholder="0"
                value={customMin}
                onChange={(e) => {
                  const m = e.target.value
                  setCustomMin(m)
                  const mins = parseInt(m) || 0
                  const secs = parseInt(customSec) || 0
                  const total = Math.max(5, Math.min(3600, mins * 60 + secs))
                  onDurationChange(total)
                }}
                className="w-14 h-8 text-center text-sm px-1"
              />
              <span className="text-xs text-muted-foreground font-medium">min</span>
              <Input
                type="number"
                min={0}
                max={59}
                placeholder="30"
                value={customSec}
                onChange={(e) => {
                  const s = e.target.value
                  setCustomSec(s)
                  const mins = parseInt(customMin) || 0
                  const secs = parseInt(s) || 0
                  const total = Math.max(5, Math.min(3600, mins * 60 + secs))
                  onDurationChange(total)
                }}
                className="w-14 h-8 text-center text-sm px-1"
              />
              <span className="text-xs text-muted-foreground font-medium">sec</span>
            </div>

            {/* Slider */}
            <div className="px-1">
              <Slider
                value={[duration]}
                onValueChange={([v]) => { onDurationChange(v); setCustomMin(""); setCustomSec("") }}
                min={5}
                max={600}
                step={5}
                className={cn("w-full", c.slider)}
              />
              <p className="text-[11px] text-muted-foreground text-center mt-1">
                {formatDuration(duration)}
              </p>
            </div>

            {/* Single Run Button */}
            <Button
              className={cn("w-full gap-2 font-semibold", c.button)}
              size="sm"
              disabled={isBusy}
              onClick={onTimedStart}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run for {formatDuration(duration)}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Countdown progress bar */}
        {isOn && (isPending || countdown > 0) && (
          <div className="w-full">
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              {isPending ? (
                <div
                  className={cn(
                    "h-full rounded-full animate-pulse",
                    colorOn === "green" ? "bg-green-500/60" : "bg-purple-500/60",
                  )}
                  style={{ width: "100%" }}
                />
              ) : (
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    colorOn === "green" ? "bg-green-500" : "bg-purple-500",
                  )}
                  style={{ width: `${(countdown / duration) * 100}%` }}
                />
              )}
            </div>
          </div>
        )}

        {/* Last command timestamp */}
        {lastCommand && (
          <p className="text-[10px] text-muted-foreground">
            Last command: {lastCommand.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  )
}
