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

    // Get user profile from database
    const user = await dbHelpers.findUserById(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      user: userWithoutPassword
    })

  } catch (error: any) {
    console.error('Profile get error:', error)

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
      { error: 'Failed to get profile' },
      { status: 500 }
    )
  }
}
