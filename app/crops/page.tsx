"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FlaskConical, Leaf, Sun, Waves, Award, AlertTriangle, Info, Thermometer } from "lucide-react"
import { redirect } from "next/navigation"
import { useEffect } from "react"
import { QBM_CROPS, EXCLUDED_CROPS, type QBMCrop, type ExcludedCrop } from "@/lib/crop-database"

// ─── Sub-components ──────────────────────────────────────────────────

function ParamRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function CropCard({ crop }: { crop: QBMCrop }) {
  const p = crop.parameters
  const led = crop.led_spectrum
  const paw = crop.paw_protocol
  const gdd = crop.gdd_profile

  const bgAccent =
    crop.color === "amber" || crop.color?.includes("amber") || crop.bioactive_type === "curcumin"
      ? "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200"
      : "from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200"

  return (
    <Card className={`bg-gradient-to-br ${bgAccent} border`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <span className="text-2xl">{crop.icon}</span>
              {crop.name}
            </CardTitle>
            <CardDescription className="mt-1 italic">{crop.scientific_name}</CardDescription>
          </div>
          <Badge className="bg-emerald-600 text-white text-xs">QBM APPROVED</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{crop.bioactive_description}</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="parameters">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="parameters" className="text-xs">
              <Thermometer className="h-3 w-3 mr-1" /> Parameters
            </TabsTrigger>
            <TabsTrigger value="led" className="text-xs">
              <Sun className="h-3 w-3 mr-1" /> LED
            </TabsTrigger>
            <TabsTrigger value="paw" className="text-xs">
              <Waves className="h-3 w-3 mr-1" /> PAW
            </TabsTrigger>
            <TabsTrigger value="bioactive" className="text-xs">
              <Award className="h-3 w-3 mr-1" /> Bioactive
            </TabsTrigger>
          </TabsList>

          {/* Parameters */}
          <TabsContent value="parameters" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Environmental</div>
                <ParamRow label="Temperature" value={`${p.temperature.min}–${p.temperature.max} °C`} />
                <ParamRow label="Humidity (veg)" value={`${p.humidity_vegetative.min}–${p.humidity_vegetative.max} %`} />
                <ParamRow label="Humidity (stress)" value={`${p.humidity_stress.min}–${p.humidity_stress.max} %`} />
                <ParamRow label="Substrate moisture" value={`${p.substrate_moisture.min}–${p.substrate_moisture.max} %`} />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Chemical</div>
                <ParamRow label="pH" value={`${p.pH.min}–${p.pH.max}`} />
                <ParamRow label="EC" value={`${p.ec.min}–${p.ec.max} mS/cm`} />
                <ParamRow label="Nitrogen" value={`${p.nitrogen_ppm.min}–${p.nitrogen_ppm.max} ppm`} />
                <ParamRow
                  label="Phosphorus"
                  value={`${p.phosphorus_ppm.min}–${p.phosphorus_ppm.max} ppm`}
                />
                <ParamRow label="Potassium" value={`${p.potassium_ppm.min}–${p.potassium_ppm.max} ppm`} />
                <ParamRow label="Calcium" value={`${p.calcium_ppm.min}–${p.calcium_ppm.max} ppm`} />
                <ParamRow label="Magnesium" value={`${p.magnesium_ppm.min}–${p.magnesium_ppm.max} ppm`} />
              </div>
            </div>
            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded text-xs text-amber-800 dark:text-amber-300">
              <strong>AMF Rule:</strong> Phosphorus locked at {p.phosphorus_ppm.min}–{p.phosphorus_ppm.max} ppm.
              Above 80 ppm suppresses AMF network and kills bioactive overproduction.
            </div>
          </TabsContent>

          {/* LED Spectrum */}
          <TabsContent value="led" className="space-y-3 mt-4">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Sun className="h-4 w-4 text-yellow-500" />
              R:B Ratio — {led.red_blue_ratio}
            </div>
            {/* Visual bar */}
            {(() => {
              const parts = led.red_blue_ratio.split(":").map(Number)
              const total = parts.reduce((a, b) => a + b, 0)
              const redPct = Math.round((parts[0] / total) * 100)
              const bluePct = Math.round((parts[1] / total) * 100)
              return (
                <div className="h-5 rounded overflow-hidden flex text-xs font-bold">
                  <div className="bg-red-500 flex items-center justify-center text-white" style={{ width: `${redPct}%` }}>R {redPct}%</div>
                  <div className="bg-blue-500 flex items-center justify-center text-white" style={{ width: `${bluePct}%` }}>B {bluePct}%</div>
                </div>
              )
            })()}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <ParamRow label="PPFD Range" value={`${led.ppfd_min}–${led.ppfd_max} µmol/m²/s`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{led.description}</p>
          </TabsContent>

          {/* PAW */}
          <TabsContent value="paw" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <ParamRow label="H₂O₂ range" value={`${paw.h2o2_concentration_min_um}–${paw.h2o2_concentration_max_um} µM`} />
              <ParamRow label="Frequency" value={`${paw.applications_per_week}× / week`} />
              <ParamRow label="Volume" value={`${paw.volume_percent_of_irrigation_min}–${paw.volume_percent_of_irrigation_max}% of irrigation`} />
              <ParamRow label="Window" value={`Final ${paw.activation_weeks_before_harvest} weeks`} />
            </div>
            <p className="text-xs text-muted-foreground">{paw.description}</p>
          </TabsContent>

          {/* Bioactive */}
          <TabsContent value="bioactive" className="space-y-3 mt-4">
            <div className="p-3 rounded border border-border bg-background/60">
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm capitalize">{crop.bioactive_type}</span>
                <Badge variant="outline" className="text-xs">{crop.bioactive_target}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{crop.bioactive_description}</p>
            </div>
            <Separator />
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">GDD Harvest Profile</div>
            <ParamRow label="GDD Base Temp" value={`${gdd.base_temp_c} °C`} />
            <ParamRow label="Harvest Window" value={`${gdd.target_gdd_min}–${gdd.target_gdd_max} GDD`} />
            <ParamRow label="Cycle Length" value={`${crop.total_cycle_days_min}–${crop.total_cycle_days_max} days`} />
          </TabsContent>
        </Tabs>

        {/* Growth Stages */}
        <Separator className="my-4" />
        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Growth Stages</div>
        <div className="flex gap-2 flex-wrap">
          {crop.growth_stages.map((stage) => (
            <div key={stage.stage} className="flex-1 min-w-[120px] p-2 rounded border border-border text-center">
              <div className="text-xs font-bold capitalize">{stage.stage}</div>
              <div className="text-xs text-muted-foreground">{stage.duration_days_min}–{stage.duration_days_max}d</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ExcludedCropCard({ crop }: { crop: ExcludedCrop }) {
  return (
    <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-red-800 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          {crop.name}
          <Badge variant="destructive" className="text-xs ml-2">EXCLUDED</Badge>
        </CardTitle>
        <CardDescription className="italic">{crop.scientific_name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-800 dark:text-red-300">
          <strong>Reason:</strong> {crop.reason}
        </div>
        <p className="text-xs text-muted-foreground">{crop.biological_incompatibility}</p>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function CropsPage() {
  const { isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      redirect("/login")
    }
  }, [isLoading, isAuthenticated])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading crop database…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">QBM Crop Registry</h1>
        <p className="text-muted-foreground">
          Quantum-Bio-Mycorrhizal approved crop profiles — each engineered for pharmaceutical-grade bioactive overproduction via forced AMF symbiosis.
        </p>
      </div>

      {/* Science Banner */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">AMF Network</div>
              <div className="text-muted-foreground">P 40–60 ppm forces mycorrhizal colonisation, triggering stress-response biosynthesis pathways</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">PAW Stress</div>
              <div className="text-muted-foreground">20–50 µM H₂O₂ PAW in final 4 weeks activates jasmonate signalling → higher secondary metabolites</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">LED Tuning</div>
              <div className="text-muted-foreground">Crop-specific Red:Blue ratios maximise phenylpropanoid and capsaicinoid gene expression</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approved Crops */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Leaf className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-semibold">Approved QBM Crops ({QBM_CROPS.length})</h2>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {QBM_CROPS.map((crop) => (
            <CropCard key={crop.id} crop={crop} />
          ))}
        </div>
      </div>

      {/* Excluded Crops */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-xl font-semibold">Excluded / Incompatible Crops ({EXCLUDED_CROPS.length})</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          These crops are biologically incompatible with the QBM forced-symbiosis protocol or economically unviable in this system.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EXCLUDED_CROPS.map((crop) => (
            <ExcludedCropCard key={crop.id} crop={crop} />
          ))}
        </div>
      </div>

      {/* Info Footer */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            All crops are grown in 25-litre LECA substrate grow bags inoculated with Rhizophagus irregularis AMF spore mix at 50 spores/litre.
            For crop assignment to specific grow bags, go to the Dashboard. For parameter configuration, go to Settings → Optimization.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
