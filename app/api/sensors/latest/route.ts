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

    return NextResponse.json({
      success: true,
      room: roomSensors['main-room'] || null,  // Room-level sensors (SHARED)
      bags: bagData,  // Bag-specific moisture levels
      timestamp: new Date().toISOString(),
      count: Object.keys(bagData).length
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