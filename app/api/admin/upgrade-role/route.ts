import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// POST /api/admin/upgrade-role
// One-time utility to upgrade all existing users from 'user' role to 'operator'
// so they can control pumps from the dashboard.
export async function POST(request: NextRequest) {
  try {
    const result = await db.query(
      `UPDATE users SET role = 'operator' WHERE role = 'user' OR role IS NULL RETURNING user_id, username, role`
    )
    
    return NextResponse.json({
      success: true,
      updated: result.rows.length,
      users: result.rows,
      message: `${result.rows.length} user(s) upgraded to operator role. Log out and log back in for changes to take effect.`
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 }
    )
  }
}
