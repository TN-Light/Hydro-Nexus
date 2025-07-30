"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import { useRealtime } from "@/components/realtime-provider"
import { Badge } from "@/components/ui/badge"

export function NotificationsPanel() {
  const { alerts } = useRealtime()
  const unreadAlerts = alerts.filter(
    (alert) => Date.now() - new Date(alert.timestamp).getTime() < 5 * 60 * 1000, // Last 5 minutes
  ).length

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="View notifications">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          {unreadAlerts > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 text-xs bg-red-500 text-white">
              {unreadAlerts}
            </Badge>
          )}
          <span className="sr-only">View notifications</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Here are the latest updates and alerts from your system.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          {alerts.length === 0 ? (
            <p>No new notifications.</p>
          ) : (
            <ul>
              {alerts.map((alert) => (
                <li key={alert.id} className="mb-2">
                  <div className="font-bold">{alert.message}</div>
                  <div className="text-sm text-gray-500">{new Date(alert.timestamp).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
