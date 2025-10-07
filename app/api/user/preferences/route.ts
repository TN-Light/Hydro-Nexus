import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Helper to get user_id from JWT token
function getUserIdFromToken(request: NextRequest): string | null {
  try {
    // Try to get token from cookie first
    const token = request.cookies.get('hydro-nexus-token')?.value
    
    // If not in cookie, try Authorization header
    const authHeader = request.headers.get('authorization')
    const headerToken = authHeader?.replace('Bearer ', '')
    
    const actualToken = token || headerToken
    
    if (!actualToken) {
      return null
    }

    const decoded = jwt.verify(
      actualToken,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as { userId: string }

    return decoded.userId
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

// GET - Fetch user preferences
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await pool.query(
      `SELECT 
        theme,
        language,
        sidebar_collapsed,
        dashboard_layout,
        email_notifications,
        push_notifications,
        alert_sound,
        notification_frequency,
        temperature_unit,
        date_format,
        time_format,
        timezone,
        default_chart_period,
        chart_animation,
        advanced_mode,
        developer_mode,
        auto_refresh,
        refresh_interval,
        custom_settings
      FROM user_preferences
      WHERE user_id = $1`,
      [userId]
    )

    if (result.rows.length === 0) {
      // Create default preferences if none exist
      const insertResult = await pool.query(
        `INSERT INTO user_preferences (user_id)
         VALUES ($1)
         RETURNING *`,
        [userId]
      )
      
      return NextResponse.json({
        success: true,
        preferences: insertResult.rows[0],
        isDefault: true
      })
    }

    return NextResponse.json({
      success: true,
      preferences: result.rows[0],
      isDefault: false
    })

  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Update user preferences
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const preferences = await request.json()

    // Build dynamic UPDATE query based on provided fields
    const allowedFields = [
      'theme', 'language', 'sidebar_collapsed', 'dashboard_layout',
      'email_notifications', 'push_notifications', 'alert_sound', 
      'notification_frequency', 'temperature_unit', 'date_format',
      'time_format', 'timezone', 'default_chart_period', 'chart_animation',
      'advanced_mode', 'developer_mode', 'auto_refresh', 'refresh_interval',
      'custom_settings'
    ]

    const updates: string[] = []
    const values: any[] = [userId]
    let paramIndex = 2

    Object.keys(preferences).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`)
        values.push(preferences[key])
        paramIndex++
      }
    })

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const query = `
      INSERT INTO user_preferences (user_id, ${Object.keys(preferences).filter(k => allowedFields.includes(k)).join(', ')})
      VALUES ($1, ${values.slice(1).map((_, i) => `$${i + 2}`).join(', ')})
      ON CONFLICT (user_id) 
      DO UPDATE SET ${updates.join(', ')}
      RETURNING *
    `

    const result = await pool.query(query, values)

    return NextResponse.json({
      success: true,
      preferences: result.rows[0],
      message: 'Preferences updated successfully'
    })

  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Partial update of user preferences
export async function PATCH(request: NextRequest) {
  return POST(request) // Same logic for partial updates
}
