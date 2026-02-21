import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { dbHelpers } from '@/lib/database'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * POST /api/ai/analyze
 * AI-powered analysis of current sensor data.
 * Fetches latest readings, sends to Gemini for interpretation,
 * returns actionable insights, anomalies, and recommendations.
 */
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const deviceId = body.deviceId || null

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    // Fetch latest sensor readings
    const readings = await dbHelpers.getLatestSensorReadings(deviceId ? [deviceId] : undefined)

    if (!readings || readings.length === 0) {
      return NextResponse.json({
        success: true,
        analysis: {
          summary: 'No sensor data available. Ensure ESP32 devices are connected and sending data.',
          anomalies: [],
          recommendations: ['Check ESP32 connectivity', 'Verify database connection'],
          overallHealth: 'unknown',
        },
      })
    }

    // Build sensor context
    let sensorText = 'Current sensor readings:\n'
    for (const r of readings) {
      sensorText += `\n${r.device_id}:\n`
      sensorText += `  Temperature: ${r.room_temp ?? 'N/A'}°C\n`
      sensorText += `  pH: ${r.ph ?? 'N/A'}\n`
      sensorText += `  EC: ${r.ec ?? 'N/A'} mS/cm\n`
      sensorText += `  Substrate Moisture: ${r.substrate_moisture ?? 'N/A'}%\n`
      sensorText += `  Humidity: ${r.humidity ?? 'N/A'}%\n`
      sensorText += `  Water Level: ${r.water_level_status ?? 'N/A'}\n`
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
    })

    const prompt = `You are Qubit, the QBM-HydroNet AI. Analyze these hydroponic sensor readings and respond in valid JSON ONLY (no markdown, no code fences).

${sensorText}

Target ranges:
- Temperature: 24-32°C
- pH: 5.5-6.8
- EC: 1.5-2.8 mS/cm
- Substrate Moisture: 60-80%
- Humidity: 55-75%

Return this JSON structure:
{
  "summary": "1-2 sentence overview",
  "overallHealth": "excellent|good|warning|critical",
  "anomalies": [{"parameter": "...", "device": "...", "value": ..., "expected": "...", "severity": "low|medium|high"}],
  "recommendations": ["action 1", "action 2"],
  "scores": {"temperature": 0-100, "ph": 0-100, "ec": 0-100, "moisture": 0-100, "humidity": 0-100}
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    let analysis
    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      analysis = JSON.parse(cleaned)
    } catch {
      analysis = {
        summary: text.slice(0, 500),
        overallHealth: 'unknown',
        anomalies: [],
        recommendations: [],
        scores: {},
      }
    }

    return NextResponse.json({ success: true, analysis, deviceCount: readings.length })
  } catch (error: any) {
    console.error('AI Analyze error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: error.message },
      { status: 500 },
    )
  }
}
