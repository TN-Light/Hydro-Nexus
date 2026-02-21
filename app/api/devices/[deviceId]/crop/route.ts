import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { QBM_CROPS } from '@/lib/crop-database'

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

/** Ensure qbm_crop_slug column exists on devices table (cached — runs only once per process) */
let _columnEnsured = false
async function ensureColumn() {
  if (_columnEnsured) return
  await pool.query(
    `ALTER TABLE devices ADD COLUMN IF NOT EXISTS qbm_crop_slug VARCHAR(60)`
  )
  _columnEnsured = true
}

/**
 * POST /api/devices/[deviceId]/crop
 * Assign a QBM crop to a device (by string slug)
 *
 * Body:
 * - cropId: string slug e.g. "turmeric" | "bhut-jolokia" | "aji-charapita" | "kanthari"
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params
    const body = await request.json()
    const { cropId } = body as { cropId: string }

    if (!cropId) {
      return NextResponse.json({ error: 'cropId is required' }, { status: 400 })
    }

    const crop = QBM_CROPS.find(c => c.id === cropId)
    if (!crop) {
      return NextResponse.json(
        { error: `Unknown QBM crop: ${cropId}` },
        { status: 400 }
      )
    }

    console.log(`🌱 Assigning QBM crop "${cropId}" to device ${deviceId}`)

    await ensureColumn()

    const result = await pool.query(
      `UPDATE devices SET qbm_crop_slug = $1, updated_at = CURRENT_TIMESTAMP
       WHERE device_id = $2
       RETURNING device_id, name, qbm_crop_slug`,
      [cropId, deviceId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    console.log(`✅ Device ${deviceId} assigned QBM crop "${cropId}"`)

    return NextResponse.json({
      success: true,
      device: result.rows[0],
      crop: { id: crop.id, name: crop.name },
      message: 'Crop assigned successfully'
    })

  } catch (error) {
    console.error('❌ Error assigning device crop:', error)
    return NextResponse.json(
      {
        error: 'Failed to assign device crop',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/devices/[deviceId]/crop
 * Get the QBM crop assigned to a device
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params

    console.log(`📋 Fetching QBM crop for device ${deviceId}`)

    await ensureColumn()

    const result = await pool.query(
      `SELECT device_id, name, qbm_crop_slug FROM devices WHERE device_id = $1`,
      [deviceId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const row = result.rows[0]
    const slug: string | null = row.qbm_crop_slug
    const crop = slug ? QBM_CROPS.find(c => c.id === slug) : null

    return NextResponse.json({
      success: true,
      device: {
        id: row.device_id,
        name: row.name,
        cropId: slug ?? null,
        cropName: crop?.name ?? null,
        optimalRanges: crop ? {
          pH:          { min: crop.parameters.pH.min,                  max: crop.parameters.pH.max },
          ec:          { min: crop.parameters.ec.min,                  max: crop.parameters.ec.max },
          temperature: { min: crop.parameters.temperature.min,         max: crop.parameters.temperature.max },
          humidity:    { min: crop.parameters.humidity_vegetative.min, max: crop.parameters.humidity_vegetative.max },
          moisture:    { min: crop.parameters.substrate_moisture.min,  max: crop.parameters.substrate_moisture.max },
        } : null,
        notes: crop?.substrate_notes ?? null
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
