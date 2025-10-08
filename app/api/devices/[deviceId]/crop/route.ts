import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

/**
 * POST /api/devices/[deviceId]/crop
 * Update the crop type for a specific device
 * 
 * Body:
 * - cropId: The crop_id from crop_types table
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params
    const body = await request.json()
    const { cropId } = body

    if (!cropId) {
      return NextResponse.json(
        { error: 'cropId is required' },
        { status: 400 }
      )
    }

    console.log(`🌱 Updating device ${deviceId} crop to ${cropId}`)

    // Update device crop_id
    const query = `
      UPDATE devices
      SET crop_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE device_id = $2
      RETURNING device_id, name, crop_id
    `

    const result = await pool.query(query, [cropId, deviceId])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Device ${deviceId} crop updated to ${cropId}`)

    return NextResponse.json({
      success: true,
      device: result.rows[0],
      message: 'Crop type updated successfully'
    })

  } catch (error) {
    console.error('❌ Error updating device crop:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update device crop',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/devices/[deviceId]/crop
 * Get the current crop type for a device
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params

    console.log(`📋 Fetching crop for device ${deviceId}`)

    const query = `
      SELECT 
        d.device_id,
        d.name as device_name,
        d.crop_id,
        ct.name as crop_name,
        ct.optimal_ph_min,
        ct.optimal_ph_max,
        ct.optimal_ec_min,
        ct.optimal_ec_max,
        ct.optimal_temp_min,
        ct.optimal_temp_max,
        ct.optimal_humidity_min,
        ct.optimal_humidity_max,
        ct.optimal_substrate_moisture_min,
        ct.optimal_substrate_moisture_max,
        ct.growing_notes
      FROM devices d
      LEFT JOIN crop_types ct ON d.crop_id = ct.crop_id
      WHERE d.device_id = $1
    `

    const result = await pool.query(query, [deviceId])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      )
    }

    const row = result.rows[0]

    return NextResponse.json({
      success: true,
      device: {
        id: row.device_id,
        name: row.device_name,
        cropId: row.crop_id,
        cropName: row.crop_name,
        optimalRanges: row.crop_id ? {
          pH: { min: parseFloat(row.optimal_ph_min), max: parseFloat(row.optimal_ph_max) },
          ec: { min: parseFloat(row.optimal_ec_min), max: parseFloat(row.optimal_ec_max) },
          temperature: { min: parseFloat(row.optimal_temp_min), max: parseFloat(row.optimal_temp_max) },
          humidity: { min: parseInt(row.optimal_humidity_min), max: parseInt(row.optimal_humidity_max) },
          moisture: { min: parseInt(row.optimal_substrate_moisture_min), max: parseInt(row.optimal_substrate_moisture_max) }
        } : null,
        notes: row.growing_notes
      }
    })

  } catch (error) {
    console.error('❌ Error fetching device crop:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch device crop',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
