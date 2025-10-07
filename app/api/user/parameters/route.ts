import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import * as jwt from 'jsonwebtoken'

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Helper function to verify JWT token and get user_id
function getUserIdFromToken(request: NextRequest): string | null {
  try {
    // Try to get token from cookie first (middleware sets this)
    let token = request.cookies.get('hydro-nexus-token')?.value
    
    // Fallback to Authorization header
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      console.error('❌ No token found in request')
      return null
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; user_id?: string }
    const userId = decoded.userId || decoded.user_id
    
    if (!userId) {
      console.error('❌ No userId in token payload')
      return null
    }

    return userId
  } catch (error) {
    console.error('❌ Token verification failed:', error)
    return null
  }
}

/**
 * GET /api/user/parameters
 * Fetch user-specific optimization parameter ranges
 * 
 * Query Parameters:
 * - deviceId: Device identifier (e.g., 'grow-bag-1') or null for "all devices"
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const deviceId = searchParams.get('deviceId') // Can be null for "all devices"
    const cropId = searchParams.get('cropId') // Crop-specific parameters

    console.log(`📊 Fetching parameters: user=${userId}, device=${deviceId || 'all'}, crop=${cropId || 'any'}`)

    // Query for user-specific parameters - prioritize crop-specific, then generic
    const query = `
      SELECT parameter_ranges, device_id, crop_id, updated_at
      FROM user_parameters
      WHERE user_id = $1 
        AND (device_id = $2 OR (device_id IS NULL AND $2 IS NULL))
        AND ($3::INTEGER IS NULL OR crop_id = $3 OR crop_id IS NULL)
      ORDER BY 
        CASE WHEN crop_id = $3 THEN 1 ELSE 2 END, -- Crop-specific first
        CASE WHEN device_id = $2 THEN 1 ELSE 2 END, -- Device-specific next
        updated_at DESC
      LIMIT 1
    `

    const result = await pool.query(query, [userId, deviceId, cropId ? parseInt(cropId) : null])

    if (result.rows.length === 0) {
      // Return default parameters if none exist
      const defaultParameters = {
        temperature: { min: 20, max: 28 },
        humidity: { min: 60, max: 80 },
        pH: { min: 5.5, max: 6.8 },
        ec: { min: 1.2, max: 2.4 },
        ppm: { min: 800, max: 1400 },
        nitrogen: { min: 150, max: 200 },
        phosphorus: { min: 30, max: 50 },
        potassium: { min: 200, max: 300 },
        calcium: { min: 150, max: 200 },
        magnesium: { min: 50, max: 75 },
        iron: { min: 2, max: 5 },
      }

      console.log(`⚠️ No parameters found for user, returning defaults`)
      return NextResponse.json({
        success: true,
        parameters: defaultParameters,
        deviceId: deviceId,
        isDefault: true
      })
    }

    console.log(`✅ Retrieved parameters for user ${userId}`)
    return NextResponse.json({
      success: true,
      parameters: result.rows[0].parameter_ranges,
      deviceId: result.rows[0].device_id,
      updatedAt: result.rows[0].updated_at,
      isDefault: false
    })

  } catch (error) {
    console.error('❌ Error fetching user parameters:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch parameters',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/parameters
 * Save user-specific optimization parameter ranges
 * 
 * Body:
 * - deviceId: Device identifier or null for "all devices"
 * - parameters: Parameter ranges object
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { deviceId, parameters, cropId } = body

    if (!parameters || typeof parameters !== 'object') {
      return NextResponse.json(
        { error: 'Invalid parameters - must be an object' },
        { status: 400 }
      )
    }

    console.log(`💾 Saving parameters: user=${userId}, device=${deviceId || 'all'}, crop=${cropId || 'any'}`)

    // Use UPSERT (INSERT ... ON CONFLICT UPDATE) to create or update
    const query = `
      INSERT INTO user_parameters (user_id, device_id, crop_id, parameter_ranges)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, device_id, crop_id) 
      DO UPDATE SET 
        parameter_ranges = EXCLUDED.parameter_ranges,
        updated_at = CURRENT_TIMESTAMP
      RETURNING parameter_id, updated_at
    `

    const result = await pool.query(query, [
      userId,
      deviceId, // Can be null for "all devices"
      cropId || null, // Can be null for generic parameters
      JSON.stringify(parameters)
    ])

    console.log(`✅ Parameters saved for user ${userId}`)
    return NextResponse.json({
      success: true,
      parameterId: result.rows[0].parameter_id,
      updatedAt: result.rows[0].updated_at,
      message: 'Parameters saved successfully'
    })

  } catch (error) {
    console.error('❌ Error saving user parameters:', error)
    return NextResponse.json(
      { 
        error: 'Failed to save parameters',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
