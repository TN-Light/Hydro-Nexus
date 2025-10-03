import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { dbHelpers } from '@/lib/database'

export async function PUT(request: NextRequest) {
  try {
    // Get the token from Authorization header or cookie
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('hydro-nexus-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
    const userId = decoded.userId

    const { firstName, lastName, fullName } = await request.json()

    if (!firstName && !lastName && !fullName) {
      return NextResponse.json(
        { error: 'At least one field is required' },
        { status: 400 }
      )
    }

    // Update user profile in database
    const updatedUser = await dbHelpers.updateUserProfile(userId, {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName || `${firstName || ''} ${lastName || ''}`.trim()
    })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })

  } catch (error: any) {
    console.error('Profile update error:', error)
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}