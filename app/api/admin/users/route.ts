import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getUserFromRequest } from '@/lib/auth-roles'
import { db } from '@/lib/database'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

/**
 * GET /api/admin/users
 * List all users — admin only.
 */
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const result = await db.query(
      `SELECT user_id, username, email, full_name, first_name, last_name, role, is_active, created_at, last_login
       FROM users ORDER BY created_at DESC`
    )

    return NextResponse.json({
      success: true,
      users: result.rows.map((u: any) => ({
        ...u,
        password_hash: undefined, // never expose
      })),
      count: result.rowCount,
    })
  } catch (err: any) {
    console.error('Admin users list error:', err)
    return NextResponse.json({ error: 'Failed to fetch users', details: err.message }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/users
 * Update a user's role or active status — admin only.
 *
 * Body: { userId: string, role?: 'admin'|'operator'|'viewer', isActive?: boolean }
 */
export async function PATCH(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { userId, role, isActive } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Prevent admin from demoting themselves
    if (userId === auth.user.userId && role && role !== 'admin') {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    const validRoles = ['admin', 'operator', 'viewer', 'user']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 })
    }

    const updates: string[] = []
    const values: any[] = []
    let idx = 1

    if (role !== undefined) {
      updates.push(`role = $${idx}`)
      values.push(role)
      idx++
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${idx}`)
      values.push(isActive)
      idx++
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Nothing to update — provide role or isActive' }, { status: 400 })
    }

    values.push(userId)
    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = $${idx} 
       RETURNING user_id, username, email, role, is_active`,
      values
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user: result.rows[0] })
  } catch (err: any) {
    console.error('Admin user update error:', err)
    return NextResponse.json({ error: 'Failed to update user', details: err.message }, { status: 500 })
  }
}
