import { NextRequest, NextResponse } from 'next/server'
import { dbHelpers } from '@/lib/database'

// API endpoint for ESP32 devices to send sensor data
export async function POST(request: NextRequest) {
  try {
    // ✅ Get API key from header (case-insensitive)
    const apiKey = request.headers.get('x-api-key') || request.headers.get('X-API-Key')
    
    if (!apiKey) {
      console.error('❌ No API key provided')
      return NextResponse.json(
        { error: 'API key required', success: false },
        { status: 401 }
      )
    }

    console.log(`🔑 API Key received: ${apiKey.substring(0, 10)}...`)

    // Validate API key and get device info
    const deviceInfo = await dbHelpers.validateApiKey(apiKey)
    if (!deviceInfo) {
      console.error('❌ Invalid API key:', apiKey)
      return NextResponse.json(
        { error: 'Invalid API key', success: false },
        { status: 401 }
      )
    }

    console.log(`✅ Device authenticated: ${deviceInfo.device_id}`)

    // Parse sensor data from ESP32
    const sensorData = await request.json()
    console.log('📊 Sensor data received:', JSON.stringify(sensorData, null, 2))
    
    // Validate required fields
    if (sensorData.room_temp == null || sensorData.humidity == null || sensorData.ph == null || sensorData.ec == null || sensorData.substrate_moisture == null) {
      return NextResponse.json(
        { error: 'Missing required sensor fields', success: false },
        { status: 400 }
      )
    }

    // Validate required fields are numbers
    const requiredFields = ['room_temp', 'ph', 'ec', 'substrate_moisture', 'humidity']
    for (const field of requiredFields) {
      if (sensorData[field] === undefined || sensorData[field] === null || isNaN(sensorData[field])) {
        console.log(`❌ Invalid field: ${field}, value:`, sensorData[field])
        return NextResponse.json(
          { error: `Invalid or missing field: ${field}. Value: ${sensorData[field]}`, success: false },
          { status: 400 }
        )
      }
    }

    // Validate data ranges
    if (sensorData.ph < 0 || sensorData.ph > 14) {
      return NextResponse.json(
        { error: 'pH out of valid range (0-14)', success: false },
        { status: 400 }
      )
    }

    if (sensorData.ec < 0 || sensorData.ec > 10) {
      return NextResponse.json(
        { error: 'EC out of valid range (0-10 mS/cm)', success: false },
        { status: 400 }
      )
    }

    // Insert into database (bag-level: sensor_readings table)
    const readingId = await dbHelpers.insertSensorReading({
      device_id: deviceInfo.device_id,
      room_temp: Number(sensorData.room_temp),
      ph: Number(sensorData.ph),
      ec: Number(sensorData.ec),
      substrate_moisture: Number(sensorData.substrate_moisture),
      water_level_status: sensorData.water_level_status || 'Adequate',
      humidity: Number(sensorData.humidity)
    })

    // Also insert room-level sensors into room_sensors table
    // (dashboard reads room data from this table via get_latest_sensor_readings_v2)
    try {
      await dbHelpers.insertRoomSensorReading({
        room_id: 'main-room',
        room_temp: Number(sensorData.room_temp),
        humidity: Number(sensorData.humidity),
        ph: Number(sensorData.ph),
        ec: Number(sensorData.ec),
        water_level_status: sensorData.water_level_status || 'Adequate'
      })
    } catch (roomErr) {
      // Non-fatal: bag data is already stored
      console.warn('⚠ Room sensor insert failed:', roomErr)
    }

    console.log(`✅ Data stored successfully. Reading ID: ${readingId}`)

    return NextResponse.json({
      success: true,
      reading_id: readingId,
      device_id: deviceInfo.device_id,
      timestamp: new Date().toISOString(),
      message: 'Sensor data stored successfully'
    })

  } catch (error) {
    console.error('❌ Error processing ESP32 data:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    )
  }
}

// ✅ GET endpoint for connectivity test
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('X-API-Key')
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required', success: false },
        { status: 401 }
      )
    }

    const deviceInfo = await dbHelpers.validateApiKey(apiKey)
    if (!deviceInfo) {
      return NextResponse.json(
        { error: 'Invalid API key', success: false },
        { status: 401 }
      )
    }

    return NextResponse.json({
      status: 'online',
      device_id: deviceInfo.device_id,
      timestamp: new Date().toISOString(),
      message: 'API endpoint ready',
      success: true
    })

  } catch (error) {
    console.error('Error checking API status:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        success: false
      },
      { status: 500 }
    )
  }
}
