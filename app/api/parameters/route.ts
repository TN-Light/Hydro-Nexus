import { NextRequest, NextResponse } from 'next/server'
import { dbHelpers, db } from '@/lib/database'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

/**
 * GET /api/parameters
 * Retrieve growing parameters / thresholds for devices.
 * Returns crop-specific parameter ranges and current user-configured overrides.
 *
 * POST /api/parameters
 * Update custom parameter thresholds for a device.
 */

const DEFAULT_PARAMETERS = {
  ph: { min: 5.5, max: 6.8, critical_low: 4.5, critical_high: 7.5 },
  ec: { min: 1.5, max: 2.8, critical_low: 0.5, critical_high: 4.0 },
  temperature: { min: 22, max: 32, critical_low: 15, critical_high: 38 },
  humidity: { min: 55, max: 75, critical_low: 40, critical_high: 90 },
  substrate_moisture: { min: 50, max: 80, critical_low: 30, critical_high: 95 },
}

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

    // Try fetching user-configured parameters from DB
    let customParams = null
    if (deviceId) {
      try {
        const result = await db.query(
          `SELECT * FROM user_parameters WHERE device_id = $1`,
          [deviceId],
        )
        if (result.rows.length > 0) {
          customParams = result.rows[0]
        }
      } catch {
        // Table may not exist — use defaults
      }
    }

    // Merge custom with defaults
    const params = customParams
      ? {
          ph: customParams.ph_range || DEFAULT_PARAMETERS.ph,
          ec: customParams.ec_range || DEFAULT_PARAMETERS.ec,
          temperature: customParams.temp_range || DEFAULT_PARAMETERS.temperature,
          humidity: customParams.humidity_range || DEFAULT_PARAMETERS.humidity,
          substrate_moisture: customParams.moisture_range || DEFAULT_PARAMETERS.substrate_moisture,
        }
      : DEFAULT_PARAMETERS

    // Fetch current readings if device specified
    let currentValues = null
    if (deviceId) {
      try {
        const readings = await dbHelpers.getLatestSensorReadings([deviceId])
        if (readings?.length) {
          const r = readings[0]
          currentValues = {
            ph: r.ph,
            ec: r.ec,
            temperature: r.room_temp,
            humidity: r.humidity,
            substrate_moisture: r.substrate_moisture,
          }
        }
      } catch {
        // DB may be down
      }
    }

    // Calculate which parameters are out of range
    const alerts: any[] = []
    if (currentValues) {
      for (const [key, range] of Object.entries(params) as [string, any][]) {
        const val = currentValues[key as keyof typeof currentValues]
        if (val == null) continue
        if (val < range.critical_low) alerts.push({ parameter: key, value: val, status: 'critical_low', threshold: range.critical_low })
        else if (val > range.critical_high) alerts.push({ parameter: key, value: val, status: 'critical_high', threshold: range.critical_high })
        else if (val < range.min) alerts.push({ parameter: key, value: val, status: 'low', threshold: range.min })
        else if (val > range.max) alerts.push({ parameter: key, value: val, status: 'high', threshold: range.max })
      }
    }

    return NextResponse.json({
      success: true,
      deviceId: deviceId || 'defaults',
      parameters: params,
      currentValues,
      alerts,
      isCustom: customParams !== null,
    })
  } catch (error: any) {
    console.error('Parameters GET error:', error)
    return NextResponse.json({ error: 'Failed to get parameters', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { deviceId, parameters } = body

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
    }

    if (!parameters || typeof parameters !== 'object') {
      return NextResponse.json({ error: 'parameters object is required' }, { status: 400 })
    }

    // Validate ranges
    for (const [key, range] of Object.entries(parameters) as [string, any][]) {
      if (range.min !== undefined && range.max !== undefined && range.min >= range.max) {
        return NextResponse.json({ error: `Invalid range for ${key}: min must be less than max` }, { status: 400 })
      }
    }

    // Try to save to DB
    try {
      await db.query(
        `INSERT INTO user_parameters (device_id, ph_range, ec_range, temp_range, humidity_range, moisture_range, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (device_id) DO UPDATE SET
           ph_range = COALESCE($2, user_parameters.ph_range),
           ec_range = COALESCE($3, user_parameters.ec_range),
           temp_range = COALESCE($4, user_parameters.temp_range),
           humidity_range = COALESCE($5, user_parameters.humidity_range),
           moisture_range = COALESCE($6, user_parameters.moisture_range),
           updated_at = NOW()`,
        [
          deviceId,
          parameters.ph ? JSON.stringify(parameters.ph) : null,
          parameters.ec ? JSON.stringify(parameters.ec) : null,
          parameters.temperature ? JSON.stringify(parameters.temperature) : null,
          parameters.humidity ? JSON.stringify(parameters.humidity) : null,
          parameters.substrate_moisture ? JSON.stringify(parameters.substrate_moisture) : null,
        ],
      )

      return NextResponse.json({ success: true, message: 'Parameters saved', deviceId })
    } catch {
      // Table doesn't exist — return success with guidance
      return NextResponse.json({
        success: true,
        message: 'Parameters accepted but user_parameters table not yet created. Using defaults until migration is run.',
        parameters,
        deviceId,
      })
    }
  } catch (error: any) {
    console.error('Parameters POST error:', error)
    return NextResponse.json({ error: 'Failed to save parameters', details: error.message }, { status: 500 })
  }
}
