"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"

interface SensorData {
  time: string
  value: number
}

interface SensorCardProps {
  title: string
  value: number
  unit: string
  icon: LucideIcon
  status: "good" | "warning" | "alert"
  trend: "up" | "down" | "stable"
  data: SensorData[]
}

const statusColors = {
  good: "bg-green-100 text-green-700 border-green-200",
  warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
  alert: "bg-red-100 text-red-700 border-red-200",
}

const statusLabels = {
  good: "Optimal",
  warning: "Warning",
  alert: "Alert",
}

export function SensorCard({ title, value, unit, icon: Icon, status, trend, data }: SensorCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

  return (
    <Card className="border-green-100 hover:border-green-300 transition-all duration-300 hover:shadow-xl group animate-slide-up overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-br from-green-50/80 via-green-50/40 to-transparent relative">
        <CardTitle className="text-sm font-semibold text-soil-950 group-hover:text-green-700 transition-colors duration-300">{title}</CardTitle>
        <div className="relative">
          <Icon className="h-6 w-6 text-green-700 group-hover:text-green-600 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3" />
          <div className="absolute inset-0 bg-green-400/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-500 opacity-0 group-hover:opacity-100"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-3xl font-bold sensor-data text-soil-950 group-hover:text-green-700 transition-all duration-300 data-highlight">
              {typeof value === "number" ? value.toFixed(1) : value}
              <span className="text-base font-medium text-soil-950/70 ml-2 transition-colors duration-300">{unit}</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" className={`${statusColors[status]} transition-all duration-300 group-hover:shadow-md status-indicator font-medium`}>
                {statusLabels[status]}
              </Badge>
              <div className="flex items-center text-xs text-soil-950/70 group-hover:text-soil-950 transition-colors duration-300">
                <TrendIcon className={`h-4 w-4 mr-1 transition-all duration-300 ${
                  trend === 'up' ? 'group-hover:translate-y-[-2px] text-green-600' : 
                  trend === 'down' ? 'group-hover:translate-y-[2px] text-red-500' : 
                  'text-gray-500'
                }`} />
                <span className="font-medium">{trend === "up" ? "Rising" : trend === "down" ? "Falling" : "Stable"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Sparkline Chart */}
        <div className="h-20 w-full rounded-lg overflow-hidden bg-gradient-to-r from-green-50/50 via-green-50/20 to-transparent border border-green-100/50 group-hover:border-green-200 transition-all duration-300 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Line
                type="monotone"
                dataKey="value"
                stroke={status === "good" ? "#15803d" : status === "warning" ? "#ea580c" : "#dc2626"}
                strokeWidth={3}
                dot={false}
                className="transition-all duration-300"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
