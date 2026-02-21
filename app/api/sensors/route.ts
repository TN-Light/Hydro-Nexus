import { NextRequest, NextResponse } from 'next/server'
import { dbHelpers } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

    const readings = await dbHelpers.getLatestSensorReadings(deviceId ? [deviceId] : undefined)

    return NextResponse.json(readings)

  } catch (error) {
    console.error('Error fetching sensor readings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sensor readings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate required fields
    if (!data.device_id) {
      return NextResponse.json(
        { error: 'device_id is required' },
        { status: 400 }
      )
    }

    const result = await dbHelpers.insertSensorReading(data)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error inserting sensor reading:', error)
    return NextResponse.json(
      { error: 'Failed to insert sensor reading' },
      { status: 500 }
    )
  }
}
