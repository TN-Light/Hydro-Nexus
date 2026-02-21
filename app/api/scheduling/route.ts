import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

/**
 * GET /api/scheduling
 * List scheduled automation tasks for a device.
 *
 * POST /api/scheduling
 * Create, update, or delete a scheduled task (e.g., "run nutrition pump every 4 hours for 5 min").
 */

// In-memory schedule store (persists until server restart).
// For production, replace with a DB table via migration.
interface ScheduleEntry {
  id: string
  deviceId: string
  name: string
  action: string
  parameters: Record<string, any>
  cronExpression: string          // simplified cron: "every 4h", "daily 06:00"
  intervalMinutes: number | null  // alternative to cron
  durationSeconds: number
  enabled: boolean
  lastRun: string | null
  nextRun: string | null
  createdAt: string
}

let schedules: ScheduleEntry[] = []
let nextId = 1

// Try to load from DB on first request
let dbLoaded = false

async function loadFromDb() {
  if (dbLoaded) return
  dbLoaded = true
  try {
    const result = await db.query(
      `SELECT * FROM scheduled_tasks ORDER BY created_at DESC`,
    )
    if (result.rows.length > 0) {
      schedules = result.rows.map((r: any) => ({
        id: r.task_id || r.id,
        deviceId: r.device_id,
        name: r.name,
        action: r.action,
        parameters: r.parameters || {},
        cronExpression: r.cron_expression || '',
        intervalMinutes: r.interval_minutes,
        durationSeconds: r.duration_seconds || 0,
        enabled: r.enabled !== false,
        lastRun: r.last_run,
        nextRun: r.next_run,
        createdAt: r.created_at,
      }))
      nextId = schedules.length + 1
    }
  } catch {
    // Table doesn't exist — use in-memory store
  }
}

function computeNextRun(entry: ScheduleEntry): string {
  if (entry.intervalMinutes) {
    return new Date(Date.now() + entry.intervalMinutes * 60 * 1000).toISOString()
  }
  // Default: 1 hour from now
  return new Date(Date.now() + 3600 * 1000).toISOString()
}

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  await loadFromDb()

  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('deviceId')

  const filtered = deviceId
    ? schedules.filter(s => s.deviceId === deviceId)
    : schedules

  return NextResponse.json({
    success: true,
    schedules: filtered,
    count: filtered.length,
  })
}

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 15, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  await loadFromDb()

  try {
    const body = await request.json()
    const { action: reqAction } = body

    // ── Delete a schedule ───────────────────────────────────────────
    if (reqAction === 'delete') {
      const { scheduleId } = body
      schedules = schedules.filter(s => s.id !== String(scheduleId))
      try {
        await db.query(`DELETE FROM scheduled_tasks WHERE task_id = $1 OR id = $1`, [scheduleId])
      } catch { /* table may not exist */ }
      return NextResponse.json({ success: true, message: 'Schedule deleted' })
    }

    // ── Toggle enable/disable ───────────────────────────────────────
    if (reqAction === 'toggle') {
      const { scheduleId } = body
      const entry = schedules.find(s => s.id === String(scheduleId))
      if (!entry) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
      entry.enabled = !entry.enabled
      try {
        await db.query(`UPDATE scheduled_tasks SET enabled = $2 WHERE task_id = $1 OR id = $1`, [scheduleId, entry.enabled])
      } catch { /* table may not exist */ }
      return NextResponse.json({ success: true, schedule: entry })
    }

    // ── Create a new schedule ───────────────────────────────────────
    const {
      deviceId,
      name,
      command,
      parameters = {},
      intervalMinutes,
      durationSeconds = 30,
      cronExpression = '',
    } = body

    if (!deviceId || !name || !command) {
      return NextResponse.json(
        { error: 'deviceId, name, and command are required' },
        { status: 400 },
      )
    }

    const entry: ScheduleEntry = {
      id: String(nextId++),
      deviceId,
      name,
      action: command,
      parameters,
      cronExpression,
      intervalMinutes: intervalMinutes || null,
      durationSeconds,
      enabled: true,
      lastRun: null,
      nextRun: '',
      createdAt: new Date().toISOString(),
    }
    entry.nextRun = computeNextRun(entry)

    schedules.push(entry)

    // Attempt to persist in DB
    try {
      await db.query(
        `INSERT INTO scheduled_tasks (device_id, name, action, parameters, cron_expression, interval_minutes, duration_seconds, enabled, next_run)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)`,
        [
          entry.deviceId,
          entry.name,
          entry.action,
          JSON.stringify(entry.parameters),
          entry.cronExpression,
          entry.intervalMinutes,
          entry.durationSeconds,
          entry.nextRun,
        ],
      )
    } catch {
      // Table doesn't exist — stored in-memory only
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule created',
      schedule: entry,
    })
  } catch (error: any) {
    console.error('Scheduling POST error:', error)
    return NextResponse.json({ error: 'Failed to manage schedule', details: error.message }, { status: 500 })
  }
}
