import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { dbHelpers, db } from '@/lib/database'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * POST /api/ai/debug
 * AI-powered system diagnostics.
 * Checks sensor connectivity, data freshness, database health,
 * and uses Gemini to diagnose potential hardware/software issues.
 */
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const deviceId = body.deviceId || null
    const issue = body.issue || ''

    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      checks: [],
    }

    // ── Check 1: Database connectivity ──────────────────────────────
    try {
      const dbResult = await db.query('SELECT NOW() as time, current_database() as db')
      diagnostics.checks.push({
        name: 'Database Connection',
        status: 'pass',
        detail: `Connected to "${dbResult.rows[0].db}" at ${dbResult.rows[0].time}`,
      })
    } catch (err: any) {
      diagnostics.checks.push({
        name: 'Database Connection',
        status: 'fail',
        detail: err.message,
      })
    }

    // ── Check 2: Sensor data freshness ──────────────────────────────
    try {
      const freshness = await db.query(
        `SELECT device_id,
                MAX(timestamp) as last_reading,
                EXTRACT(EPOCH FROM (NOW() - MAX(timestamp))) as age_seconds,
                COUNT(*) as total_readings
         FROM sensor_readings
         ${deviceId ? 'WHERE device_id = $1' : ''}
         GROUP BY device_id
         ORDER BY last_reading DESC`,
        deviceId ? [deviceId] : [],
      )

      const staleDevices = freshness.rows.filter((r: any) => r.age_seconds > 120)
      const freshDevices = freshness.rows.filter((r: any) => r.age_seconds <= 120)

      diagnostics.checks.push({
        name: 'Sensor Data Freshness',
        status: staleDevices.length > 0 ? 'warning' : freshDevices.length > 0 ? 'pass' : 'fail',
        detail: `${freshDevices.length} device(s) reporting live, ${staleDevices.length} stale (>2 min)`,
        devices: freshness.rows.map((r: any) => ({
          device: r.device_id,
          lastReading: r.last_reading,
          ageSeconds: Math.round(Number(r.age_seconds)),
          totalReadings: Number(r.total_readings),
        })),
      })
    } catch {
      diagnostics.checks.push({
        name: 'Sensor Data Freshness',
        status: 'fail',
        detail: 'sensor_readings table not accessible',
      })
    }

    // ── Check 3: Pending commands ───────────────────────────────────
    try {
      const pendingResult = await db.query(
        `SELECT device_id, COUNT(*) as pending_count
         FROM device_commands WHERE status = 'pending'
         GROUP BY device_id`,
      )
      const totalPending = pendingResult.rows.reduce((sum: number, r: any) => sum + Number(r.pending_count), 0)
      diagnostics.checks.push({
        name: 'Pending Commands',
        status: totalPending > 20 ? 'warning' : 'pass',
        detail: `${totalPending} pending command(s) across ${pendingResult.rows.length} device(s)`,
        devices: pendingResult.rows,
      })
    } catch {
      diagnostics.checks.push({
        name: 'Pending Commands',
        status: 'info',
        detail: 'device_commands table not accessible',
      })
    }

    // ── Check 4: Alert status ───────────────────────────────────────
    try {
      const alerts = await dbHelpers.getActiveAlerts(deviceId || undefined)
      diagnostics.checks.push({
        name: 'Active Alerts',
        status: alerts.length > 5 ? 'warning' : 'pass',
        detail: `${alerts.length} active alert(s)`,
        alertCount: alerts.length,
      })
    } catch {
      diagnostics.checks.push({
        name: 'Active Alerts',
        status: 'info',
        detail: 'Alerts view not accessible',
      })
    }

    // ── Check 5: Environment variables ──────────────────────────────
    const envChecks = [
      { key: 'DATABASE_URL', set: !!process.env.DATABASE_URL },
      { key: 'GEMINI_API_KEY', set: !!process.env.GEMINI_API_KEY },
      { key: 'LIVEKIT_URL', set: !!process.env.LIVEKIT_URL },
      { key: 'LIVEKIT_API_KEY', set: !!process.env.LIVEKIT_API_KEY },
      { key: 'JWT_SECRET', set: !!process.env.JWT_SECRET },
    ]
    const missingEnv = envChecks.filter(e => !e.set)
    diagnostics.checks.push({
      name: 'Environment Variables',
      status: missingEnv.length > 0 ? 'warning' : 'pass',
      detail: missingEnv.length > 0
        ? `Missing: ${missingEnv.map(e => e.key).join(', ')}`
        : 'All critical env vars configured',
    })

    // ── AI Diagnosis (if issue provided or anomalies found) ─────────
    if ((issue || diagnostics.checks.some((c: any) => c.status === 'fail' || c.status === 'warning')) && process.env.GEMINI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash-exp',
          generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
        })

        const diagText = diagnostics.checks
          .map((c: any) => `${c.name}: ${c.status} — ${c.detail}`)
          .join('\n')

        const prompt = `You are Qubit, the QBM-HydroNet system debugger. Given the diagnostic checks below${issue ? ` and the user-reported issue: "${issue}"` : ''}, provide a brief troubleshooting guide. Be specific and actionable. Max 4 bullet points.

Diagnostics:
${diagText}`

        const result = await model.generateContent(prompt)
        diagnostics.aiDiagnosis = result.response.text()
      } catch {
        diagnostics.aiDiagnosis = 'AI diagnosis unavailable (API quota or key issue).'
      }
    }

    // Overall status
    const statuses = diagnostics.checks.map((c: any) => c.status)
    diagnostics.overallStatus = statuses.includes('fail')
      ? 'critical'
      : statuses.includes('warning')
        ? 'warning'
        : 'healthy'

    return NextResponse.json({ success: true, diagnostics })
  } catch (error: any) {
    console.error('AI Debug error:', error)
    return NextResponse.json({ error: 'Debug failed', details: error.message }, { status: 500 })
  }
}
