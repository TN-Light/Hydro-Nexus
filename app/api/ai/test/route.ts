import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { db, dbHelpers } from '@/lib/database'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * GET /api/ai/test
 * Health check for the AI subsystem — tests Gemini connectivity,
 * database access, and API key validity.
 *
 * POST /api/ai/test
 * Send a test prompt to Gemini and get a raw response.
 */
export async function GET(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 20, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    checks: {},
  }

  // ── Check 1: API key present ──────────────────────────────────────
  results.checks.apiKey = {
    status: process.env.GEMINI_API_KEY ? 'pass' : 'fail',
    detail: process.env.GEMINI_API_KEY
      ? `Key configured (ends in ...${process.env.GEMINI_API_KEY.slice(-4)})`
      : 'GEMINI_API_KEY not set in environment',
  }

  // ── Check 2: Gemini connectivity ──────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: { temperature: 0.1, maxOutputTokens: 20 },
      })
      const start = Date.now()
      const result = await model.generateContent('Reply with only the word: HEALTHY')
      const latency = Date.now() - start
      const text = result.response.text().trim()

      results.checks.gemini = {
        status: 'pass',
        detail: `Response: "${text}" (${latency}ms)`,
        latencyMs: latency,
      }
    } catch (error: any) {
      results.checks.gemini = {
        status: 'fail',
        detail: error.message || 'Gemini request failed',
        isQuotaError: error.message?.includes('429') || error.message?.includes('quota'),
      }
    }
  } else {
    results.checks.gemini = { status: 'skip', detail: 'Skipped — no API key' }
  }

  // ── Check 3: Database connectivity ────────────────────────────────
  try {
    const start = Date.now()
    const dbResult = await db.query('SELECT 1 as ok')
    const latency = Date.now() - start
    results.checks.database = {
      status: 'pass',
      detail: `Connected (${latency}ms)`,
      latencyMs: latency,
    }
  } catch (error: any) {
    results.checks.database = {
      status: 'fail',
      detail: error.message || 'Database connection failed',
    }
  }

  // ── Check 4: Sensor data availability ─────────────────────────────
  try {
    const readings = await dbHelpers.getLatestSensorReadings()
    results.checks.sensorData = {
      status: readings?.length ? 'pass' : 'warning',
      detail: readings?.length
        ? `${readings.length} device(s) reporting data`
        : 'No sensor data in database',
      deviceCount: readings?.length || 0,
    }
  } catch (error: any) {
    results.checks.sensorData = {
      status: 'fail',
      detail: error.message || 'Cannot query sensor data',
    }
  }

  // ── Check 5: LiveKit configuration ────────────────────────────────
  results.checks.livekit = {
    status: process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET ? 'pass' : 'warning',
    detail:
      process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET
        ? `LiveKit URL: ${process.env.LIVEKIT_URL}`
        : 'Some LiveKit env vars missing (voice features may not work)',
  }

  // Overall
  const statuses = Object.values(results.checks).map((c: any) => c.status)
  results.overallStatus = statuses.includes('fail') ? 'unhealthy' : statuses.includes('warning') ? 'degraded' : 'healthy'

  return NextResponse.json({ success: true, ...results })
}

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
    })

    const start = Date.now()
    const result = await model.generateContent(prompt)
    const latency = Date.now() - start

    return NextResponse.json({
      success: true,
      response: result.response.text(),
      latencyMs: latency,
      model: 'gemini-2.0-flash-exp',
    })
  } catch (error: any) {
    console.error('AI Test POST error:', error)
    return NextResponse.json({ error: 'Test prompt failed', details: error.message }, { status: 500 })
  }
}
