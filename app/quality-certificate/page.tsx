"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Award, FlaskConical, Waves, Leaf, Download, RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { usePersistedState } from "@/hooks/use-persisted-state"
import { redirect } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Certificate {
  certificateId: string
  issuedAt: string
  deviceId: string
  cropName: string
  bioactiveCompound: string
  targetConcentration: string
  plantingDate: string | null
  accumulatedGDD: number
  gddProgress: number
  pawApplicationsTotal: number
  pawAvgH2O2Um: string | null
  phosphorusCompliantDays: number
  phosphorusTotalDays: number
  phosphorusCompliancePercent: number
  avgPhosphorusPpm: string | null
  bioactiveIndex: number
  grade: string
  latestSensor: {
    pH: number
    ec: number
    temperature: number
    humidity: number
    moisture: number
    timestamp: string
  } | null
}

function GradeDisplay({ grade }: { grade: string }) {
  const letter = grade[0]
  const color =
    letter === "A" ? "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30"
    : letter === "B" ? "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30"
    : letter === "C" ? "text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30"
    : "text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30"
  return (
    <div className={`border-2 rounded-xl p-6 text-center ${color}`}>
      <div className="text-6xl font-black">{letter}</div>
      <div className="text-sm font-medium mt-1">{grade.slice(4)}</div>
    </div>
  )
}

