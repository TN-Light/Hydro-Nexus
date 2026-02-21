"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import {
  FlaskConical,
  Zap,
  Power,
  RotateCcw,
  StopCircle,
  WifiOff,
  CheckCircle2,
  Clock,
  Waves,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ControlState {
  nutrient_pump: boolean
  relay2: boolean   // P22 — PAW Pump
}

interface IotControlPanelProps {
  deviceId: string
  isOnline?: boolean
  compact?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMMAND_LABELS: Record<string, string> = {
  nutrient_pump_on: "Nutrition Pump ON",
  nutrient_pump_off: "Nutrition Pump OFF",
  relay2_on: "PAW Pump ON",
  relay2_off: "PAW Pump OFF",
  manual_dosing_cycle: "Manual Dosing",
  emergency_stop: "Emergency Stop",
  restart: "Restart Device",
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function IotControlPanel({ deviceId, isOnline = false, compact = false }: IotControlPanelProps) {
  const { toast } = useToast()
  const [sending, setSending] = useState<string | null>(null)
  const [pumpDuration, setPumpDuration] = useState(5000)

  const [controls, setControls] = useState<ControlState>({
    nutrient_pump: false,
    relay2: false,
  })

  // ── Send a command to the device ──────────────────────────────────────────
  const sendCommand = useCallback(async (
    action: string,
    parameters: Record<string, unknown> = {},
    priority: "normal" | "high" = "normal",
  ) => {
    if (!isOnline) {
      toast({
        title: "Device Offline",
        description: "Commands cannot be sent to an offline device.",
        variant: "destructive",
      })
      return false
    }

    setSending(action)
    try {
      const res = await fetch(`/api/devices/${deviceId}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, parameters, priority }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Command failed")

      toast({
        title: "Command Queued",
        description: `"${COMMAND_LABELS[action] ?? action}" sent. ESP32 will execute within ~30 s.`,
      })
      return true
    } catch {
      toast({
        title: "Command Failed",
        description: `Could not send "${COMMAND_LABELS[action] ?? action}". Check connection.`,
        variant: "destructive",
      })
      return false
    } finally {
      setSending(null)
    }
  }, [deviceId, isOnline, toast])

  // ── Toggle handlers ───────────────────────────────────────────────────────
  const handleToggle = useCallback(async (
    key: keyof ControlState,
    newState: boolean,
  ) => {
    const actionMap: Record<keyof ControlState, [string, string]> = {
      nutrient_pump: ["nutrient_pump_on", "nutrient_pump_off"],
      relay2:        ["relay2_on",      "relay2_off"],
    }
    const [onCmd, offCmd] = actionMap[key]
    const action = newState ? onCmd : offCmd
    const params = key === "nutrient_pump"
      ? { duration_ms: pumpDuration }
      : {}

    const ok = await sendCommand(action, params, "high")
    if (ok) setControls(prev => ({ ...prev, [key]: newState }))
  }, [pumpDuration, sendCommand])

  // ── Emergency stop ────────────────────────────────────────────────────────
  const handleEmergencyStop = async () => {
    const ok = await sendCommand("emergency_stop", {}, "high")
    if (ok) {
      setControls({ nutrient_pump: false, relay2: false })
    }
  }

  const isBusy = sending !== null

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Device is offline — commands will be queued and executed when it reconnects.</span>
        </div>
      )}

      {/* ── Switch Controls ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className={compact ? "pb-2 pt-4 px-4" : undefined}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Power className="h-4 w-4" />
            Pump Controls
            <Badge
              variant={isOnline ? "default" : "secondary"}
              className={`ml-auto text-xs ${isOnline ? "bg-green-600" : ""}`}
            >
              {isOnline ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" />Online</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" />Offline</>
              )}
            </Badge>
          </CardTitle>
          {!compact && (
            <CardDescription>
              Toggle switches send commands to ESP32. Executes within ~30 s.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className={`space-y-3 ${compact ? "px-4 pb-4" : ""}`}>
          {/* Nutrition Pump */}
          <ControlRow
            icon={<FlaskConical className="h-5 w-5 text-green-500" />}
            label="Nutrition Pump"
            sublabel="Nutrient solution + water for plants — P19"
            checked={controls.nutrient_pump}
            disabled={isBusy}
            loading={sending === "nutrient_pump_on" || sending === "nutrient_pump_off"}
            onCheckedChange={(v) => handleToggle("nutrient_pump", v)}
          />

          <Separator />

          {/* PAW Pump */}
          <ControlRow
            icon={<Waves className="h-5 w-5 text-purple-500" />}
            label="PAW Pump"
            sublabel="Plasma-Activated Water — P22"
            checked={controls.relay2}
            disabled={isBusy}
            loading={sending === "relay2_on" || sending === "relay2_off"}
            onCheckedChange={(v) => handleToggle("relay2", v)}
          />
        </CardContent>
      </Card>

      {/* ── Pump Duration ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className={compact ? "pb-2 pt-4 px-4" : undefined}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Pump Run Duration
          </CardTitle>
          {!compact && (
            <CardDescription>
              Nutrition pump auto-stops after this duration. Set 0 to run until manually stopped.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className={compact ? "px-4 pb-4" : undefined}>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-semibold tabular-nums">
                {pumpDuration === 0 ? "Manual stop" : `${(pumpDuration / 1000).toFixed(0)} s`}
              </span>
            </div>
            <Slider
              value={[pumpDuration]}
              onValueChange={([v]) => setPumpDuration(v)}
              onValueCommit={([v]) => {
                // Sync the duration setting to ESP32
                sendCommand("update_settings", {
                  settings: { pump_duration_ms: v }
                }, "normal")
              }}
              min={0}
              max={30000}
              step={1000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Manual</span>
              <span>15 s</span>
              <span>30 s</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className={compact ? "pb-2 pt-4 px-4" : undefined}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className={`grid grid-cols-2 gap-3 ${compact ? "px-4 pb-4" : ""}`}>
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => sendCommand("manual_dosing_cycle", { duration: 10 }, "high")}
            className="flex items-center gap-2"
          >
            <FlaskConical className="h-4 w-4 text-green-500" />
            Manual Dosing
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => sendCommand("restart", {}, "normal")}
            className="flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/30"
          >
            <RotateCcw className="h-4 w-4" />
            Restart Device
          </Button>

          {/* Emergency Stop — full width */}
          <Button
            variant="destructive"
            size="sm"
            disabled={isBusy}
            onClick={handleEmergencyStop}
            className="col-span-2 flex items-center gap-2"
          >
            <StopCircle className="h-4 w-4" />
            Emergency Stop — All Pumps OFF
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── ControlRow sub-component ─────────────────────────────────────────────────

interface ControlRowProps {
  icon: React.ReactNode
  label: string
  sublabel: string
  checked: boolean
  disabled: boolean
  loading: boolean
  onCheckedChange: (checked: boolean) => void
}

function ControlRow({ icon, label, sublabel, checked, disabled, loading, onCheckedChange }: ControlRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-medium leading-none">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {loading && (
          <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
            <Clock className="h-3 w-3" /> Queuing…
          </span>
        )}
        <Badge
          variant={checked ? "default" : "outline"}
          className={`text-xs min-w-[36px] justify-center ${checked ? "bg-green-600" : ""}`}
        >
          {checked ? "ON" : "OFF"}
        </Badge>
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled || loading}
          aria-label={label}
        />
      </div>
    </div>
  )
}
