import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { dbHelpers } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, username, password } = await request.json()

    if (!firstName || !lastName || !email || !username || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUserByEmail = await dbHelpers.findUserByEmail(email)
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Check if username already exists
    const existingUserByUsername = await dbHelpers.findUserByUsername(username)
    if (existingUserByUsername) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      )
    }

    // Hash password
    const saltRounds = 12
    const password_hash = await bcrypt.hash(password, saltRounds)

    // Create user
    const newUser = await dbHelpers.createUser({
      username: username,
      email,
      password_hash,
      full_name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
      role: 'user'
    })

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser.user_id, 
        username: newUser.username,
        role: newUser.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      user: newUser,
      token
    })

  } catch (error: any) {
    console.error('Signup error:', error)
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      if (error.constraint?.includes('email')) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        )
      }
      if (error.constraint?.includes('username')) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}