"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { CalendarIcon, BarChart3, TrendingUp, Brain, Download } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { redirect } from "next/navigation"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { cn } from "@/lib/utils"

interface HistoricalDataPoint {
  timestamp: string
  deviceId: string
  cropType: string
  waterTemp: number
  pH: number
  ec: number
  orp: number
  do: number
  humidity: number
}

const METRICS = [
  { id: "waterTemp", label: "Water Temperature", color: "#ef4444", unit: "°C" },
  { id: "pH", label: "pH Level", color: "#8b5cf6", unit: "" },
  { id: "ec", label: "EC", color: "#06b6d4", unit: "mS/cm" },
  { id: "orp", label: "ORP", color: "#f59e0b", unit: "mV" },
  { id: "do", label: "Dissolved Oxygen", color: "#10b981", unit: "mg/L" },
  { id: "humidity", label: "Humidity", color: "#6366f1", unit: "%" },
]

const CROP_TYPES = ["All", "Tomato", "Lettuce", "Basil", "Spinach"]
const GROW_BAGS = ["All", "grow-bag-1", "grow-bag-2", "grow-bag-3", "grow-bag-4", "grow-bag-5", "grow-bag-6"]

export default function AnalyticsPage() {
  const { user, isLoading } = useAuth()
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [aggregation, setAggregation] = useState("Daily")
  const [selectedMetrics, setSelectedMetrics] = useState(["waterTemp", "pH", "ec"])
  const [cropType, setCropType] = useState("All")
  const [growBag, setGrowBag] = useState("All")
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [extendedMockData, setExtendedMockData] = useState<HistoricalDataPoint[]>([])
  const [isDataReady, setIsDataReady] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      redirect("/login")
    }
  }, [user, isLoading])

  // Generate extended mock data for the last 90 days on client side only
  useEffect(() => {
    const data: HistoricalDataPoint[] = []
    const startDate = subDays(new Date(), 90)

    for (let day = 0; day < 90; day++) {
      for (let hour = 0; hour < 24; hour += 1) {
        const timestamp = new Date(startDate)
        timestamp.setDate(timestamp.getDate() + day)
        timestamp.setHours(hour, 0, 0, 0)

        GROW_BAGS.slice(1).forEach((bagId, index) => {
          const cropTypes = ["Tomato", "Lettuce", "Basil", "Spinach"]
          const cropType = cropTypes[index % cropTypes.length]

          // Add some realistic variation and trends
          const dayFactor = Math.sin((day / 90) * 2 * Math.PI) * 0.5
          const hourFactor = Math.sin((hour / 24) * 2 * Math.PI) * 0.3
          const randomFactor = (Math.random() - 0.5) * 0.2

          data.push({
            timestamp: timestamp.toISOString(),
            deviceId: bagId,
            cropType,
            waterTemp: 22 + dayFactor * 3 + hourFactor * 2 + randomFactor * 2,
            pH: 6.0 + dayFactor * 0.4 + hourFactor * 0.2 + randomFactor * 0.3,
            ec: 1.8 + dayFactor * 0.5 + hourFactor * 0.3 + randomFactor * 0.4,
            orp: 280 + dayFactor * 40 + hourFactor * 20 + randomFactor * 30,
            do: 7.0 + dayFactor * 1.0 + hourFactor * 0.5 + randomFactor * 0.8,
            humidity: 70 + dayFactor * 10 + hourFactor * 5 + randomFactor * 8,
          })
        })
      }
    }
    setExtendedMockData(data)
    setIsDataReady(true)
  }, [])

  // Filter and aggregate data
  const processedData = useMemo(() => {
    if (!isDataReady || extendedMockData.length === 0) return []
    
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
          waterTemp: 0,
          pH: 0,
          ec: 0,
          orp: 0,
          do: 0,
          humidity: 0,
        }
      }

      aggregated[key].count++
      aggregated[key].waterTemp += point.waterTemp
      aggregated[key].pH += point.pH
      aggregated[key].ec += point.ec
      aggregated[key].orp += point.orp
      aggregated[key].do += point.do
      aggregated[key].humidity += point.humidity
    })

    // Calculate averages
    return Object.values(aggregated)
      .map((item: any) => ({
        timestamp: item.timestamp,
        waterTemp: Number((item.waterTemp / item.count).toFixed(2)),
        pH: Number((item.pH / item.count).toFixed(2)),
        ec: Number((item.ec / item.count).toFixed(2)),
        orp: Number((item.orp / item.count).toFixed(0)),
        do: Number((item.do / item.count).toFixed(2)),
        humidity: Number((item.humidity / item.count).toFixed(1)),
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }, [extendedMockData, dateRange, aggregation, cropType, growBag])

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics((prev) => (prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId]))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-soil-950/70 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-soil-950 dark:text-white">Analytics Studio</h1>
            <p className="text-soil-950/70 text-sm sm:text-base dark:text-gray-300">
              Explore historical sensor data and identify trends over time
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Badge variant="outline" className="border-green-200 justify-center sm:justify-start">
              <BarChart3 className="h-3 w-3 mr-1" />
              {processedData.length} data points
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="border-green-200 hover:border-green-400 bg-transparent text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Control Panel */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
              Analysis Controls
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">Configure your data analysis parameters</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Date Range Selector */}
              <div className="flex flex-col space-y-2 sm:col-span-2 xl:col-span-1">
                <label className="block text-sm font-medium">Date Range</label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-green-200 hover:border-green-400 bg-transparent text-xs sm:text-sm",
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
                  <SelectTrigger className="border-green-200 focus:border-green-500 text-xs sm:text-sm">
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
                  <SelectTrigger className="border-green-200 focus:border-green-500 text-xs sm:text-sm">
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
                  <SelectTrigger className="border-green-200 focus:border-green-500 text-xs sm:text-sm">
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
              <div className="space-y-2 sm:col-span-2 xl:col-span-2">
                <label className="text-sm font-medium">Metrics</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {METRICS.map((metric) => (
                    <div key={metric.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric.id}
                        checked={selectedMetrics.includes(metric.id)}
                        onCheckedChange={() => handleMetricToggle(metric.id)}
                      />
                      <label
                        htmlFor={metric.id}
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
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
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
          {/* Main Chart */}
          <div className="xl:col-span-3 order-1">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Time Series Analysis</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {selectedMetrics.length} metrics over {isDataReady ? processedData.length : 0} data points
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {isDataReady ? (
                  <div className="h-80 sm:h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="timestamp"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return aggregation === "Hourly" ? format(date, "HH:mm") : format(date, "MMM dd")
                          }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
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
                ) : (
                  <div className="h-80 sm:h-96 w-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto mb-2"></div>
                      <p className="text-sm text-soil-950/70 dark:text-gray-400">Loading chart data...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Insights Panel */}
          <div className="xl:col-span-1 order-2 space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  Key Insights
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  AI-powered analysis of your data patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                <div className="p-2 sm:p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                    <span className="text-xs sm:text-sm font-medium text-purple-800">Correlation Alert</span>
                  </div>
                  <p className="text-xs text-purple-700">
                    High EC levels between {format(subDays(new Date(), 7), "MMM dd")}-
                    {format(subDays(new Date(), 5), "MMM dd")} correlated with a 5% decrease in predicted water uptake.
                  </p>
                </div>

                  <div className="p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200 dark:bg-gray-800 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                    <span className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-400">
                      Optimization Opportunity
                    </span>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    pH stability improved by 12% when maintained between 6.0-6.2 during nighttime hours.
                  </p>
                </div>

                <div className="p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200 dark:bg-gray-800 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
                    <span className="text-xs sm:text-sm font-medium text-yellow-800 dark:text-yellow-400">
                      Pattern Detection
                    </span>
                  </div>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Dissolved oxygen levels show cyclical patterns correlating with lighting schedules. Consider
                    adjusting aeration timing.
                  </p>
                </div>

                <div className="p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200 dark:bg-gray-800 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    <span className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-400">
                      SHAP Analysis
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Temperature variance contributes 34% to growth rate prediction, followed by pH stability (28%) and
                    EC consistency (22%).
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg dark:text-white">Quick Statistics</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
                {isDataReady ? (
                  selectedMetrics.slice(0, 3).map((metricId) => {
                    const metric = METRICS.find((m) => m.id === metricId)
                    const values = processedData.map((d) => d[metricId as keyof typeof d] as number)
                    const avg = values.reduce((a, b) => a + b, 0) / values.length
                    const min = Math.min(...values)
                    const max = Math.max(...values)

                    return (
                      <div key={metricId} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm font-medium dark:text-gray-300">{metric?.label}</span>
                          <span className="text-xs text-soil-950/70 dark:text-gray-400">{metric?.unit}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-soil-950/70 dark:text-gray-400">Avg:</span>
                            <span className="ml-1 font-mono dark:text-white">{avg.toFixed(1)}</span>
                          </div>
                          <div>
                            <span className="text-soil-950/70 dark:text-gray-400">Min:</span>
                            <span className="ml-1 font-mono dark:text-white">{min.toFixed(1)}</span>
                          </div>
                          <div>
                            <span className="text-soil-950/70 dark:text-gray-400">Max:</span>
                            <span className="ml-1 font-mono dark:text-white">{max.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700 mx-auto mb-2"></div>
                    <p className="text-xs text-soil-950/70 dark:text-gray-400">Loading statistics...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
