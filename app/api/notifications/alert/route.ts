import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

/**
 * POST /api/notifications/alert
 * Receives alerts from ESP32 when sensor values are out of range.
 * The ESP32 sends alerts instead of auto-dosing (notification-only mode).
 *
 * Body (from ESP32):
 *   {
 *     device_id: "grow-bag-1",
 *     alert_type: "ec_low" | "ec_high" | "ph_low" | "ph_high" | "moisture_low",
 *     message: "EC/PPM below target — add nutrient solution",
 *     current_value: 0.8,
 *     threshold: 1.2,
 *     timestamp: 123456
 *   }
 *
 * Returns: { success: true, alert_id: string }
 */

// In-memory alert store (replace with database in production)
const recentAlerts: Array<{
  id: string
  device_id: string
  alert_type: string
  message: string
  current_value: number
  threshold: number
  received_at: string
  dismissed: boolean
}> = []

const MAX_ALERTS = 100

export async function POST(request: NextRequest) {
  // Rate limit: max 10 alerts per minute per device
  const rl = checkRateLimit(getClientId(request), { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Verify API key
  const apiKey = request.headers.get('x-api-key')
  const validKeys = (process.env.ESP32_API_KEYS || 'esp32_grow_bag_1_key_2024_secure').split(',')
  if (!apiKey || !validKeys.includes(apiKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.device_id || !body.alert_type || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, alert_type, message' },
        { status: 400 }
      )
    }

    const alertId = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const alert = {
      id: alertId,
      device_id: body.device_id,
      alert_type: body.alert_type,
      message: body.message,
      current_value: body.current_value ?? 0,
      threshold: body.threshold ?? 0,
      received_at: new Date().toISOString(),
      dismissed: false,
    }

    // Store alert (keep last MAX_ALERTS)
    recentAlerts.unshift(alert)
    if (recentAlerts.length > MAX_ALERTS) {
      recentAlerts.length = MAX_ALERTS
    }

    console.log(`🔔 ESP32 Alert [${body.device_id}]: ${body.alert_type} — ${body.message} (value: ${body.current_value}, threshold: ${body.threshold})`)

    // Optionally forward to email notification endpoint
    try {
      const emailEndpoint = new URL('/api/notifications/email', request.url)
      await fetch(emailEndpoint.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'alert',
          deviceId: body.device_id,
          parameter: body.alert_type,
          value: body.current_value,
          threshold: { min: body.threshold, max: body.threshold },
          severity: 'warning',
        }),
      })
    } catch {
      // Email sending is best-effort
    }

    return NextResponse.json({ success: true, alert_id: alertId })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
}

/**
 * GET /api/notifications/alert
 * Retrieve recent alerts (for dashboard display).
 * Query params: ?device_id=grow-bag-1&limit=20
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('device_id')
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  let filtered = recentAlerts
  if (deviceId) {
    filtered = filtered.filter(a => a.device_id === deviceId)
  }

  return NextResponse.json({
    alerts: filtered.slice(0, limit),
    total: filtered.length,
  })
}
