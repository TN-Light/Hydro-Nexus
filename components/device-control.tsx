"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  Power, 
  Droplets, 
  Beaker, 
  Settings, 
  Play, 
  Square,
  Zap,
  Thermometer,
  Gauge
} from 'lucide-react'

interface DeviceControlProps {
  deviceId: string
  isOnline?: boolean
}

export function DeviceControl({ deviceId, isOnline = false }: DeviceControlProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [pumpStates, setPumpStates] = useState({
    water_pump: false,
    nutrient_pump: false
  })
  
  const [settings, setSettings] = useState({
    target_ph_min: 5.5,
    target_ph_max: 6.5,
    target_ec_min: 1.2,
    target_ec_max: 2.0,
    auto_control_enabled: true,
    pump_duration_ms: 5000
  })

  const sendCommand = async (action: string, parameters: any = {}) => {
    if (!isOnline) {
      toast({
        title: "Device Offline",
        description: "Cannot send commands to offline devices",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/devices/${deviceId}/commands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          parameters,
          priority: 'normal'
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Command Sent",
          description: `${action} command queued for ${deviceId}`,
        })
      } else {
        throw new Error(data.error || 'Failed to send command')
      }
    } catch (error) {
      console.error('Error sending command:', error)
      toast({
        title: "Command Failed",
        description: `Failed to send ${action} command`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePumpControl = async (pumpType: 'water_pump' | 'nutrient_pump', state: boolean) => {
    const action = state ? `${pumpType}_on` : `${pumpType}_off`
    await sendCommand(action, { duration_ms: settings.pump_duration_ms })
    
    setPumpStates(prev => ({
      ...prev,
      [pumpType]: state
    }))
  }

  const handleSettingsUpdate = async () => {
    await sendCommand('update_settings', { settings })
    toast({
      title: "Settings Updated",
      description: "New parameters sent to device",
    })
  }

  const handleAutoAdjust = async (type: 'ph' | 'ec') => {
    await sendCommand(`auto_adjust_${type}`)
  }

  return (
    <div className="space-y-6">
      {/* Device Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                Device Control - {deviceId.replace('grow-bag-', 'Grow Bag ')}
              </CardTitle>
              <CardDescription>
                Remote control and automation settings
              </CardDescription>
            </div>
            <Badge variant={isOnline ? "default" : "secondary"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Pump Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Pump Control
          </CardTitle>
          <CardDescription>
            Manual pump control and monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Water Pump */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Droplets className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Water Pump</p>
                <p className="text-sm text-muted-foreground">
                  Main irrigation pump
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={pumpStates.water_pump ? "default" : "outline"}>
                {pumpStates.water_pump ? "ON" : "OFF"}
              </Badge>
              <Button
                variant={pumpStates.water_pump ? "destructive" : "default"}
                size="sm"
                onClick={() => handlePumpControl('water_pump', !pumpStates.water_pump)}
                disabled={isLoading || !isOnline}
              >
                {pumpStates.water_pump ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {pumpStates.water_pump ? "Stop" : "Start"}
              </Button>
            </div>
          </div>

          {/* Nutrient Pump */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Beaker className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Nutrient Pump</p>
                <p className="text-sm text-muted-foreground">
                  EC/PPM adjustment pump
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={pumpStates.nutrient_pump ? "default" : "outline"}>
                {pumpStates.nutrient_pump ? "ON" : "OFF"}
              </Badge>
              <Button
                variant={pumpStates.nutrient_pump ? "destructive" : "default"}
                size="sm"
                onClick={() => handlePumpControl('nutrient_pump', !pumpStates.nutrient_pump)}
                disabled={isLoading || !isOnline}
              >
                {pumpStates.nutrient_pump ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {pumpStates.nutrient_pump ? "Stop" : "Start"}
              </Button>
            </div>
          </div>

          {/* Pump Duration Setting */}
          <div className="space-y-2">
            <Label htmlFor="pump-duration">Pump Duration (ms)</Label>
            <Input
              id="pump-duration"
              type="number"
              value={settings.pump_duration_ms}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                pump_duration_ms: parseInt(e.target.value) || 5000
              }))}
              min="1000"
              max="30000"
              step="1000"
            />
            <p className="text-xs text-muted-foreground">
              How long pumps run when activated (1-30 seconds)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto Adjustment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Adjustments
          </CardTitle>
          <CardDescription>
            Immediate parameter corrections
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => handleAutoAdjust('ph')}
            disabled={isLoading || !isOnline}
          >
            <Gauge className="h-4 w-4 mr-2" />
            Auto Adjust pH
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAutoAdjust('ec')}
            disabled={isLoading || !isOnline}
          >
            <Thermometer className="h-4 w-4 mr-2" />
            Auto Adjust EC
          </Button>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automation Settings
          </CardTitle>
          <CardDescription>
            Configure automatic control parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Control Enable */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Automatic Control</p>
              <p className="text-sm text-muted-foreground">
                Enable autonomous parameter adjustment
              </p>
            </div>
            <Switch
              checked={settings.auto_control_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                auto_control_enabled: checked
              }))}
            />
          </div>

          <Separator />

          {/* pH Range */}
          <div className="space-y-4">
            <h4 className="font-medium">pH Range</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ph-min">Minimum pH</Label>
                <Input
                  id="ph-min"
                  type="number"
                  value={settings.target_ph_min}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    target_ph_min: parseFloat(e.target.value) || 5.5
                  }))}
                  min="4.0"
                  max="8.0"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ph-max">Maximum pH</Label>
                <Input
                  id="ph-max"
                  type="number"
                  value={settings.target_ph_max}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    target_ph_max: parseFloat(e.target.value) || 6.5
                  }))}
                  min="4.0"
                  max="8.0"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* EC Range */}
          <div className="space-y-4">
            <h4 className="font-medium">EC Range (mS/cm)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ec-min">Minimum EC</Label>
                <Input
                  id="ec-min"
                  type="number"
                  value={settings.target_ec_min}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    target_ec_min: parseFloat(e.target.value) || 1.2
                  }))}
                  min="0.5"
                  max="3.0"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec-max">Maximum EC</Label>
                <Input
                  id="ec-max"
                  type="number"
                  value={settings.target_ec_max}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    target_ec_max: parseFloat(e.target.value) || 2.0
                  }))}
                  min="0.5"
                  max="3.0"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Update Settings Button */}
          <Button
            onClick={handleSettingsUpdate}
            disabled={isLoading || !isOnline}
            className="w-full"
          >
            <Settings className="h-4 w-4 mr-2" />
            Update Device Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}