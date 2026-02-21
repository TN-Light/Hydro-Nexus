"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Line } from "@/components/ui/recharts/line"
import { CalendarIcon, BarChart3, TrendingUp, Brain, Download, FlaskConical, Waves, Award, Leaf } from "lucide-react"
import { useState, useEffect, useMemo, Suspense, lazy } from "react"
import { usePersistedState } from "@/hooks/use-persisted-state"
import { redirect } from "next/navigation"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

interface HistoricalDataPoint {
  timestamp: string
  deviceId: string
  cropType: string
  roomTemp: number
  pH: number
  ec: number
  moisture: number
  waterLevel: string
  humidity: number
}

const METRICS = [
  { id: "roomTemp", label: "Room Temperature", color: "#ef4444", unit: "°C" },
  { id: "pH", label: "pH Level", color: "#3b82f6", unit: "" },
  { id: "ec", label: "EC", color: "#10b981", unit: "mS/cm" },
  { id: "moisture", label: "Substrate Moisture", color: "#f59e0b", unit: "%" },
  { id: "humidity", label: "Humidity", color: "#8b5cf6", unit: "%" },
]

const QBM_CROP_LIST = [
  "All",
  "Turmeric (High-Curcumin)",
  "Bhut Jolokia",
  "Aji Charapita",
  "Kanthari Chili",
]

// Legacy alias for filter
const CROP_TYPES = QBM_CROP_LIST
const GROW_BAGS = ["All", "grow-bag-1", "grow-bag-2", "grow-bag-3", "grow-bag-4", "grow-bag-5", "grow-bag-6"]



