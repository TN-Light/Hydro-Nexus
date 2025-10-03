import { NextRequest, NextResponse } from 'next/server'
import { dbHelpers } from '@/lib/database'

// GET sensor data for a specific device
export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = params.deviceId
    
    // Get query parameters
    const startTime = searchParams.get('start_time')
    const endTime = searchParams.get('end_time')
    const limit = parseInt(searchParams.get('limit') || '100')

    let readings: any[] = []

    if (startTime && endTime) {
      // Get historical data for specific time range
      const intervalMinutes = parseInt(searchParams.get('interval') || '60')
      readings = await dbHelpers.getSensorReadingsRange([deviceId], startTime, endTime, intervalMinutes)
    } else {
      // Get latest readings
      const latestReadings = await dbHelpers.getLatestSensorReadings([deviceId])
      readings = latestReadings.slice(0, limit)
    }

    // Transform data to match frontend expectations
    const processedData = readings.map((reading: any) => ({
      timestamp: reading.timestamp,
      deviceId: reading.device_id,
      roomTemp: Number(reading.room_temp),
      pH: Number(reading.ph),
      ec: Number(reading.ec),
      moisture: Number(reading.substrate_moisture),
      waterLevel: reading.water_level_status || 'Adequate',
      humidity: Number(reading.humidity)
    }))

    return NextResponse.json({
      success: true,
      device_id: deviceId,
      data: processedData,
      meta: {
        reading_count: processedData.length,
        start_time: startTime,
        end_time: endTime,
        limit
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(`Error fetching sensor data for device ${params.deviceId}:`, error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch device sensor data',
        message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}