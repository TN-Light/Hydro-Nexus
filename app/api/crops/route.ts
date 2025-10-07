import { NextResponse } from 'next/server'
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
 * GET /api/crops
 * Fetch all available crop types with their optimal growing parameters
 * 
 * Returns:
 * - List of crops with optimal pH, EC, temperature, humidity, moisture ranges
 * - Used for crop selection dropdowns and parameter recommendations
 */
export async function GET() {
  try {
    console.log('📋 Fetching all crop types...')

    const query = `
      SELECT 
        crop_id,
        name,
        optimal_ph_min,
        optimal_ph_max,
        optimal_ec_min,
        optimal_ec_max,
        optimal_temp_min,
        optimal_temp_max,
        optimal_humidity_min,
        optimal_humidity_max,
        optimal_substrate_moisture_min,
        optimal_substrate_moisture_max,
        growing_notes
      FROM crop_types
      ORDER BY name ASC
    `

    const result = await pool.query(query)

    console.log(`✅ Retrieved ${result.rows.length} crop types`)

    // Format response with proper data types
    const crops = result.rows.map(row => ({
      id: row.crop_id,
      name: row.name,
      optimalRanges: {
        pH: {
          min: parseFloat(row.optimal_ph_min),
          max: parseFloat(row.optimal_ph_max)
        },
        ec: {
          min: parseFloat(row.optimal_ec_min),
          max: parseFloat(row.optimal_ec_max)
        },
        temperature: {
          min: parseFloat(row.optimal_temp_min),
          max: parseFloat(row.optimal_temp_max)
        },
        humidity: {
          min: parseInt(row.optimal_humidity_min),
          max: parseInt(row.optimal_humidity_max)
        },
        moisture: {
          min: parseInt(row.optimal_substrate_moisture_min),
          max: parseInt(row.optimal_substrate_moisture_max)
        }
      },
      notes: row.growing_notes
    }))

    return NextResponse.json({
      success: true,
      crops
    })

  } catch (error) {
    console.error('❌ Error fetching crop types:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch crop types',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
