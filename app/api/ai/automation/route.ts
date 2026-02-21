import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { dbHelpers, db } from '@/lib/database'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * GET /api/ai/automation
 * Retrieve active automation rules for a device.
 *
 * POST /api/ai/automation
 * Generate AI-recommended automation rules based on current sensor data,
 * or create/update custom automation rules.
 */
export async function GET(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

    // Return stored automation rules from DB (or defaults if table doesn't exist yet)
    let rules: any[] = []
    try {
      const result = await db.query(
        `SELECT * FROM automation_rules ${deviceId ? 'WHERE device_id = $1' : ''} ORDER BY created_at DESC`,
        deviceId ? [deviceId] : [],
      )
      rules = result.rows
    } catch {
      // Table may not exist yet — return sensible defaults
      rules = getDefaultRules(deviceId || 'grow-bag-1')
    }

    return NextResponse.json({ success: true, rules })
  } catch (error: any) {
    console.error('Automation GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch automation rules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { deviceId, action } = body

    // ── Generate AI-recommended rules ───────────────────────────────
    if (action === 'generate') {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
      }

      const readings = await dbHelpers.getLatestSensorReadings(deviceId ? [deviceId] : undefined)

      let sensorCtx = 'No sensor data available.'
      if (readings?.length) {
        sensorCtx = readings
          .map(
            (r: any) =>
              `${r.device_id}: Temp=${r.room_temp}°C, pH=${r.ph}, EC=${r.ec}, Moisture=${r.substrate_moisture}%, Humidity=${r.humidity}%`,
          )
          .join('\n')
      }

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
      })

      const prompt = `You are Qubit, the QBM-HydroNet AI. Based on the sensor data below, generate automation rules. Return valid JSON only (no code fences).

Sensor data:
${sensorCtx}

Return an array of rules:
[
  {
    "name": "Rule name",
    "trigger": {"parameter": "ph|ec|moisture|temp|humidity", "operator": ">|<|>=|<=", "threshold": number},
    "action": {"command": "nutrient_pump_on|nutrient_pump_off|relay2_on|relay2_off|emergency_stop", "duration_seconds": number},
    "reason": "Short explanation",
    "priority": "low|medium|high"
  }
]

Generate 3-5 practical rules for hydroponic management.`

      const result = await model.generateContent(prompt)
      const text = result.response.text()

      let rules
      try {
        const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        rules = JSON.parse(cleaned)
      } catch {
        rules = getDefaultRules(deviceId || 'grow-bag-1')
      }

      return NextResponse.json({ success: true, rules, source: 'ai-generated' })
    }

    // ── Save a custom rule ──────────────────────────────────────────
    if (action === 'save') {
      const { rule } = body
      if (!rule?.name || !rule?.trigger || !rule?.action) {
        return NextResponse.json({ error: 'Invalid rule: name, trigger, and action are required' }, { status: 400 })
      }

      try {
        await db.query(
          `INSERT INTO automation_rules (device_id, name, trigger_config, action_config, priority, is_active)
           VALUES ($1, $2, $3, $4, $5, true)
           ON CONFLICT (device_id, name) DO UPDATE SET trigger_config = $3, action_config = $4, priority = $5, updated_at = NOW()`,
          [
            deviceId || 'grow-bag-1',
            rule.name,
            JSON.stringify(rule.trigger),
            JSON.stringify(rule.action),
            rule.priority || 'medium',
          ],
        )
      } catch {
        // Table doesn't exist — that's fine, return success with note
        return NextResponse.json({
          success: true,
          message: 'Rule generated but automation_rules table not yet created. Run migration to persist rules.',
          rule,
        })
      }

      return NextResponse.json({ success: true, message: 'Rule saved', rule })
    }

    return NextResponse.json({ error: 'Invalid action. Use "generate" or "save".' }, { status: 400 })
  } catch (error: any) {
    console.error('Automation POST error:', error)
    return NextResponse.json({ error: 'Automation request failed', details: error.message }, { status: 500 })
  }
}

function getDefaultRules(deviceId: string) {
  return [
    {
      name: 'Low Moisture — Start Nutrition Pump',
      device_id: deviceId,
      trigger: { parameter: 'moisture', operator: '<', threshold: 50 },
      action: { command: 'nutrient_pump_on', duration_seconds: 30 },
      priority: 'high',
      is_active: true,
    },
    {
      name: 'High EC — Stop Nutrition Pump',
      device_id: deviceId,
      trigger: { parameter: 'ec', operator: '>', threshold: 3.0 },
      action: { command: 'nutrient_pump_off', duration_seconds: 0 },
      priority: 'high',
      is_active: true,
    },
    {
      name: 'pH Critical Low — Emergency Alert',
      device_id: deviceId,
      trigger: { parameter: 'ph', operator: '<', threshold: 4.5 },
      action: { command: 'emergency_stop', duration_seconds: 0 },
      priority: 'high',
      is_active: true,
    },
  ]
}
