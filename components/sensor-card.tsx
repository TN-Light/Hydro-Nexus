"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Line } from "@/components/ui/recharts/line"
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

import { useTheme } from "next-themes"
import { useMemo } from "react"

const statusColors = {
  light: {
    good: "bg-green-100 text-green-700 border-green-200",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
    alert: "bg-red-100 text-red-700 border-red-200",
  },
  dark: {
    good: "bg-green-900/50 text-green-400 border-green-800",
    warning: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
    alert: "bg-red-900/50 text-red-400 border-red-800",
  },
}

const statusLabels = {
  good: "Optimal",
  warning: "Warning",
  alert: "Alert",
}

const lineColors = {
  light: {
    good: "#15803d",
    warning: "#ca8a04",
    alert: "#dc2626",
  },
  dark: {
    good: "#22c55e",
    warning: "#facc15",
    alert: "#f87171",
  },
}

export function SensorCard({ title, value, unit, icon: Icon, status, trend, data }: SensorCardProps) {
  const { theme } = useTheme()
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

  const currentStatusColors = useMemo(() => {
    return theme === "dark" ? statusColors.dark : statusColors.light
  }, [theme])

  const currentLineColors = useMemo(() => {
    return theme === "dark" ? lineColors.dark : lineColors.light
  }, [theme])

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-bold sensor-data text-foreground">
              {typeof value === "number" ? value.toFixed(1) : value}
              <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" className={currentStatusColors[status]}>
                {statusLabels[status]}
              </Badge>
              <div className="flex items-center text-xs text-muted-foreground">
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
                stroke={currentLineColors[status]}
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
