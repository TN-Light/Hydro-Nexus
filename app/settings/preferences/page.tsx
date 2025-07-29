"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { usePreferencesStore } from "@/lib/stores/preferences-store"
import { useTheme } from "next-themes"
import { Settings, Palette, Thermometer, BarChart3 } from "lucide-react"

export default function PreferencesPage() {
  const { preferences, updatePreferences } = usePreferencesStore()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light"
    setTheme(newTheme)
    updatePreferences({ theme: newTheme })
    toast({
      title: "Theme Updated",
      description: `Switched to ${newTheme} mode`,
    })
  }

  const handleTemperatureUnitChange = (value: "C" | "F") => {
    updatePreferences({
      units: { ...preferences.units, temperature: value },
    })
    toast({
      title: "Units Updated",
      description: `Temperature unit changed to ${value === "C" ? "Celsius" : "Fahrenheit"}`,
    })
  }

  const handleConcentrationUnitChange = (value: "ppm" | "mS/cm") => {
    updatePreferences({
      units: { ...preferences.units, concentration: value },
    })
    toast({
      title: "Units Updated",
      description: `Concentration unit changed to ${value}`,
    })
  }

  const handleDashboardRangeChange = (value: "12h" | "24h" | "3d" | "7d") => {
    updatePreferences({ dashboardDefaultRange: value })
    toast({
      title: "Dashboard Updated",
      description: `Default time range set to ${value}`,
    })
  }

  const handleSyncPreferences = () => {
    toast({
      title: "Preferences Synced",
      description: "All settings have been synchronized across devices",
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Theme Selection */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl dark:text-white">
            <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
            Theme Selection
          </CardTitle>
          <CardDescription className="text-sm sm:text-base dark:text-gray-300">
            Choose your preferred application theme
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="theme-toggle" className="text-sm sm:text-base font-medium dark:text-gray-300">
                Dark Mode
              </Label>
              <p className="text-xs sm:text-sm text-soil-950/70 dark:text-gray-400">
                Toggle between light and dark themes
              </p>
            </div>
            <Switch id="theme-toggle" checked={theme === "dark"} onCheckedChange={handleThemeChange} />
          </div>
        </CardContent>
      </Card>

      {/* Units of Measurement */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl dark:text-white">
            <Thermometer className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
            Units of Measurement
          </CardTitle>
          <CardDescription className="text-sm sm:text-base dark:text-gray-300">
            Set your preferred units for sensor data display
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
          {/* Temperature Units */}
          <div className="space-y-3">
            <Label className="text-sm sm:text-base font-medium dark:text-gray-300">Temperature</Label>
            <RadioGroup
              value={preferences.units.temperature}
              onValueChange={handleTemperatureUnitChange}
              className="flex flex-col sm:flex-row gap-4 sm:gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="C" id="celsius" />
                <Label htmlFor="celsius" className="text-sm sm:text-base dark:text-gray-300">
                  Celsius (°C)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="F" id="fahrenheit" />
                <Label htmlFor="fahrenheit" className="text-sm sm:text-base dark:text-gray-300">
                  Fahrenheit (°F)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Concentration Units */}
          <div className="space-y-3">
            <Label className="text-sm sm:text-base font-medium dark:text-gray-300">Nutrient Concentration</Label>
            <RadioGroup
              value={preferences.units.concentration}
              onValueChange={handleConcentrationUnitChange}
              className="flex flex-col sm:flex-row gap-4 sm:gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ppm" id="ppm" />
                <Label htmlFor="ppm" className="text-sm sm:text-base dark:text-gray-300">
                  Parts Per Million (ppm)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mS/cm" id="ec" />
                <Label htmlFor="ec" className="text-sm sm:text-base dark:text-gray-300">
                  Electrical Conductivity (mS/cm)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Defaults */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl dark:text-white">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
            Dashboard Defaults
          </CardTitle>
          <CardDescription className="text-sm sm:text-base dark:text-gray-300">
            Configure default settings for your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="space-y-3">
            <Label htmlFor="dashboard-range" className="text-sm sm:text-base font-medium dark:text-gray-300">
              Default Time Range
            </Label>
            <Select value={preferences.dashboardDefaultRange} onValueChange={handleDashboardRangeChange}>
              <SelectTrigger className="border-green-200 focus:border-green-500 w-full dark:bg-gray-800 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">Last 12 hours</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="3d">Last 3 days</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs sm:text-sm text-soil-950/70 dark:text-gray-400">
              This will be the default time range shown when you open the dashboard
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save All Changes */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-soil-950 text-sm sm:text-base dark:text-gray-300">
                Preferences Auto-Saved
              </p>
              <p className="text-xs sm:text-sm text-soil-950/70 dark:text-gray-400">
                All changes are automatically saved and synced across your devices
              </p>
            </div>
            <Button
              variant="outline"
              className="border-green-200 hover:border-green-400 bg-transparent w-full sm:w-auto dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={handleSyncPreferences}
            >
              <Settings className="h-4 w-4 mr-2" />
              Sync Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