function ScoreBar({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  const color =
    value >= 85 ? "bg-emerald-500"
    : value >= 65 ? "bg-blue-500"
    : value >= 40 ? "bg-yellow-500"
    : "bg-red-500"
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function QualityCertificatePage() {
  const { isLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [selectedDevice, setSelectedDevice] = usePersistedState("qc:selectedDevice", "grow-bag-1")
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) redirect("/login")
  }, [isLoading, isAuthenticated])

  const fetchCertificate = async () => {
    setIsFetching(true)
    setCertificate(null)
    try {
      const res = await fetch(`/api/quality-certificate?deviceId=${selectedDevice}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (data.success) {
        setCertificate(data.certificate)
      } else {
        toast({ title: "Error", description: data.error || "Failed to generate certificate", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error — check API connection", variant: "destructive" })
    } finally {
      setIsFetching(false)
    }
  }

  const saveCertificate = async () => {
    if (!certificate) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/quality-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ deviceId: selectedDevice, certificate }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Certificate Saved", description: `Certificate ID: ${data.certificateId}` })
      } else {
        toast({ title: "Save Failed", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Save Failed", description: "Network error", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const printCertificate = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }
  if (!isAuthenticated) return null

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Award className="h-8 w-8 text-amber-500" /> Quality Certificate
          </h1>
          <p className="text-muted-foreground">
            Generate a QBM-HydroNet pharmaceutical-grade bioactive quality certificate for a grow bag.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select bag…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grow-bag-1">Grow Bag 1 (First — Inlet)</SelectItem>
              <SelectItem value="grow-bag-6">Grow Bag 6 (Last — Outlet)</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchCertificate} disabled={isFetching} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Generating…" : "Generate"}
          </Button>
          {certificate && (
            <>
              <Button variant="outline" onClick={saveCertificate} disabled={isSaving} className="flex items-center gap-2">
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Save
              </Button>
              <Button variant="outline" onClick={printCertificate} className="flex items-center gap-2">
                <Download className="h-4 w-4" /> Print / PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Certificate Card */}
      {certificate ? (
        <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-emerald-50 dark:from-amber-950/20 dark:via-background dark:to-emerald-950/20 print:border-black">
          <CardHeader>
            {/* Certificate header */}
            <div className="text-center space-y-1">
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Quantum-Bio-Mycorrhizal Hydroponic Network
              </div>
              <CardTitle className="text-2xl font-black">QBM-HydroNet Quality Certificate</CardTitle>
              <CardDescription>
                Certificate ID: <span className="font-mono font-medium">{certificate.certificateId}</span>
              </CardDescription>
              <div className="text-xs text-muted-foreground">
                Issued: {new Date(certificate.issuedAt).toLocaleString()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Crop + Grade row */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Crop</div>
                <div className="text-xl font-bold">{certificate.cropName}</div>
                <div className="text-sm text-muted-foreground">Device: {certificate.deviceId}</div>
                {certificate.plantingDate && (
                  <div className="text-xs text-muted-foreground">
                    Planted: {new Date(certificate.plantingDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <GradeDisplay grade={certificate.grade} />
                <div className="text-center">
                  <div className="text-5xl font-black text-primary">{certificate.bioactiveIndex}</div>
                  <div className="text-xs text-muted-foreground">/ 100 Bioactive Index</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Bioactive target */}
            <div className="p-4 rounded border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="h-4 w-4 text-amber-600" />
                <span className="font-semibold">Bioactive Target</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Compound</div>
                  <div className="font-medium">{certificate.bioactiveCompound}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Target Concentration</div>
                  <div className="font-medium">{certificate.targetConcentration}</div>
                </div>
              </div>
            </div>

            {/* Score breakdown */}
            <div className="space-y-3">
              <div className="text-sm font-semibold">Score Breakdown</div>
              <ScoreBar label="GDD Progress (40% weight)" value={certificate.gddProgress} icon={Leaf} />
              <ScoreBar
                label="PAW Protocol (35% weight)"
                value={certificate.pawApplicationsTotal > 0 ? Math.min(100, Math.round((certificate.pawApplicationsTotal / 8) * 100)) : 0}
                icon={Waves}
              />
              <ScoreBar label="P Compliance (25% weight)" value={certificate.phosphorusCompliancePercent} icon={FlaskConical} />
            </div>

            <Separator />

            {/* Data table */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div className="space-y-3">
                <div className="font-semibold text-xs text-muted-foreground uppercase">GDD</div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accumulated</span>
                  <span className="font-medium">{certificate.accumulatedGDD.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{certificate.gddProgress}%</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="font-semibold text-xs text-muted-foreground uppercase">PAW Protocol</div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applications</span>
                  <span className="font-medium">{certificate.pawApplicationsTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg H₂O₂</span>
                  <span className="font-medium">{certificate.pawAvgH2O2Um ? `${certificate.pawAvgH2O2Um} µM` : "—"}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="font-semibold text-xs text-muted-foreground uppercase">Phosphorus</div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg P</span>
                  <span className="font-medium">{certificate.avgPhosphorusPpm ? `${certificate.avgPhosphorusPpm} ppm` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Compliant days</span>
                  <span className="font-medium">{certificate.phosphorusCompliantDays} / {certificate.phosphorusTotalDays}</span>
                </div>
              </div>
            </div>

            {/* Latest sensor */}
            {certificate.latestSensor && (
              <>
                <Separator />
                <div className="text-sm font-semibold">Latest Sensor Snapshot</div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-xs text-center">
                  {[
                    { label: "pH", value: certificate.latestSensor.pH?.toFixed(2) },
                    { label: "EC", value: `${certificate.latestSensor.ec?.toFixed(2)} mS` },
                    { label: "Temp", value: `${certificate.latestSensor.temperature?.toFixed(1)} °C` },
                    { label: "Humidity", value: `${certificate.latestSensor.humidity?.toFixed(0)} %` },
                    { label: "Moisture", value: `${certificate.latestSensor.moisture?.toFixed(0)} %` },
                  ].map((s) => (
                    <div key={s.label} className="p-2 rounded border border-border bg-muted/30">
                      <div className="font-bold">{s.value ?? "—"}</div>
                      <div className="text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Footer */}
            <Separator />
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <div className="font-semibold">QBM-HydroNet — Quantum-Bio-Mycorrhizal Hydroponic Network</div>
              <div>Certificate generated by QBM Production Intelligence System</div>
              <div className="font-mono">{certificate.certificateId}</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <Award className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="font-medium text-muted-foreground">No certificate generated yet</div>
            <div className="text-sm text-muted-foreground">
              Select a grow bag and click "Generate" to produce a quality certificate.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