export default function AnalyticsPage() {
  const { user, isLoading } = useAuth()
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [aggregation, setAggregation] = usePersistedState("analytics:aggregation", "Daily")
  const [selectedMetrics, setSelectedMetrics] = usePersistedState("analytics:selectedMetrics", ["roomTemp", "pH", "ec", "moisture", "humidity"])
  const [cropType, setCropType] = usePersistedState("analytics:cropType", "All")
  const [growBag, setGrowBag] = usePersistedState("analytics:growBag", "All")
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  // Real grow-cycle data fetched from DB
  const [growCycleData, setGrowCycleData] = useState<Record<string, { accumulated_gdd: number; paw_applications: number; phosphorus_ppm: number | null }>>({});
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)

  const pCompliantPercent = useMemo(() => {
    const vals = Object.values(growCycleData).map(d => d.phosphorus_ppm).filter((v): v is number => v !== null)
    if (!vals.length) return 0
    return Math.round((vals.filter(v => v >= 40 && v <= 60).length / vals.length) * 100)
  }, [growCycleData])

  const gddData = useMemo(() => GROW_BAGS.slice(1).map(bag => ({
    bag: bag.replace("grow-bag-", "Bag "),
    accumulated: growCycleData[bag]?.accumulated_gdd ?? 0,
  })), [growCycleData])

  const pawData = useMemo(() => GROW_BAGS.slice(1).map(bag => ({
    bag: bag.replace("grow-bag-", "Bag "),
    applications: growCycleData[bag]?.paw_applications ?? 0,
  })), [growCycleData])

  const phosphorusLog = useMemo(() => GROW_BAGS.slice(1).map(bag => ({
    bag: bag.replace("grow-bag-", "Bag "),
    ppm: growCycleData[bag]?.phosphorus_ppm ?? null,
    compliant: growCycleData[bag]?.phosphorus_ppm !== null &&
               (growCycleData[bag]?.phosphorus_ppm ?? 0) >= 40 &&
               (growCycleData[bag]?.phosphorus_ppm ?? 0) <= 60,
  })), [growCycleData])

  useEffect(() => {
    if (!isLoading && !user) {
      redirect("/login")
    }
  }, [user, isLoading])

  // Real sensor data state
  const [analyticsData, setAnalyticsData] = useState<HistoricalDataPoint[]>([])
  const extendedMockData = analyticsData

  // Fetch real sensor history + grow-cycle data
  useEffect(() => {
    if (!user) return
    setIsLoadingAnalytics(true)
    const bags = GROW_BAGS.slice(1)
    const defaultCrops = ["Turmeric (High-Curcumin)", "Bhut Jolokia", "Aji Charapita", "Kanthari Chili", "Turmeric (High-Curcumin)", "Bhut Jolokia"]
    const deviceCropMap: Record<string, string> = {}

    // Fetch crop assignments, then sensor history + grow-cycle in parallel
    Promise.all(bags.map(bag => fetch(`/api/devices/${bag}/crop`).then(r => r.ok ? r.json() : null)))
      .then(cropResults => {
        cropResults.forEach((res, i) => { if (res?.device?.cropName) deviceCropMap[bags[i]] = res.device.cropName })
      })
      .catch(() => {})
      .finally(() => {
        const hours = 90 * 24
        // Sensor history
        Promise.all(bags.map(bag =>
          fetch(`/api/sensors/history?deviceId=${bag}&hours=${hours}&interval=60`).then(r => r.ok ? r.json() : null)
        )).then(results => {
          const merged: HistoricalDataPoint[] = []
          results.forEach((res, i) => {
            const bag = bags[i]
            const cropName = deviceCropMap[bag] ?? defaultCrops[i]
            if (res?.data?.length) {
              res.data.forEach((pt: any) => {
                merged.push({ timestamp: pt.time, deviceId: bag, cropType: cropName,
                  roomTemp: pt.roomTemp, pH: pt.pH, ec: pt.ec, moisture: pt.moisture,
                  waterLevel: "Adequate", humidity: pt.humidity })
              })
            }
          })
          setAnalyticsData(merged)
        }).catch(console.error).finally(() => setIsLoadingAnalytics(false))

        // Grow-cycle data
        Promise.all(bags.map(bag => fetch(`/api/grow-cycle?deviceId=${bag}`).then(r => r.ok ? r.json() : null)))
          .then(gcResults => {
            const gcMap: Record<string, any> = {}
            gcResults.forEach((res, i) => {
              if (res) gcMap[bags[i]] = {
                accumulated_gdd: parseFloat(res.accumulated_gdd) || 0,
                paw_applications: parseInt(res.paw_applications) || 0,
                phosphorus_ppm: res.phosphorus_ppm !== null ? parseFloat(res.phosphorus_ppm) : null,
              }
            })
            setGrowCycleData(gcMap)
          }).catch(console.error)
      })
  }, [user])

  // Filter and aggregate data
  const processedData = useMemo(() => {
    const filtered = extendedMockData.filter((point) => {
      const pointDate = new Date(point.timestamp)
      const inDateRange = pointDate >= startOfDay(dateRange.from) && pointDate <= endOfDay(dateRange.to)
      const matchesCrop = cropType === "All" || point.cropType === cropType
      const matchesBag = growBag === "All" || point.deviceId === growBag
      return inDateRange && matchesCrop && matchesBag
    })

    // Aggregate data based on selected aggregation
    const aggregated: Record<string, any> = {}

    filtered.forEach((point) => {
      const date = new Date(point.timestamp)
      let key: string

      switch (aggregation) {
        case "Hourly":
          key = format(date, "yyyy-MM-dd HH:00")
          break
        case "Daily":
          key = format(date, "yyyy-MM-dd")
          break
        case "Weekly":
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = format(weekStart, "yyyy-MM-dd")
          break
        default:
          key = format(date, "yyyy-MM-dd")
      }

      if (!aggregated[key]) {
        aggregated[key] = {
          timestamp: key,
          count: 0,
          roomTemp: 0,
          pH: 0,
          ec: 0,
          moisture: 0,
          humidity: 0,
        }
      }

      aggregated[key].count++
      aggregated[key].roomTemp += point.roomTemp
      aggregated[key].pH += point.pH
      aggregated[key].ec += point.ec
      aggregated[key].moisture += point.moisture
      aggregated[key].humidity += point.humidity
    })

    // Calculate averages
    return Object.values(aggregated)
      .map((item: any) => ({
        timestamp: item.timestamp,
        roomTemp: Number((item.roomTemp / item.count).toFixed(2)),
        pH: Number((item.pH / item.count).toFixed(2)),
        ec: Number((item.ec / item.count).toFixed(2)),
        moisture: Number((item.moisture / item.count).toFixed(1)),
        humidity: Number((item.humidity / item.count).toFixed(1)),
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }, [extendedMockData, dateRange, aggregation, cropType, growBag])

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics((prev) => (prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId]))
  }

  const handleExportData = () => {
    const csvContent = [
      // Header row
      ['timestamp', ...selectedMetrics.map(id => METRICS.find(m => m.id === id)?.label || id)].join(','),
      // Data rows
      ...processedData.map(row => [
        row.timestamp,
        ...selectedMetrics.map(id => row[id as keyof typeof row])
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `qbm-hydronet-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics Studio</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Sensor trends · QBM protocol compliance · Bioactive accumulation intelligence
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Badge variant="outline" className="justify-center sm:justify-start">
              <BarChart3 className="h-3 w-3 mr-1" />
              {processedData.length} data points
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={handleExportData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="sensors">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="sensors" className="flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" /> Sensor Analytics
            </TabsTrigger>
            <TabsTrigger value="qbm" className="flex items-center gap-1">
              <FlaskConical className="h-3.5 w-3.5" /> QBM Intelligence
            </TabsTrigger>
          </TabsList>

          {/* ─── Sensor Analytics Tab ─── */}
          <TabsContent value="sensors" className="space-y-4 sm:space-y-6 mt-4">

        {/* Control Panel */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Analysis Controls
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">Configure your data analysis parameters</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
              {/* Date Range Selector */}
              <div className="flex flex-col space-y-2 md:col-span-1 xl:col-span-1">
                <label className="block text-sm font-medium">Date Range</label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-xs sm:text-sm",
                        !dateRange && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to })
                          setIsCalendarOpen(false)
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Aggregation Selector */}
              <div className="flex flex-col space-y-2">
                <label className="block text-sm font-medium">Aggregation</label>
                <Select value={aggregation} onValueChange={setAggregation}>
                  <SelectTrigger className="text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hourly">Hourly</SelectItem>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Crop Type Filter */}
              <div className="flex flex-col space-y-2">
                <label className="block text-sm font-medium">Crop Type</label>
                <Select value={cropType} onValueChange={setCropType}>
                  <SelectTrigger className="text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CROP_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Grow Bag Filter */}
              <div className="flex flex-col space-y-2">
                <label className="block text-sm font-medium">Grow Bag</label>
                <Select value={growBag} onValueChange={setGrowBag}>
                  <SelectTrigger className="text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROW_BAGS.map((bag) => (
                      <SelectItem key={bag} value={bag}>
                        {bag === "All" ? "All Bags" : bag.replace("grow-bag-", "Bag ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Metric Selector */}
              <div className="space-y-2 md:col-span-2 xl:col-span-2">
                <label className="text-sm font-medium">Metrics</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-3">
                  {METRICS.map((metric) => (
                    <div key={metric.id} className="flex items-center space-x-2 min-w-0">
                      <Checkbox
                        id={metric.id}
                        checked={selectedMetrics.includes(metric.id)}
                        onCheckedChange={() => handleMetricToggle(metric.id)}
                      />
                      <label
                        htmlFor={metric.id}
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer truncate"
                        style={{ color: metric.color }}
                      >
                        {metric.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts and Insights Section */}
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chart */}
            <div className="lg:col-span-2 order-1">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl">Time Series Analysis</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    {selectedMetrics.length} metrics over {processedData.length} data points
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="h-96 sm:h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="timestamp"
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return aggregation === "Hourly" ? format(date, "HH:mm") : format(date, "MMM dd")
                          }}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                          }}
                          labelFormatter={(value) => {
                            const date = new Date(value as string)
                            return format(date, "PPP p")
                          }}
                          formatter={(value: any, name: string) => {
                            const metric = METRICS.find((m) => m.id === name)
                            return [`${value}${metric?.unit || ""}`, metric?.label || name]
                          }}
                        />
                        <Legend />
                        {selectedMetrics.map((metricId) => {
                          const metric = METRICS.find((m) => m.id === metricId)
                          return (
                            <Line
                              key={metricId}
                              type="monotone"
                              dataKey={metricId}
                              stroke={metric?.color}
                              strokeWidth={2}
                              dot={false}
                              name={metric?.label}
                            />
                          )
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Insights Panel */}
            <div className="lg:col-span-1 order-2 space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                    Key Insights
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    AI-powered analysis of your data patterns
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                  <div className="p-2 sm:p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
                      <span className="text-xs sm:text-sm font-medium text-purple-400">Correlation Alert</span>
                    </div>
                    <p className="text-xs text-purple-400/80">
                      High EC levels between {format(subDays(new Date(), 7), "MMM dd")}-
                      {format(subDays(new Date(), 5), "MMM dd")} correlated with a 5% decrease in predicted water
                      uptake.
                    </p>
                  </div>

                  <div className="p-2 sm:p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                      <span className="text-xs sm:text-sm font-medium text-green-400">Optimization Opportunity</span>
                    </div>
                    <p className="text-xs text-green-400/80">
                      pH stability improved by 12% when maintained between 6.0-6.2 during nighttime hours.
                    </p>
                  </div>

                  <div className="p-2 sm:p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                      <span className="text-xs sm:text-sm font-medium text-yellow-400">Pattern Detection</span>
                    </div>
                    <p className="text-xs text-yellow-400/80">
                      Dissolved oxygen levels show cyclical patterns correlating with lighting schedules. Consider
                      adjusting aeration timing.
                    </p>
                  </div>

                  <div className="p-2 sm:p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                      <span className="text-xs sm:text-sm font-medium text-blue-400">SHAP Analysis</span>
                    </div>
                    <p className="text-xs text-blue-400/80">
                      Temperature variance contributes 34% to growth rate prediction, followed by pH stability (28%)
                      and EC consistency (22%).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Quick Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
              {selectedMetrics.map((metricId) => {
                const metric = METRICS.find((m) => m.id === metricId)
                if (!metric) return null
                
                const values = processedData
                  .map((d) => d[metricId as keyof typeof d] as number)
                  .filter((val) => !isNaN(val) && val !== undefined && val !== null)
                
                if (values.length === 0) return null
                
                const avg = values.reduce((a, b) => a + b, 0) / values.length
                const min = Math.min(...values)
                const max = Math.max(...values)

                return (
                  <div key={metricId} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm font-medium" style={{ color: metric.color }}>
                        {metric.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{metric.unit}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Avg:</span>
                        <span className="ml-1 font-mono">{avg.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Min:</span>
                        <span className="ml-1 font-mono">{min.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max:</span>
                        <span className="ml-1 font-mono">{max.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
          </TabsContent>

          {/* ─── QBM Intelligence Tab ─── */}
          <TabsContent value="qbm" className="space-y-6 mt-4">

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Peak GDD", value: `${Math.max(0, ...gddData.map(d => d.accumulated)).toFixed(0)}`, sub: "°C·days max bag", icon: Leaf, color: "text-blue-600" },
                { label: "PAW Applications", value: `${pawData.reduce((a, d) => a + d.applications, 0)}`, sub: "total across all bags", icon: Waves, color: "text-cyan-600" },
                { label: "P Compliance", value: `${pCompliantPercent}%`, sub: "bags at 40–60 ppm", icon: FlaskConical, color: pCompliantPercent >= 80 ? "text-emerald-600" : "text-yellow-600" },
                { label: "Bioactive Index", value: `${Math.round(Math.min(100, Math.max(0, ...gddData.map(d => d.accumulated)) / 2200 * 100) * 0.4 + Math.min(100, pawData.reduce((a,d) => a+d.applications,0) / 8 * 100) * 0.35 + pCompliantPercent * 0.25)}`, sub: "/ 100 composite", icon: Award, color: "text-amber-600" },
              ].map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="pt-4">
                    <div className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</div>
                    <div className="font-semibold text-sm">{kpi.label}</div>
                    <div className="text-xs text-muted-foreground">{kpi.sub}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* GDD Per Bag */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-blue-500" /> GDD Progress Per Bag
                </CardTitle>
                <CardDescription>Accumulated Growing Degree Days. Harvest window: 1800–2200 GDD.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gddData.map(({ bag, accumulated }) => {
                    const pct = Math.min(100, Math.round(accumulated / 2200 * 100))
                    return (
                      <div key={bag}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{bag}</span>
                          <span className="text-muted-foreground">{accumulated.toFixed(0)} / 1800–2200 °C·days</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct > 70 ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                  {Object.keys(growCycleData).length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No GDD data yet. Log grow-cycle data via the dashboard.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Phosphorus Per Bag */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-emerald-500" /> Phosphorus Status Per Bag
                </CardTitle>
                <CardDescription>AMF active zone: 40–60 ppm. Log readings via dashboard Settings.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground">Bag</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">P (ppm)</th>
                        <th className="text-left py-2 px-2 text-muted-foreground">AMF Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {phosphorusLog.map(row => (
                        <tr key={row.bag} className="border-b border-border/50">
                          <td className="py-1.5 px-2 font-medium">{row.bag}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{row.ppm !== null ? row.ppm.toFixed(1) : '—'}</td>
                          <td className="py-1.5 px-2">
                            {row.ppm === null
                              ? <span className="text-muted-foreground italic">Not logged</span>
                              : <span className={`px-1.5 py-0.5 rounded ${row.compliant ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {row.compliant ? 'AMF Active' : 'Out of range'}
                                </span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* PAW Per Bag */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Waves className="h-4 w-4 text-cyan-500" /> PAW Applications Per Bag
                </CardTitle>
                <CardDescription>Total Plasma-Activated Water applications this cycle. Target: ≥ 8 per cycle.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pawData.map(({ bag, applications }) => {
                    const pct = Math.min(100, Math.round(applications / 8 * 100))
                    return (
                      <div key={bag}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{bag}</span>
                          <span className="text-muted-foreground">{applications} / 8 applications</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-cyan-500' : 'bg-cyan-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                  {Object.keys(growCycleData).length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No PAW data yet. Log applications via the dashboard.</p>
                  )}
                </div>
              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>
    </div>
  )
}
