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
    <Card className="border-green-100 hover:border-green-300 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-soil-950">{title}</CardTitle>
        <Icon className="h-4 w-4 text-green-700" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-bold sensor-data text-soil-950">
              {typeof value === "number" ? value.toFixed(1) : value}
              <span className="text-sm font-normal text-soil-950/70 ml-1">{unit}</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" className={statusColors[status]}>
                {statusLabels[status]}
              </Badge>
              <div className="flex items-center text-xs text-soil-950/70">
                <TrendIcon className="h-3 w-3 mr-1" />
                <span>{trend === "up" ? "Rising" : trend === "down" ? "Falling" : "Stable"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Sparkline Chart */}
        <div className="h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Line
                type="monotone"
                dataKey="value"
                stroke={status === "good" ? "#15803d" : status === "warning" ? "#ca8a04" : "#dc2626"}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
