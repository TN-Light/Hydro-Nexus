import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

/**
 * POST /api/devices/[deviceId]/commands/ack
 * ESP32 calls this endpoint to acknowledge that a command has been executed.
 *
 * Body:
 * {
 *   "commandId": "uuid",
 *   "status": "executed" | "failed",
 *   "result": { ... }  // optional execution details
 * }
 *
 * Headers:
 *   x-api-key: device API key for authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 60, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const apiKey = request.headers.get('x-api-key')
    const { deviceId } = await params

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }

    // Validate API key
    let deviceInfo: any
    try {
      const keyResult = await db.query(
        `SELECT ak.*, d.device_id
         FROM api_keys ak
         JOIN devices d ON ak.device_id = d.device_id
         WHERE ak.api_key = $1 AND ak.is_active = true
           AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
        [apiKey],
      )
      deviceInfo = keyResult.rows[0]
    } catch {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
    }

    if (!deviceInfo || deviceInfo.device_id !== deviceId) {
      return NextResponse.json({ error: 'Invalid API key or device mismatch' }, { status: 401 })
    }

    const body = await request.json()
    const { commandId, status, result } = body

    if (!commandId) {
      return NextResponse.json({ error: 'commandId is required' }, { status: 400 })
    }

    if (!status || !['executed', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'status must be "executed" or "failed"' }, { status: 400 })
    }

    // Update command status in database
    try {
      // First try simple update without updated_at (column may not exist)
      const updateResult = await db.query(
        `UPDATE device_commands
         SET status = $2,
             executed_at = NOW()
         WHERE command_id = $1 AND device_id = $3
         RETURNING command_id, action, status, executed_at`,
        [commandId, status, deviceId],
      )

      if (updateResult.rowCount === 0) {
        // Try adding executed_at column if it doesn't exist, then retry
        try {
          await db.query(`ALTER TABLE device_commands ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ`)

          const retryResult = await db.query(
            `UPDATE device_commands
             SET status = $2, executed_at = NOW()
             WHERE command_id = $1 AND device_id = $3
             RETURNING command_id, action, status, executed_at`,
            [commandId, status, deviceId],
          )

          if (retryResult.rowCount === 0) {
            return NextResponse.json({ error: 'Command not found' }, { status: 404 })
          }

          return NextResponse.json({
            success: true,
            message: `Command ${status}`,
            command: retryResult.rows[0],
          })
        } catch {
          return NextResponse.json({ error: 'Command not found or table schema issue' }, { status: 404 })
        }
      }

      // Update device last_seen timestamp
      try {
        await db.query(
          `UPDATE devices SET last_seen = NOW() WHERE device_id = $1`,
          [deviceId],
        )
      } catch {
        // Non-critical — last_seen column may not exist
      }

      return NextResponse.json({
        success: true,
        message: `Command ${status}`,
        command: updateResult.rows[0],
      })
    } catch (error: any) {
      console.error('Command ack DB error:', error)
      return NextResponse.json({ error: 'Failed to acknowledge command', details: error.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Command ack error:', error)
    return NextResponse.json({ error: 'Acknowledgment failed', details: error.message }, { status: 500 })
  }
}
