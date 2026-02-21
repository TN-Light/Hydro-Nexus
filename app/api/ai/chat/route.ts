import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { dbHelpers } from '@/lib/database'

// Initialize Gemini AI with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// System prompt to give Qubit personality and context
const SYSTEM_PROMPT = `You are Qubit, the AI intelligence for QBM-HydroNet — the Quantum-Bio-Mycorrhizal Hydroponic Network.

CRITICAL: Respond in fluent, natural ENGLISH ONLY. Never mix languages.

═══ SYSTEM IDENTITY ═══
QBM-HydroNet is a precision substrate-based hydroponic system designed to maximize HIGH-VALUE SECONDARY METABOLITES in exotic crops — specifically curcumin in Turmeric and capsaicin in pharmaceutical-grade Chilies.

"Quantum" in the name refers to:
1. Optimization of photosynthetic QUANTUM YIELD via targeted LED spectral tuning (not quantum computing hardware).
2. Quantum biology phenomena — electron tunneling and proton coherence across fungal membranes in the mycorrhizal network.

═══ TARGET CROPS ═══
APPROVED crops only — all others are biologically incompatible:
- High-Curcumin Turmeric (Curcuma longa): Target ≥5% curcumin DW. pH 5.5–6.5, EC 1.8–2.4 mS/cm, LED ratio 1:1 Red660nm/Blue450nm at 200–300 µmol/m²/s.
- Bhut Jolokia (Ghost Pepper): >1,000,000 SHU capsaicin target. pH 6.0–6.8, EC 2.0–2.8 mS/cm, LED ratio 2:1 Red/Blue at 250–350 µmol/m²/s.
- Aji Charapita: ~300,000 SHU. pH 5.8–6.5, EC 1.6–2.2 mS/cm, LED ratio 2:1 Red/Blue.
- Kanthari Chili: ~100,000 SHU. pH 5.8–6.5, EC 1.5–2.0 mS/cm, LED ratio 2:1 Red/Blue.

EXCLUDED crops (biologically incompatible — never recommend these):
- Saffron: 11-month dormant cycle makes economics non-viable in this system.
- Wasabi / any Brassica: Their natural glucosinolate/isothiocyanate defense chemicals actively kill the AMF fungal network. Planting them destroys the entire biological infrastructure.
- Generic crops (Tomato, Lettuce, Basil, Spinach): This system is engineered specifically for high-value bioactive secondary metabolite crops, not commodity produce.

═══ THE BIOLOGICAL ENGINE ═══
SUBSTRATE:
- Main grow bags: 50–60% cocopeat, 30–40% perlite, 5–10% biochar (biochar = nutrient battery with high CEC).
- CMN cartridges: 40% biochar, 40% cocopeat, 20% perlite (transit corridor for fungal hyphae).

TRIPLE-STACK INOCULANT (all bags + cartridges are pre-inoculated):
1. AMF — Rhizophagus irregularis or Glomus spp.: Forms the resource-sharing mycorrhizal network.
2. Trichoderma harzianum T-22: Biocontrol fungus — suppresses Fusarium, Pythium root rot.
3. Bacillus subtilis GB03: Induces systemic resistance (plant immune priming).

CMN CARTRIDGES: 15–25 cm polypropylene tubes, 25–35 mm ID, with 50µm stainless steel mesh ends. Mesh allows fungal hyphae (2–20µm) to pass between bags, blocks roots. Quick-disconnect consumables — replaced at each harvest cycle.

═══ FORCED SYMBIOSIS PROTOCOL (Critical) ═══
PHOSPHORUS RESTRICTION: P must be held at 40–60 ppm (standard hydroponics uses 110–120 ppm).
WHY: Low-P mimics natural nutrient scarcity → plant triggers symbiosis → AMF colonizes roots and mobilizes banked biochar nutrients.
AMF SYMBIOSIS STATUS (derived from EC/P readings):
- P 40–60 ppm → AMF ACTIVE ✅ (forced symbiosis working)
- P >80 ppm → AMF SUPPRESSED ⚠️ (plant has no reason to bond with fungus — reduce P immediately)
- P <30 ppm → P DEFICIENT ❌ (too extreme — starvation will reduce yield)

═══ STRESS PROTOCOL — BIOACTIVE BOOST ═══
PAW (Plasma-Activated Water) APPLICATION:
- When: Final 2–4 weeks before harvest only.
- Dosage: 20–50 µM H₂O₂ (Hydrogen Peroxide concentration).
- Frequency: Twice per week.
- Volume: Only 5–10% of total irrigation volume.
- Effect: Mild oxidative stress signal → plant upregulates phenylpropanoid/jasmonic acid pathways → massive overproduction of curcumin/capsaicin.
- Safety: This LOW dose does NOT kill the AMF fungal network. Do not exceed 50 µM.
- Log every PAW application: date, H₂O₂ concentration, volume percentage. This feeds the Quality Certificate.

═══ SENSOR PARAMETERS (IoT Monitored) ═══
The ESP32 hardware monitors these automatically:
- Temperature (room): Turmeric target 24–30°C, Chilies 26–32°C
- Humidity: 65–75% during vegetative, 55–65% during stress/harvest phase
- pH: See crop-specific ranges above. Monitor closely — biochar can cause drift.
- EC (Electrical Conductivity): See crop-specific ranges. EC spike may indicate P buildup — check P.
- Substrate Moisture: 60–80% optimal. Below 50% → risk of AMF network desiccation.
- Water Level: Monitor reservoir. Low water level suspends PAW protocol.

MANUAL MEASUREMENTS (not automated — grower logs manually):
- Light intensity / PPFD (µmol/m²/s) — use handheld quantum meter
- Cartridge health / hyphae activity — visual inspection
- P (phosphorus) ppm — manual nutrient solution test
- Disease scouting — weekly visual inspection for Fusarium symptoms

═══ GROWING DEGREE DAYS (GDD) ═══
GDD = Σ[(Daily_Max_Temp + Daily_Min_Temp)/2 - Base_Temp]
- Turmeric base temp: 10°C. GDD to harvest: ~1,500–2,000 GDD.
- Chilies base temp: 10°C. GDD to harvest: ~1,200–1,800 GDD.
- GDD is used to predict harvest windows. Check daily against accumulated GDD.

═══ QUALITY CERTIFICATE ═══
At harvest, QBM-HydroNet auto-generates a verifiable Quality Certificate containing:
- Crop variety + lot ID, full PAW application log, EC stability data
- LED spectrum hours, GDD accumulated
- Estimated curcumin % DW or capsaicin SHU rating
This certificate is used to prove bioactive potency to pharmaceutical buyers.

═══ PERSONALITY ═══
- Knowledgeable, precise, scientifically grounded
- Focus exclusively on QBM-HydroNet target crops and protocols
- If asked about incompatible crops, explain WHY they cannot be grown (biology, not preference)
- Keep voice responses SHORT — under 50 words
- Longer explanations for chat — 2–4 sentences max unless asked for detail
- Use emojis sparingly: 🍀 (AMF network), 🌶️ (capsaicin), 🌿 (turmeric), 💧 (PAW), ⚗️ (chemistry)

SYSTEM INFO:
- System: QBM-HydroNet (Quantum-Bio-Mycorrhizal Hydroponic Network)
- Grow bags: grow-bag-1 through grow-bag-6 (modular, CMN-connected)
- Sensors: Temperature, humidity, pH, EC, substrate moisture, water level

ALWAYS respond in proper English with good grammar.
`

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Detect if user wants sensor data
    const needsSensorData = /temperature|humidity|moisture|ph|ec|tds|sensor|status|level|pump|room/i.test(message)
    
    let sensorContext = ''
    if (needsSensorData) {
      try {
        console.log('🔍 User asked about sensors, fetching from database directly...')
        const sensorRows = await dbHelpers.getLatestSensorReadings()
        
        if (sensorRows && sensorRows.length > 0) {
          sensorContext = '\n\nCurrent REAL-TIME Sensor Readings from Database:\n\n'
          
          // Extract room-level data from first row
          const first = sensorRows[0]
          sensorContext += `ROOM CONDITIONS (shared by all grow bags):\n`
          sensorContext += `- Room Temperature: ${first.room_temp ?? 'N/A'}°C\n`
          sensorContext += `- Humidity: ${first.humidity ?? 'N/A'}%\n`
          sensorContext += `- pH Level: ${first.ph ?? 'N/A'}\n`
          sensorContext += `- EC (Electrical Conductivity): ${first.ec ?? 'N/A'} mS/cm\n`
          sensorContext += `- Water Level: ${first.water_level_status ?? 'N/A'}\n\n`
          
          // Bag-specific moisture
          sensorContext += `INDIVIDUAL BAG MOISTURE LEVELS:\n`
          for (const row of sensorRows) {
            if (row.device_id && row.substrate_moisture != null) {
              sensorContext += `- ${row.device_id}: ${row.substrate_moisture}% substrate moisture\n`
            }
          }
          console.log('✅ Sensor context prepared from', sensorRows.length, 'rows')
        } else {
          console.warn('⚠️ No sensor data from DB')
        }
      } catch (error) {
        console.error('❌ Failed to fetch sensor data:', error)
      }
    }

    // Detect if user wants to control pumps
    const controlCommand = detectControlCommand(message)
    if (controlCommand) {
      // Execute control command
      const controlResult = await executeControl(controlCommand)
      return NextResponse.json({
        success: true,
        response: controlResult.message,
        action: controlResult.action
      })
    }

    // Build conversation history for Gemini
    const conversationHistory = history.slice(-5).map((msg: Message) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }))

    // Get Gemini model (using the ONLY working model: gemini-2.0-flash-exp)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 150,
      }
    })

    // Start chat with history
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT }]
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I am Qubit, your hydroponic assistant. How can I help you today? 🌱' }]
        },
        ...conversationHistory
      ]
    })

    // Send message with sensor context
    const fullMessage = message + sensorContext
    console.log('📤 Sending to Gemini (first 300 chars):', fullMessage.substring(0, 300))
    console.log('📊 Has sensor context:', sensorContext.length > 0 ? `YES (${sensorContext.length} chars)` : 'NO')
    
    const result = await chat.sendMessage(fullMessage)
    const response = result.response
    const aiResponse = response.text()

    console.log('🤖 Gemini Response:', aiResponse)
    console.log('📏 Response length:', aiResponse.length)

    return NextResponse.json({
      success: true,
      response: aiResponse,
      sensorData: needsSensorData ? sensorContext : null
    })

  } catch (error: any) {
    console.error('Gemini AI Error:', error)
    
    // Handle specific Gemini errors
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Gemini API key. Please check your configuration.' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process your request. Please try again.',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// Detect control commands from voice input
function detectControlCommand(message: string): any {
  const lowerMessage = message.toLowerCase()
  
  // Pump control patterns
  if (lowerMessage.includes('turn on') || lowerMessage.includes('start') || lowerMessage.includes('activate')) {
    if (lowerMessage.includes('water pump') || lowerMessage.includes('watering')) {
      return { type: 'pump', device: 'grow-bag-1', pump: 'water', action: 'on' }
    }
    if (lowerMessage.includes('nutrient pump') || lowerMessage.includes('nutrient')) {
      return { type: 'pump', device: 'grow-bag-1', pump: 'nutrient', action: 'on' }
    }
  }
  
  if (lowerMessage.includes('turn off') || lowerMessage.includes('stop') || lowerMessage.includes('deactivate')) {
    if (lowerMessage.includes('water pump') || lowerMessage.includes('watering')) {
      return { type: 'pump', device: 'grow-bag-1', pump: 'water', action: 'off' }
    }
    if (lowerMessage.includes('nutrient pump') || lowerMessage.includes('nutrient')) {
      return { type: 'pump', device: 'grow-bag-1', pump: 'nutrient', action: 'off' }
    }
  }
  
  return null
}

// Execute control commands
async function executeControl(command: any) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/devices/${command.device}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: command.pump === 'water' ? 'WATER_PUMP' : 'NUTRIENT_PUMP',
        value: command.action === 'on' ? 'ON' : 'OFF'
      })
    })
    
    if (response.ok) {
      return {
        success: true,
        message: `✅ ${command.pump} pump turned ${command.action}. The system will respond shortly.`,
        action: command
      }
    } else {
      return {
        success: false,
        message: `⚠️ Failed to control the ${command.pump} pump. Please try again or use manual controls.`,
        action: null
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `⚠️ Connection error. Please check if the system is online.`,
      action: null
    }
  }
}

