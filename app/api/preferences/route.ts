import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { dbHelpers } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Get the token from Authorization header or cookie
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('qbm-hydronet-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const userId = decoded.userId

    // Get user preferences from database
    const preferences = await dbHelpers.getUserPreferences(userId)

    return NextResponse.json({
      success: true,
      preferences: preferences || {
        theme: 'light',
        notification_preferences: {
          masterEnabled: true,
          rules: {
            ph_critical: ['in_app', 'push'],
            ec_range: ['in_app'],
            do_low: ['in_app', 'push', 'email'],
            orp_low: ['in_app'],
            high_humidity: ['in_app', 'push'],
            device_offline: ['in_app', 'push', 'email']
          }
        },
        measurement_units: {
          temperature: 'C',
          concentration: 'ppm'
        },
        dashboard_default_range: '24h',
        dashboard_layout: {}
      }
    })

  } catch (error: any) {
    console.error('Get preferences error:', error)

    if (error?.name === 'TokenExpiredError' || error?.name === 'JsonWebTokenError') {
      const response = NextResponse.json(
        {
          error:
            error?.name === 'TokenExpiredError'
              ? 'Authentication token expired'
              : 'Invalid authentication token',
        },
        { status: 401 }
      )
      response.cookies.set('qbm-hydronet-token', '', { path: '/', maxAge: 0, sameSite: 'strict' })
      return response
    }

    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get the token from Authorization header or cookie
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('qbm-hydronet-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const userId = decoded.userId

    const preferences = await request.json()

    // Update user preferences in database
    const updatedPreferences = await dbHelpers.updateUserPreferences(userId, preferences)

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences
    })

  } catch (error: any) {
    console.error('Update preferences error:', error)

    if (error?.name === 'TokenExpiredError' || error?.name === 'JsonWebTokenError') {
      const response = NextResponse.json(
        {
          error:
            error?.name === 'TokenExpiredError'
              ? 'Authentication token expired'
              : 'Invalid authentication token',
        },
        { status: 401 }
      )
      response.cookies.set('qbm-hydronet-token', '', { path: '/', maxAge: 0, sameSite: 'strict' })
      return response
    }

    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
