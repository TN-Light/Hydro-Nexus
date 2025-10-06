import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// System prompt to give Qubit personality and context
const SYSTEM_PROMPT = `You are Qubit, an AI assistant for a hydroponic growing system called Hydro-Nexus. 

CRITICAL: You MUST respond in fluent, natural ENGLISH ONLY. Never mix languages.

Your personality:
- Helpful and knowledgeable about hydroponics and plant care
- Friendly but professional
- Speak in clear, fluent English
- Concise responses (2-3 sentences max for voice)
- Use plant/growing emojis when appropriate 🌱💧🌡️

Your capabilities:
- Monitor temperature, humidity, pH, EC, moisture levels
- Control water and nutrient pumps
- Provide plant health advice
- Answer questions about the hydroponic system
- Analyze sensor data trends

Current system information:
- System name: Hydro-Nexus
- Devices: Multiple grow bags (grow-bag-1, grow-bag-2, etc.)
- Sensors: Temperature, humidity, pH, EC/TDS, soil moisture, water level
- Controls: Water pump, nutrient pump

When users ask about sensor data, you can query the system.
Keep responses SHORT for voice - under 50 words when possible.
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
        console.log('🔍 User asked about sensors, fetching real database data...')
        // Fetch latest sensor data
        const sensorResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/sensors/latest`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        
        console.log('📡 Sensor API response status:', sensorResponse.status)
        
        if (sensorResponse.ok) {
          const sensorData = await sensorResponse.json()
          console.log('📊 Sensor data received:', JSON.stringify(sensorData, null, 2))
          
          if (sensorData.success) {
            // NEW STRUCTURE: Room sensors are SHARED, only moisture is bag-specific
            sensorContext = '\n\nCurrent REAL-TIME Sensor Readings from Database:\n\n'
            
            // Room-level sensors (SAME for all bags)
            if (sensorData.room) {
              const room = sensorData.room
              sensorContext += `ROOM CONDITIONS (shared by all grow bags):\n`
              sensorContext += `- Room Temperature: ${room.roomTemp}°C\n`
              sensorContext += `- Humidity: ${room.humidity}%\n`
              sensorContext += `- pH Level: ${room.pH}\n`
              sensorContext += `- EC (Electrical Conductivity): ${room.ec} mS/cm\n`
              sensorContext += `- Water Level: ${room.waterLevel}\n\n`
            }
            
            // Bag-specific moisture levels
            if (sensorData.bags && Object.keys(sensorData.bags).length > 0) {
              sensorContext += `INDIVIDUAL BAG MOISTURE LEVELS:\n`
              Object.values(sensorData.bags).forEach((bag: any) => {
                sensorContext += `- ${bag.deviceId}: ${bag.moisture}% substrate moisture\n`
              })
              
              console.log('✅ Sensor context prepared: Room sensors + ', Object.keys(sensorData.bags).length, 'bags')
            } else {
              console.warn('⚠️ No bag moisture data')
            }
          } else {
            console.warn('⚠️ No sensor data in response')
          }
        } else {
          console.error('❌ Sensor API failed with status:', sensorResponse.status)
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
