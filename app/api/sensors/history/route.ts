import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

/**
 * GET /api/sensors/history
 * Fetch historical sensor data from TimescaleDB hypertable
 * 
 * Query Parameters:
 * - deviceId: Device identifier (e.g., 'grow-bag-1')
 * - hours: Number of hours of history to fetch (default: 24)
 * - interval: Data aggregation interval in minutes (default: 60)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const deviceId = searchParams.get('deviceId')
    const hours = parseInt(searchParams.get('hours') || '24')
    const interval = parseInt(searchParams.get('interval') || '60')

    // Validate parameters
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing deviceId parameter' },
        { status: 400 }
      )
    }

    if (hours < 1 || hours > 168) { // Max 7 days
      return NextResponse.json(
        { error: 'Hours must be between 1 and 168' },
        { status: 400 }
      )
    }

    if (interval < 1 || interval > 1440) { // Max 24 hours
      return NextResponse.json(
        { error: 'Interval must be between 1 and 1440 minutes' },
        { status: 400 }
      )
    }

    console.log(`📊 Fetching historical data: device=${deviceId}, hours=${hours}, interval=${interval}min`)

    // Try TimescaleDB time_bucket first, fall back to date_trunc for plain PostgreSQL
    let result;
    try {
      const tsQuery = `
        SELECT 
          time_bucket($1::interval, timestamp) AS time,
          AVG(room_temp) as room_temp,
          AVG(ph) as ph,
          AVG(ec) as ec,
          AVG(substrate_moisture) as moisture,
          AVG(humidity) as humidity,
          AVG(water_temp) as water_temp,
          AVG(tds_ppm) as tds_ppm,
          COUNT(*) as reading_count
        FROM sensor_readings
        WHERE device_id = $2
          AND timestamp >= NOW() - $3::interval
        GROUP BY time
        ORDER BY time ASC
      `
      result = await db.query(tsQuery, [
        `${interval} minutes`,
        deviceId,
        `${hours} hours`
      ])
    } catch (tsError: any) {
      // Fallback to standard date_trunc for plain PostgreSQL
      const truncUnit = interval >= 1440 ? 'day' : interval >= 60 ? 'hour' : 'minute'
      const fallbackQuery = `
        SELECT 
          date_trunc('${truncUnit}', timestamp) AS time,
          AVG(room_temp) as room_temp,
          AVG(ph) as ph,
          AVG(ec) as ec,
          AVG(substrate_moisture) as moisture,
          AVG(humidity) as humidity,
          AVG(water_temp) as water_temp,
          AVG(tds_ppm) as tds_ppm,
          COUNT(*) as reading_count
        FROM sensor_readings
        WHERE device_id = $1
          AND timestamp >= NOW() - $2::interval
        GROUP BY time
        ORDER BY time ASC
      `
      result = await db.query(fallbackQuery, [
        deviceId,
        `${hours} hours`
      ])
    }

    console.log(`✅ Retrieved ${result.rows.length} data points for ${deviceId}`)

    // Format response with proper data types
    const formattedData = result.rows.map(row => ({
      time: row.time.toISOString(),
      roomTemp: parseFloat(row.room_temp?.toFixed(1) || '0'),
      pH: parseFloat(row.ph?.toFixed(2) || '0'),
      ec: parseFloat(row.ec?.toFixed(2) || '0'),
      moisture: parseInt(row.moisture || '0'),
      humidity: parseInt(row.humidity || '0'),
      waterTemp: parseFloat(row.water_temp?.toFixed(1) || '0'),
      tdsPpm: parseFloat(row.tds_ppm?.toFixed(0) || '0'),
      readingCount: parseInt(row.reading_count)
    }))

    return NextResponse.json({
      success: true,
      deviceId,
      hours,
      interval,
      dataPoints: formattedData.length,
      data: formattedData
    })

  } catch (error) {
    console.error('❌ Error fetching historical sensor data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch historical data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

