import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// GET /api/admin/check-commands - Debug: see all commands in the database
export async function GET() {
  try {
    const result = await db.query(
      `SELECT command_id, device_id, action, status, priority, 
              created_at, sent_at, expires_at,
              CASE WHEN expires_at < NOW() THEN 'EXPIRED' ELSE 'VALID' END as expiry_status
       FROM device_commands 
       ORDER BY created_at DESC 
       LIMIT 20`
    )
    
    return NextResponse.json({
      success: true,
      total: result.rows.length,
      commands: result.rows
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/check-commands - Create a test command directly (bypasses auth)
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    const result = await db.query(
      `INSERT INTO device_commands (device_id, action, parameters, priority, expires_at)
       VALUES ('grow-bag-1', $1, '{}', 'high', NOW() + INTERVAL '10 minutes')
       RETURNING *`,
      [action || 'nutrient_pump_on']
    )
    
    return NextResponse.json({
      success: true,
      command: result.rows[0],
      message: 'Command created. ESP32 will pick it up within 30 seconds.'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
