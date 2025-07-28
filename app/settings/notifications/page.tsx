"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { usePreferencesStore } from "@/lib/stores/preferences-store"
import { Bell, Smartphone, Mail, Monitor } from "lucide-react"

const alertTypes = [
  { id: "ph_critical", name: "pH Level Critical", description: "When pH goes below 5.0 or above 7.0" },
  { id: "ec_range", name: "EC Level Out of Range", description: "When EC is outside optimal range" },
  { id: "do_low", name: "Dissolved Oxygen Low", description: "When DO drops below 4.0 mg/L" },
  { id: "orp_low", name: "ORP Level Low", description: "When ORP falls below 200 mV" },
  { id: "high_humidity", name: "High Humidity Warning", description: "When humidity exceeds 90%" },
  { id: "device_offline", name: "Device Offline", description: "When a device stops responding" },
]

const deliveryChannels = [
  { id: "in_app", name: "In-App Banner", icon: Monitor },
  { id: "push", name: "Push Notification", icon: Smartphone },
  { id: "email", name: "Email", icon: Mail },
]

export default function NotificationsPage() {
  const { notificationSettings, updateNotificationSettings, updateNotificationRule } = usePreferencesStore()
  const { toast } = useToast()

  const handleMasterToggle = (enabled: boolean) => {
    updateNotificationSettings({ masterEnabled: enabled })
    toast({
      title: enabled ? "Notifications Enabled" : "Notifications Disabled",
      description: enabled ? "You will receive alerts based on your settings" : "All notifications have been disabled",
    })
  }

  const handleRuleToggle = (ruleId: string, enabled: boolean) => {
    if (enabled) {
      updateNotificationRule(ruleId, ["in_app"])
    } else {
      updateNotificationRule(ruleId, [])
    }

    const alertName = alertTypes.find((a) => a.id === ruleId)?.name
    toast({
      title: `${alertName} ${enabled ? "Enabled" : "Disabled"}`,
      description: enabled ? "You will receive in-app notifications for this alert" : "This alert has been disabled",
    })
  }

  const handleChannelToggle = (ruleId: string, channelId: string, enabled: boolean) => {
    const currentChannels = notificationSettings.rules[ruleId as keyof typeof notificationSettings.rules] || []
    let newChannels: string[]

    if (enabled) {
      newChannels = [...currentChannels, channelId]
    } else {
      newChannels = currentChannels.filter((c) => c !== channelId)
    }

    updateNotificationRule(ruleId, newChannels)

    const channelName = deliveryChannels.find((c) => c.id === channelId)?.name
    toast({
      title: `${channelName} ${enabled ? "Enabled" : "Disabled"}`,
      description: `${channelName} notifications ${enabled ? "enabled" : "disabled"} for this alert`,
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Master Control */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
            Notification Controls
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Manage how and when you receive alerts from your system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200 gap-4">
            <div className="space-y-1">
              <Label htmlFor="master-notifications" className="text-sm sm:text-base font-medium">
                Enable All Notifications
              </Label>
              <p className="text-xs sm:text-sm text-soil-950/70">
                Master switch to enable or disable all notification types
              </p>
            </div>
            <Switch
              id="master-notifications"
              checked={notificationSettings.masterEnabled}
              onCheckedChange={handleMasterToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alert Rules */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Alert Rules</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Configure which alerts you want to receive and how
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
          {alertTypes.map((alert) => {
            const isEnabled =
              (notificationSettings.rules[alert.id as keyof typeof notificationSettings.rules] || []).length > 0
            const enabledChannels =
              notificationSettings.rules[alert.id as keyof typeof notificationSettings.rules] || []

            return (
              <div key={alert.id} className="space-y-4 p-3 sm:p-4 border border-green-100 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Label className="text-sm sm:text-base font-medium">{alert.name}</Label>
                      {isEnabled && (
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-700 border-green-200 self-start sm:self-center"
                        >
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-soil-950/70">{alert.description}</p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleRuleToggle(alert.id, checked)}
                    disabled={!notificationSettings.masterEnabled}
                  />
                </div>

                {/* Delivery Channels */}
                {isEnabled && notificationSettings.masterEnabled && (
                  <div className="ml-0 sm:ml-4 space-y-3 border-l-0 sm:border-l-2 border-green-200 pl-0 sm:pl-4">
                    <Label className="text-xs sm:text-sm font-medium text-soil-950/80">Delivery Channels:</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {deliveryChannels.map((channel) => {
                        const ChannelIcon = channel.icon
                        const isChannelEnabled = enabledChannels.includes(channel.id)

                        return (
                          <div key={channel.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${alert.id}-${channel.id}`}
                              checked={isChannelEnabled}
                              onCheckedChange={(checked) =>
                                handleChannelToggle(alert.id, channel.id, checked as boolean)
                              }
                            />
                            <Label
                              htmlFor={`${alert.id}-${channel.id}`}
                              className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                            >
                              <ChannelIcon className="h-3 w-3 sm:h-4 sm:w-4 text-soil-950/70" />
                              {channel.name}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Notification Summary */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Notification Summary</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Overview of your current notification settings
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-green-700">
                {Object.values(notificationSettings.rules).filter((rule) => rule.length > 0).length}
              </div>
              <div className="text-xs sm:text-sm text-soil-950/70">Active Alerts</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-blue-700">
                {
                  Object.values(notificationSettings.rules)
                    .flat()
                    .filter((channel) => channel === "push").length
                }
              </div>
              <div className="text-xs sm:text-sm text-soil-950/70">Push Notifications</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-purple-700">
                {
                  Object.values(notificationSettings.rules)
                    .flat()
                    .filter((channel) => channel === "email").length
                }
              </div>
              <div className="text-xs sm:text-sm text-soil-950/70">Email Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
