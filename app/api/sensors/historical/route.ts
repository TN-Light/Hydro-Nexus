import { NextRequest, NextResponse } from 'next/server'
import { dbHelpers } from '@/lib/database'

// GET historical sensor data for analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const deviceIdsParam = searchParams.get('devices')
    const startTime = searchParams.get('start_time')
    const endTime = searchParams.get('end_time')
    const aggregation = searchParams.get('aggregation') || 'raw' // raw, hourly, daily
    const intervalMinutes = parseInt(searchParams.get('interval') || '60')

    // Validate required parameters
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'start_time and end_time parameters are required' },
        { status: 400 }
      )
    }

    // Parse device IDs
    let deviceIds: string[] = []
    if (deviceIdsParam) {
      deviceIds = deviceIdsParam.split(',').filter(id => id.trim().length > 0)
    } else {
      // If no devices specified, get all devices
      deviceIds = ['grow-bag-1', 'grow-bag-2', 'grow-bag-3', 'grow-bag-4', 'grow-bag-5', 'grow-bag-6']
    }

    let readings: any[] = []

    // Choose appropriate query based on aggregation level
    switch (aggregation) {
      case 'hourly':
        readings = await dbHelpers.getHourlyAggregates(deviceIds, startTime, endTime)
        break
      
      case 'daily':
        readings = await dbHelpers.getDailyAggregates(deviceIds, startTime, endTime)
        break
      
      case 'raw':
      default:
        readings = await dbHelpers.getSensorReadingsRange(deviceIds, startTime, endTime, intervalMinutes)
        break
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
      humidity: Number(reading.humidity),
      // Include aggregation metadata if available
      ...(reading.reading_count && { readingCount: Number(reading.reading_count) })
    }))

    return NextResponse.json({
      success: true,
      data: processedData,
      meta: {
        aggregation,
        interval_minutes: intervalMinutes,
        start_time: startTime,
        end_time: endTime,
        device_count: deviceIds.length,
        reading_count: processedData.length
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching historical sensor data:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch historical data',
        message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
