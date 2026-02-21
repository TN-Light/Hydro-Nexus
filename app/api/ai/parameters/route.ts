import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { dbHelpers } from '@/lib/database'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * GET /api/ai/parameters
 * Get AI-optimized growing parameters for a specific crop + device.
 *
 * POST /api/ai/parameters
 * Generate AI-recommended parameter adjustments based on current
 * sensor data and crop requirements.
 */

// Crop-specific ideal ranges for QBM-HydroNet target crops
const CROP_PROFILES: Record<string, any> = {
  turmeric: {
    name: 'High-Curcumin Turmeric',
    ph: { min: 5.5, max: 6.5, ideal: 6.0 },
    ec: { min: 1.8, max: 2.4, ideal: 2.1 },
    temperature: { min: 24, max: 30, ideal: 27 },
    humidity: { min: 65, max: 75, ideal: 70 },
    moisture: { min: 60, max: 80, ideal: 70 },
    phosphorus: { min: 40, max: 60, ideal: 50 },
    gdd: { base: 10, target_min: 1500, target_max: 2000 },
  },
  'bhut-jolokia': {
    name: 'Bhut Jolokia (Ghost Pepper)',
    ph: { min: 6.0, max: 6.8, ideal: 6.4 },
    ec: { min: 2.0, max: 2.8, ideal: 2.4 },
    temperature: { min: 26, max: 32, ideal: 29 },
    humidity: { min: 55, max: 70, ideal: 62 },
    moisture: { min: 60, max: 80, ideal: 70 },
    phosphorus: { min: 40, max: 60, ideal: 50 },
    gdd: { base: 10, target_min: 1200, target_max: 1800 },
  },
  'aji-charapita': {
    name: 'Aji Charapita',
    ph: { min: 5.8, max: 6.5, ideal: 6.2 },
    ec: { min: 1.6, max: 2.2, ideal: 1.9 },
    temperature: { min: 24, max: 30, ideal: 27 },
    humidity: { min: 60, max: 70, ideal: 65 },
    moisture: { min: 60, max: 80, ideal: 70 },
    phosphorus: { min: 40, max: 60, ideal: 50 },
    gdd: { base: 10, target_min: 1200, target_max: 1600 },
  },
  kanthari: {
    name: 'Kanthari Chili',
    ph: { min: 5.8, max: 6.5, ideal: 6.2 },
    ec: { min: 1.5, max: 2.0, ideal: 1.8 },
    temperature: { min: 24, max: 30, ideal: 27 },
    humidity: { min: 60, max: 70, ideal: 65 },
    moisture: { min: 60, max: 80, ideal: 70 },
    phosphorus: { min: 40, max: 60, ideal: 50 },
    gdd: { base: 10, target_min: 1000, target_max: 1500 },
  },
}

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const crop = searchParams.get('crop') || 'turmeric'
    const deviceId = searchParams.get('deviceId')

    const profile = CROP_PROFILES[crop] || CROP_PROFILES['turmeric']

    // Also fetch current readings if deviceId provided
    let currentReadings = null
    if (deviceId) {
      try {
        const readings = await dbHelpers.getLatestSensorReadings([deviceId])
        currentReadings = readings?.[0] || null
      } catch {
        // DB may be down — return profile without current readings
      }
    }

    // Calculate deviations if we have current readings
    let deviations: any[] = []
    if (currentReadings) {
      const checks = [
        { param: 'pH', current: currentReadings.ph, range: profile.ph },
        { param: 'EC', current: currentReadings.ec, range: profile.ec },
        { param: 'Temperature', current: currentReadings.room_temp, range: profile.temperature },
        { param: 'Humidity', current: currentReadings.humidity, range: profile.humidity },
        { param: 'Moisture', current: currentReadings.substrate_moisture, range: profile.moisture },
      ]

      for (const c of checks) {
        if (c.current == null) continue
        if (c.current < c.range.min) {
          deviations.push({ parameter: c.param, status: 'low', current: c.current, ideal: c.range.ideal, min: c.range.min })
        } else if (c.current > c.range.max) {
          deviations.push({ parameter: c.param, status: 'high', current: c.current, ideal: c.range.ideal, max: c.range.max })
        }
      }
    }

    return NextResponse.json({
      success: true,
      crop: profile.name,
      profile,
      currentReadings: currentReadings
        ? {
            device: deviceId,
            temperature: currentReadings.room_temp,
            ph: currentReadings.ph,
            ec: currentReadings.ec,
            moisture: currentReadings.substrate_moisture,
            humidity: currentReadings.humidity,
          }
        : null,
      deviations,
      inRange: deviations.length === 0 && currentReadings !== null,
    })
  } catch (error: any) {
    console.error('AI Parameters GET error:', error)
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
    const { crop, deviceId } = body

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const profile = CROP_PROFILES[crop] || CROP_PROFILES['turmeric']

    // Fetch current readings
    let sensorCtx = 'No current readings available.'
    if (deviceId) {
      try {
        const readings = await dbHelpers.getLatestSensorReadings([deviceId])
        if (readings?.length) {
          const r = readings[0]
          sensorCtx = `Current readings for ${deviceId}: Temp=${r.room_temp}°C, pH=${r.ph}, EC=${r.ec} mS/cm, Moisture=${r.substrate_moisture}%, Humidity=${r.humidity}%`
        }
      } catch {
        // proceed without sensor data
      }
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
    })

    const prompt = `You are Qubit, the QBM-HydroNet AI. Given the crop profile and current readings, recommend parameter adjustments. Return valid JSON only.

Crop: ${profile.name}
Ideal ranges: pH ${profile.ph.min}-${profile.ph.max}, EC ${profile.ec.min}-${profile.ec.max} mS/cm, Temp ${profile.temperature.min}-${profile.temperature.max}°C, Humidity ${profile.humidity.min}-${profile.humidity.max}%, Moisture ${profile.moisture.min}-${profile.moisture.max}%

${sensorCtx}

Return:
{
  "adjustments": [{"parameter": "...", "currentValue": ..., "targetValue": ..., "action": "increase|decrease|maintain", "urgency": "low|medium|high", "method": "How to adjust"}],
  "overallScore": 0-100,
  "nextCheckMinutes": 30
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    let recommendations
    try {
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      recommendations = JSON.parse(cleaned)
    } catch {
      recommendations = { adjustments: [], overallScore: 50, nextCheckMinutes: 30 }
    }

    return NextResponse.json({ success: true, crop: profile.name, recommendations })
  } catch (error: any) {
    console.error('AI Parameters POST error:', error)
    return NextResponse.json({ error: 'Parameter optimization failed', details: error.message }, { status: 500 })
  }
}
