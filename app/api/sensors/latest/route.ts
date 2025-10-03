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

    // Get latest sensor readings from TimescaleDB
    const readings = await dbHelpers.getLatestSensorReadings(deviceIds)

    // Transform data to match frontend expectations
    const sensorData: Record<string, any> = {}
    
    readings.forEach((reading: any) => {
      sensorData[reading.device_id] = {
        deviceId: reading.device_id,
        timestamp: reading.timestamp,
        roomTemp: Number(reading.room_temp),
        pH: Number(reading.ph),
        ec: Number(reading.ec),
        moisture: Number(reading.substrate_moisture),
        waterLevel: reading.water_level_status || 'Adequate',
        humidity: Number(reading.humidity)
      }
    })

    return NextResponse.json({
      success: true,
      data: sensorData,
      timestamp: new Date().toISOString(),
      count: readings.length
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