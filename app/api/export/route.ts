import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

/**
 * GET /api/export
 * Export sensor data as CSV or JSON.
 *
 * Query parameters:
 *  - deviceId: (required) device identifier
 *  - format: "csv" | "json" (default: csv)
 *  - hours: number of hours of history (default: 24, max: 720)
 *  - interval: aggregation interval in minutes (default: 60)
 */
export async function GET(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 5 exports per minute.' }, { status: 429 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const format = searchParams.get('format') || 'csv'
    const hours = Math.min(720, Math.max(1, parseInt(searchParams.get('hours') || '24', 10)))
    const interval = Math.min(1440, Math.max(1, parseInt(searchParams.get('interval') || '60', 10)))

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId query parameter is required' }, { status: 400 })
    }

    // Fetch data with time_bucket if available (TimescaleDB), else date_trunc fallback
    let rows: any[]
    try {
      const result = await db.query(
        `SELECT
           time_bucket($1::interval, timestamp) AS time,
           AVG(room_temp)           AS temperature,
           AVG(ph)                  AS ph,
           AVG(ec)                  AS ec,
           AVG(substrate_moisture)  AS moisture,
           AVG(humidity)            AS humidity,
           COUNT(*)                 AS reading_count
         FROM sensor_readings
         WHERE device_id = $2
           AND timestamp >= NOW() - $3::interval
         GROUP BY time
         ORDER BY time ASC`,
        [`${interval} minutes`, deviceId, `${hours} hours`],
      )
      rows = result.rows
    } catch {
      // TimescaleDB not available — fallback to date_trunc
      const truncUnit = interval >= 1440 ? 'day' : interval >= 60 ? 'hour' : 'minute'
      const result = await db.query(
        `SELECT
           date_trunc('${truncUnit}', timestamp) AS time,
           AVG(room_temp)           AS temperature,
           AVG(ph)                  AS ph,
           AVG(ec)                  AS ec,
           AVG(substrate_moisture)  AS moisture,
           AVG(humidity)            AS humidity,
           COUNT(*)                 AS reading_count
         FROM sensor_readings
         WHERE device_id = $1
           AND timestamp >= NOW() - $2::interval
         GROUP BY time
         ORDER BY time ASC`,
        [deviceId, `${hours} hours`],
      )
      rows = result.rows
    }

    if (rows.length === 0) {
      return NextResponse.json({
        error: `No data found for device "${deviceId}" in the last ${hours} hours`,
      }, { status: 404 })
    }

    // ── JSON format ─────────────────────────────────────────────────
    if (format === 'json') {
      const data = rows.map(r => ({
        time: r.time instanceof Date ? r.time.toISOString() : r.time,
        temperature: round(r.temperature, 1),
        ph: round(r.ph, 2),
        ec: round(r.ec, 2),
        moisture: round(r.moisture, 0),
        humidity: round(r.humidity, 0),
        readingCount: Number(r.reading_count),
      }))

      return new NextResponse(
        JSON.stringify({ deviceId, hours, interval, dataPoints: data.length, data }, null, 2),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="hydro-nexus_${deviceId}_${hours}h.json"`,
          },
        },
      )
    }

    // ── CSV format (default) ────────────────────────────────────────
    const header = 'Timestamp,Temperature_C,pH,EC_mScm,Moisture_pct,Humidity_pct,ReadingCount'
    const csvRows = rows.map(r => {
      const time = r.time instanceof Date ? r.time.toISOString() : r.time
      return `${time},${round(r.temperature, 1)},${round(r.ph, 2)},${round(r.ec, 2)},${round(r.moisture, 0)},${round(r.humidity, 0)},${r.reading_count}`
    })

    const csv = [header, ...csvRows].join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="hydro-nexus_${deviceId}_${hours}h.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed', details: error.message }, { status: 500 })
  }
}

function round(val: any, decimals: number): number {
  if (val == null) return 0
  return Number(Number(val).toFixed(decimals))
}
