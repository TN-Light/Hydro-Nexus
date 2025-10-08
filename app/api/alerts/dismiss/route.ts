import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Helper to get user_id from JWT token
function getUserIdFromToken(request: NextRequest): string | null {
  try {
    const token = request.cookies.get('hydro-nexus-token')?.value
    const authHeader = request.headers.get('authorization')
    const headerToken = authHeader?.replace('Bearer ', '')
    const actualToken = token || headerToken
    
    if (!actualToken) return null

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

// POST - Dismiss an alert
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { alertId, dismissAll } = await request.json()

    if (dismissAll) {
      // Dismiss all active alerts for this user
      await pool.query(
        `UPDATE alerts 
         SET dismissed_by = array_append(dismissed_by, $1::uuid)
         WHERE resolved_at IS NULL 
           AND NOT ($1::uuid = ANY(dismissed_by))`,
        [userId]
      )

      return NextResponse.json({
        success: true,
        message: 'All alerts dismissed'
      })
    }

    if (!alertId) {
      return NextResponse.json(
        { success: false, error: 'Alert ID required' },
        { status: 400 }
      )
    }

    // Dismiss single alert
    await pool.query(
      `UPDATE alerts 
       SET dismissed_by = array_append(dismissed_by, $1::uuid)
       WHERE alert_id = $2 
         AND NOT ($1::uuid = ANY(dismissed_by))`,
      [userId, alertId]
    )

    return NextResponse.json({
      success: true,
      message: 'Alert dismissed'
    })

  } catch (error) {
    console.error('Error dismissing alert:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
