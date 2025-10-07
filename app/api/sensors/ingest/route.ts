import { NextRequest, NextResponse } from 'next/server'
import { dbHelpers } from '@/lib/database'

// API endpoint for ESP32 devices to send sensor data
export async function POST(request: NextRequest) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('x-api-key')
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      )
    }

    // Validate API key and get device info
    const deviceInfo = await dbHelpers.validateApiKey(apiKey)
    if (!deviceInfo) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    // Parse sensor data from ESP32
    const sensorData = await request.json()
    
    // Debug: Log the incoming data
    console.log('ESP32 Data Received:', JSON.stringify(sensorData, null, 2))
    
    // Extract device ID (use from data or API key device)
    const deviceId = sensorData.device_id || deviceInfo.device_id || 'grow-bag-1'
    
    // Validate required fields
    const requiredFields = ['room_temp', 'ph', 'ec', 'substrate_moisture', 'humidity']
    for (const field of requiredFields) {
      if (sensorData[field] === undefined || sensorData[field] === null || isNaN(sensorData[field])) {
        console.log(`Invalid field: ${field}, value:`, sensorData[field])
        return NextResponse.json(
          { error: `Invalid or missing field: ${field}. Value: ${sensorData[field]}` },
          { status: 400 }
        )
      }
    }

    // Validate data ranges
    if (sensorData.room_temp < -10 || sensorData.room_temp > 60) {
      return NextResponse.json(
        { error: 'Temperature out of valid range (-10 to 60°C)' },
        { status: 400 }
      )
    }

    if (sensorData.ph < 0 || sensorData.ph > 14) {
      return NextResponse.json(
        { error: 'pH out of valid range (0 to 14)' },
        { status: 400 }
      )
    }

    if (sensorData.ec < 0 || sensorData.ec > 10) {
      return NextResponse.json(
        { error: 'EC out of valid range (0 to 10 mS/cm)' },
        { status: 400 }
      )
    }

    if (sensorData.substrate_moisture < 0 || sensorData.substrate_moisture > 100) {
      return NextResponse.json(
        { error: 'Moisture out of valid range (0 to 100%)' },
        { status: 400 }
      )
    }

    if (sensorData.humidity < 0 || sensorData.humidity > 100) {
      return NextResponse.json(
        { error: 'Humidity out of valid range (0 to 100%)' },
        { status: 400 }
      )
    }

    // Set default water level status if not provided
    const waterLevelStatus = sensorData.water_level_status || 'Adequate'

    // Insert sensor reading into TimescaleDB
    const readingId = await dbHelpers.insertSensorReading({
      device_id: deviceInfo.device_id,
      room_temp: Number(sensorData.room_temp),
      ph: Number(sensorData.ph),
      ec: Number(sensorData.ec),
      substrate_moisture: Number(sensorData.substrate_moisture),
      water_level_status: waterLevelStatus,
      humidity: Number(sensorData.humidity)
    })

    // Log successful data ingestion
    console.log(`Sensor data received from device ${deviceInfo.device_id}:`, {
      reading_id: readingId,
      room_temp: sensorData.room_temp,
      ph: sensorData.ph,
      ec: sensorData.ec,
      substrate_moisture: sensorData.substrate_moisture,
      humidity: sensorData.humidity,
      water_level_status: waterLevelStatus
    })

    // Return success response to ESP32
    return NextResponse.json({
      success: true,
      reading_id: readingId,
      device_id: deviceInfo.device_id,
      timestamp: new Date().toISOString(),
      message: 'Sensor data stored successfully'
    })

  } catch (error) {
    console.error('Error processing ESP32 sensor data:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process sensor data'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check API status (for ESP32 to test connectivity)
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      )
    }

    // Validate API key
    const deviceInfo = await dbHelpers.validateApiKey(apiKey)
    if (!deviceInfo) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      status: 'online',
      device_id: deviceInfo.device_id,
      timestamp: new Date().toISOString(),
      message: 'API endpoint is ready to receive sensor data'
    })

  } catch (error) {
    console.error('Error checking API status:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to check API status'
      },
      { status: 500 }
    )
  }
}