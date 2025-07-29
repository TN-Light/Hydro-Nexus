"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Info, X } from "lucide-react"
import { useState } from "react"

interface Alert {
  id: string
  deviceId: string
  message: string
  severity: "info" | "warning" | "error"
  timestamp: string
}

interface AlertPanelProps {
  alerts: Alert[]
}

const severityConfig = {
  info: {
    icon: Info,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    bgColor: "bg-blue-50",
  },
  warning: {
    icon: AlertTriangle,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    bgColor: "bg-yellow-50",
  },
  error: {
    icon: AlertTriangle,
    color: "bg-red-100 text-red-700 border-red-200",
    bgColor: "bg-red-50",
  },
}

export function AlertPanel({ alerts }: AlertPanelProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id))

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]))
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          Recent Alerts
        </CardTitle>
        <CardDescription>Latest system notifications and warnings</CardDescription>
      </CardHeader>
      <CardContent>
        {visibleAlerts.length === 0 ? (
          <div className="text-center py-8 text-soil-950/70 dark:text-gray-400">
            <Info className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p>No recent alerts</p>
            <p className="text-sm">All systems operating normally</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {visibleAlerts.map((alert) => {
                const config = severityConfig[alert.severity]
                const Icon = config.icon

                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${config.bgColor} border-opacity-50 dark:bg-gray-800 dark:border-gray-700`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Icon className="h-4 w-4 mt-0.5 text-current" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="outline" className={config.color}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-soil-950/70 font-mono dark:text-gray-400">
                              {alert.deviceId.replace("grow-bag-", "Bag ")}
                            </span>
                          </div>
                          <p className="text-sm text-soil-950 mb-1 dark:text-white">{alert.message}</p>
                          <p className="text-xs text-soil-950/70 dark:text-gray-400">
                            {formatTime(alert.timestamp)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-white/50"
                        onClick={() => dismissAlert(alert.id)}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Dismiss alert</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        {visibleAlerts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-green-100 dark:border-gray-700">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-green-200 hover:border-green-400 bg-transparent dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={() => setDismissedAlerts(new Set(alerts.map((a) => a.id)))}
            >
              Dismiss All Alerts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
