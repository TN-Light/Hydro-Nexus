import { NextRequest, NextResponse } from 'next/server'
import { dbHelpers } from '@/lib/database'

// GET latest sensor readings for dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceIdsParam = searchParams.get('devices')
    
    // Parse device IDs if provided
    let deviceIds: string[] | undefined
    if (deviceIdsParam) {
      deviceIds = deviceIdsParam.split(',').filter(id => id.trim().length > 0)
    }

    // Get room-level sensors (shared) and bag moisture levels
    const readings = await dbHelpers.getLatestSensorReadings(deviceIds)

    // NEW STRUCTURE: Room sensors are SHARED, only moisture is bag-specific
    // Group by room to extract shared sensors
    const roomSensors: any = {}
    const bagData: Record<string, any> = {}
    
    readings.forEach((reading: any) => {
      const roomId = reading.room_id || 'main-room'
      
      // Store room-level sensors (same for all bags)
      if (!roomSensors[roomId]) {
        roomSensors[roomId] = {
          roomId: roomId,
          roomTemp: Number(reading.room_temp),
          humidity: Number(reading.humidity),
          pH: Number(reading.ph),
          ec: Number(reading.ec),
          waterLevel: reading.water_level_status || 'Adequate',
          timestamp: reading.room_timestamp || reading.timestamp
        }
      }
      
      // Store bag-specific moisture
      bagData[reading.device_id] = {
        deviceId: reading.device_id,
        moisture: Number(reading.substrate_moisture),
        moistureTimestamp: reading.moisture_timestamp || reading.timestamp,
        roomId: roomId
      }
    })

    // ── Freshness check ──────────────────────────────────────────────────────
    // Use the MOST RECENT timestamp from ANY source (room OR bag)
    // This prevents stale room_sensors table from masking fresh bag data
    const STALE_MS = 2 * 60 * 1000 // 2 minutes — ESP32 sends every 30s, so 2min means ~4 missed sends
    
    // Collect all timestamps and find the newest one
    const allTimestamps: number[] = []
    if (roomSensors['main-room']?.timestamp) {
      allTimestamps.push(new Date(roomSensors['main-room'].timestamp).getTime())
    }
    Object.values(bagData).forEach((bag: any) => {
      if (bag?.moistureTimestamp) {
        allTimestamps.push(new Date(bag.moistureTimestamp).getTime())
      }
    })
    
    const latestTsMs = allTimestamps.length > 0 ? Math.max(...allTimestamps) : 0
    const dataAgeMs = latestTsMs > 0 ? Date.now() - latestTsMs : Infinity
    const isDataFresh = dataAgeMs < STALE_MS
    
    // If room data is stale but bag data is fresh, update room timestamp
    // so the dashboard gets correct room readings from sensor_readings
    if (isDataFresh && roomSensors['main-room']) {
      const roomTs = new Date(roomSensors['main-room'].timestamp).getTime()
      if (Date.now() - roomTs > STALE_MS) {
        // Room sensors table is stale — try to get room data from latest sensor_readings
        try {
          const freshRoom = await dbHelpers.getLatestRoomFromSensorReadings()
          if (freshRoom) {
            roomSensors['main-room'] = {
              ...roomSensors['main-room'],
              roomTemp: freshRoom.room_temp,
              humidity: freshRoom.humidity,
              pH: freshRoom.ph,
              ec: freshRoom.ec,
              waterLevel: freshRoom.water_level_status || 'Adequate',
              timestamp: freshRoom.timestamp
            }
          }
        } catch {
          // Use what we have
        }
      }
    }

    return NextResponse.json({
      success: true,
      room: roomSensors['main-room'] || null,  // Room-level sensors (SHARED)
      bags: bagData,  // Bag-specific moisture levels
      timestamp: new Date().toISOString(),
      count: Object.keys(bagData).length,
      isDataFresh,           // ← true only when last reading < 5 min ago
      dataAgeSeconds: Math.round(dataAgeMs / 1000),
    })

  } catch (error) {
    console.error('Error fetching latest sensor readings:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch sensor data',
        message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
