import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { dbHelpers } from '@/lib/database'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * POST /api/ai/research
 * AI-powered research assistant for hydroponic growing techniques,
 * crop science, mycorrhizal biology, and QBM-HydroNet protocols.
 * Uses Gemini with the full system knowledge base.
 */
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { query, context, includeData } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Research query is required' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    // Optionally include current sensor data for context
    let sensorCtx = ''
    if (includeData) {
      try {
        const readings = await dbHelpers.getLatestSensorReadings()
        if (readings?.length) {
          sensorCtx = '\n\nCurrent system sensor data:\n'
          for (const r of readings) {
            sensorCtx += `${r.device_id}: Temp=${r.room_temp}°C, pH=${r.ph}, EC=${r.ec}, Moisture=${r.substrate_moisture}%, Humidity=${r.humidity}%\n`
          }
        }
      } catch {
        // proceed without sensor data
      }
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: { temperature: 0.6, maxOutputTokens: 1200 },
    })

    const systemPrompt = `You are Qubit, the QBM-HydroNet research assistant. You specialize in:

1. SUBSTRATE-BASED HYDROPONICS — cocopeat/perlite/biochar substrates (NOT traditional DWC/NFT)
2. MYCORRHIZAL BIOLOGY — AMF (Arbuscular Mycorrhizal Fungi), particularly Rhizophagus irregularis, and the Common Mycorrhizal Network (CMN)
3. BIOACTIVE METABOLITE PRODUCTION — curcumin in turmeric, capsaicin in chilies
4. FORCED SYMBIOSIS — phosphorus restriction (40-60 ppm) to force plant-fungal bonding
5. PAW (Plasma-Activated Water) — controlled oxidative stress for metabolite boosting
6. GROWING DEGREE DAYS (GDD) — thermal accumulation for harvest prediction
7. BIOCONTROL — Trichoderma harzianum T-22 + Bacillus subtilis GB03

Target crops: High-curcumin Turmeric, Bhut Jolokia, Aji Charapita, Kanthari Chili.
Excluded crops: Saffron, Wasabi/Brassicas (kill AMF), generic commodity crops.

Provide detailed, scientifically grounded answers. Include references to research concepts where relevant. Structure long answers with sections.`

    const fullQuery = `${systemPrompt}

${context ? `Additional context: ${context}` : ''}
${sensorCtx}

Research question: ${query}`

    const result = await model.generateContent(fullQuery)
    const response = result.response.text()

    return NextResponse.json({
      success: true,
      query,
      response,
      hasSensorContext: sensorCtx.length > 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('AI Research error:', error)

    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'API quota exceeded. Please try again later or upgrade your Gemini plan.' },
        { status: 429 },
      )
    }

    return NextResponse.json({ error: 'Research query failed', details: error.message }, { status: 500 })
  }
}
