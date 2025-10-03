import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { dbHelpers } from '@/lib/database'

export async function POST(request: NextRequest) {
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

    const { avatarData } = await request.json()

    if (!avatarData) {
      return NextResponse.json(
        { error: 'Avatar data is required' },
        { status: 400 }
      )
    }

    // Validate file size (base64 string length check)
    if (avatarData.length > 3 * 1024 * 1024) { // ~2MB after base64 encoding
      return NextResponse.json(
        { error: 'Avatar file too large (max 2MB)' },
        { status: 400 }
      )
    }

    // Update user avatar in database
    const updatedUser = await dbHelpers.updateUserProfile(userId, {
      avatar_url: avatarData
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      avatarUrl: avatarData
    })

  } catch (error: any) {
    console.error('Avatar upload error:', error)
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    )
  }
}