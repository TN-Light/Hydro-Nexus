"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Smartphone,
  Wifi,
  Battery,
  Download,
  Settings,
  RefreshCw,
} from "lucide-react"
import { useState, useEffect } from "react"
import { redirect } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import mockDevices from "@/data/mock-devices.json"

interface Device {
  id: string
  nickname: string
  status: "active" | "warning" | "inactive"
  lastPing: string
  rssi: number
  battery: number
  healthScore: number
  firmwareVersion: string
  location: string
  uptime: string
}

const statusConfig = {
  active: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
    borderColor: "border-green-200",
    label: "Online",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-200",
    label: "Warning",
  },
  inactive: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-200",
    label: "Offline",
  },
}

export default function DevicesPage() {
  const { user, isLoading } = useAuth()
  const { toast } = useToast()
  const [refreshKey, setRefreshKey] = useState(0)
  const [devices, setDevices] = useState<Device[]>(mockDevices as Device[])
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [calibrationValues, setCalibrationValues] = useState({
    phOffset: "0.0",
    ecOffset: "0.0",
    tempOffset: "0.0",
    doOffset: "0.0",
  })

  useEffect(() => {
    if (!isLoading && !user) {
      redirect("/login")
    }
  }, [user, isLoading])

  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device)
    setIsModalOpen(true)
    // Reset calibration values when opening modal
    setCalibrationValues({
      phOffset: "0.0",
      ecOffset: "0.0",
      tempOffset: "0.0",
      doOffset: "0.0",
    })
  }

  const handleFirmwareUpdate = async () => {
    if (!selectedDevice) return

    setIsUpdating(true)

    // Simulate firmware update
    await new Promise((resolve) => setTimeout(resolve, 2000))

    toast({
      title: "Firmware Update Queued",
      description: `Firmware update for '${selectedDevice.nickname}' has been queued successfully!`,
    })

    setIsUpdating(false)
  }

  const handleCalibrationSave = async () => {
    if (!selectedDevice) return

    // Simulate calibration save
    await new Promise((resolve) => setTimeout(resolve, 1000))

    toast({
      title: "Calibration Saved",
      description: `Calibration values for '${selectedDevice.nickname}' have been updated successfully!`,
    })

    setIsModalOpen(false)
  }

  const getRSSIStrength = (rssi: number) => {
    if (rssi >= -50) return { label: "Excellent", color: "text-green-600" }
    if (rssi >= -60) return { label: "Good", color: "text-green-500" }
    if (rssi >= -70) return { label: "Fair", color: "text-yellow-500" }
    if (rssi >= -80) return { label: "Poor", color: "text-red-500" }
    return { label: "Very Poor", color: "text-red-600" }
  }

  const getBatteryColor = (battery: number) => {
    if (battery >= 80) return "text-green-600"
    if (battery >= 50) return "text-yellow-600"
    if (battery >= 20) return "text-orange-600"
    return "text-red-600"
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    if (score >= 50) return "text-orange-600"
    return "text-red-600"
  }

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
    // Simulate refreshing device data
    const updatedDevices = mockDevices.map((device) => ({
      ...device,
      lastPing: new Date().toISOString(),
      battery: Math.max(10, Math.min(100, device.battery + (Math.random() - 0.5) * 10)),
      healthScore: Math.max(20, Math.min(100, device.healthScore + (Math.random() - 0.5) * 5)),
    }))
    setDevices(updatedDevices)

    toast({
      title: "Devices Refreshed",
      description: "Device list has been updated with latest data",
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-soil-950/70">Loading devices...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const activeDevices = devices.filter((d) => d.status === "active").length
  const warningDevices = devices.filter((d) => d.status === "warning").length
  const inactiveDevices = devices.filter((d) => d.status === "inactive").length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-soil-950 dark:text-white">Device Manager</h1>
            <p className="text-soil-950/70 dark:text-gray-300">Monitor and manage all connected IoT devices</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-green-200 dark:text-gray-300">
              <Smartphone className="h-3 w-3 mr-1" />
              {devices.length} Total Devices
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="border-green-200 hover:border-green-400 bg-transparent dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-soil-950/70 dark:text-gray-400">Total Devices</p>
                  <p className="text-2xl font-bold text-soil-950 dark:text-white">{devices.length}</p>
                </div>
                <Smartphone className="h-8 w-8 text-green-700" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-soil-950/70 dark:text-gray-400">Online</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeDevices}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-soil-950/70 dark:text-gray-400">Warning</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{warningDevices}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-soil-950/70 dark:text-gray-400">Offline</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{inactiveDevices}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device Table */}
        <Card>
          <CardHeader>
            <CardTitle className="dark:text-white">Device List</CardTitle>
            <CardDescription className="dark:text-gray-300">
              Click on any device to view details and manage settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Device Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Last Ping</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Battery</TableHead>
                    <TableHead>Health Score</TableHead>
                    <TableHead>Firmware</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => {
                    const config = statusConfig[device.status]
                    const StatusIcon = config.icon
                    const rssiStrength = getRSSIStrength(device.rssi)

                    return (
                      <TableRow
                        key={device.id}
                        className="cursor-pointer hover:bg-green-50 transition-colors"
                        onClick={() => handleDeviceClick(device)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${config.color}`} />
                            <Badge
                              variant="outline"
                              className={`${config.bgColor} ${config.borderColor} ${config.color}`}
                            >
                              {config.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-soil-950 dark:text-white">{device.nickname}</div>
                            <div className="text-xs text-soil-950/70 dark:text-gray-400">{device.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-soil-950 dark:text-white">{device.location}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-soil-950 dark:text-white">
                            {formatDistanceToNow(new Date(device.lastPing), { addSuffix: true })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Wifi className="h-4 w-4 text-soil-950/70 dark:text-gray-400" />
                            <span className={`text-sm font-mono ${rssiStrength.color}`}>{device.rssi} dBm</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Battery className={`h-4 w-4 ${getBatteryColor(device.battery)}`} />
                            <span className={`text-sm font-mono ${getBatteryColor(device.battery)}`}>
                              {device.battery}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-mono ${getHealthScoreColor(device.healthScore)}`}>
                            {device.healthScore}/100
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono text-soil-950 dark:text-white">
                            {device.firmwareVersion}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Device Details Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-white">
                <Smartphone className="h-5 w-5 text-green-700" />
                {selectedDevice?.nickname}
              </DialogTitle>
              <DialogDescription className="dark:text-gray-300">
                Device management and configuration for {selectedDevice?.id}
              </DialogDescription>
            </DialogHeader>

            {selectedDevice && (
              <div className="space-y-6">
                {/* Device Status */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg dark:bg-gray-800">
                    <div className="text-sm text-soil-950/70 dark:text-gray-400">Status</div>
                    <div className={`font-semibold ${statusConfig[selectedDevice.status].color}`}>
                      {statusConfig[selectedDevice.status].label}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg dark:bg-gray-800">
                    <div className="text-sm text-soil-950/70 dark:text-gray-400">Uptime</div>
                    <div className="font-semibold text-soil-950 dark:text-white">{selectedDevice.uptime}</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg dark:bg-gray-800">
                    <div className="text-sm text-soil-950/70 dark:text-gray-400">Battery</div>
                    <div className={`font-semibold ${getBatteryColor(selectedDevice.battery)}`}>
                      {selectedDevice.battery}%
                    </div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg dark:bg-gray-800">
                    <div className="text-sm text-soil-950/70 dark:text-gray-400">Health</div>
                    <div className={`font-semibold ${getHealthScoreColor(selectedDevice.healthScore)}`}>
                      {selectedDevice.healthScore}/100
                    </div>
                  </div>
                </div>

                {/* Battery Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="dark:text-gray-300">Battery Level</Label>
                    <span className="text-sm text-soil-950/70 dark:text-gray-400">{selectedDevice.battery}%</span>
                  </div>
                  <Progress value={selectedDevice.battery} className="h-2" />
                </div>

                {/* OTA Firmware Update */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                      <Download className="h-4 w-4 text-blue-600" />
                      OTA Firmware Update
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium dark:text-gray-300">Current Version</div>
                        <div className="text-sm text-soil-950/70 font-mono dark:text-gray-400">
                          {selectedDevice.firmwareVersion}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium dark:text-gray-300">Latest Version</div>
                        <div className="text-sm text-green-600 font-mono dark:text-green-400">v2.1.4</div>
                      </div>
                    </div>
                    <Button
                      onClick={handleFirmwareUpdate}
                      disabled={isUpdating}
                      className="w-full agriculture-gradient text-white hover:opacity-90"
                    >
                      {isUpdating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Initiating Update...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Initiate Update
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Calibration Assist */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                      <Settings className="h-4 w-4 text-purple-600" />
                      Calibration Assist
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ph-offset" className="dark:text-gray-300">
                          pH Offset
                        </Label>
                        <Input
                          id="ph-offset"
                          type="number"
                          step="0.1"
                          value={calibrationValues.phOffset}
                          onChange={(e) => setCalibrationValues((prev) => ({ ...prev, phOffset: e.target.value }))}
                          className="border-green-200 focus:border-green-500 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ec-offset" className="dark:text-gray-300">
                          EC Offset (mS/cm)
                        </Label>
                        <Input
                          id="ec-offset"
                          type="number"
                          step="0.1"
                          value={calibrationValues.ecOffset}
                          onChange={(e) => setCalibrationValues((prev) => ({ ...prev, ecOffset: e.target.value }))}
                          className="border-green-200 focus:border-green-500 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="temp-offset" className="dark:text-gray-300">
                          Temperature Offset (°C)
                        </Label>
                        <Input
                          id="temp-offset"
                          type="number"
                          step="0.1"
                          value={calibrationValues.tempOffset}
                          onChange={(e) => setCalibrationValues((prev) => ({ ...prev, tempOffset: e.target.value }))}
                          className="border-green-200 focus:border-green-500 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="do-offset" className="dark:text-gray-300">
                          DO Offset (mg/L)
                        </Label>
                        <Input
                          id="do-offset"
                          type="number"
                          step="0.1"
                          value={calibrationValues.doOffset}
                          onChange={(e) => setCalibrationValues((prev) => ({ ...prev, doOffset: e.target.value }))}
                          className="border-green-200 focus:border-green-500 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleCalibrationSave}
                      variant="outline"
                      className="w-full border-green-200 hover:border-green-400 bg-transparent dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Save Calibration
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
