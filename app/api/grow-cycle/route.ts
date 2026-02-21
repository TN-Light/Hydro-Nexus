import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import jwt from "jsonwebtoken"

function getUserId(req: NextRequest): string | null {
  try {
    const token =
      req.cookies.get("qbm-hydronet-token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return null
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error("JWT_SECRET not set")
    const payload = jwt.verify(token, secret) as { userId: string }
    return payload.userId
  } catch {
    return null
  }
}

// GET /api/grow-cycle?deviceId=grow-bag-1
export async function GET(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const deviceId = req.nextUrl.searchParams.get("deviceId")
  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 })

  try {
    const result = await db.query(
      `SELECT accumulated_gdd, paw_applications, phosphorus_ppm,
              harvest_date, notes, cycle_start_date, updated_at
       FROM grow_cycle_log
       WHERE device_id = $1 AND user_id = $2`,
      [deviceId, userId]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({
        accumulated_gdd: 0,
        paw_applications: 0,
        phosphorus_ppm: null,
        harvest_date: null,
        notes: "",
        cycle_start_date: null,
      })
    }
    return NextResponse.json(result.rows[0])
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/grow-cycle
// body: { deviceId, accumulated_gdd?, paw_applications?, phosphorus_ppm?, harvest_date?, notes? }
export async function POST(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { deviceId, accumulated_gdd, paw_applications, phosphorus_ppm, harvest_date, notes } = body

  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 })

  try {
    await db.query(
      `INSERT INTO grow_cycle_log
         (device_id, user_id, accumulated_gdd, paw_applications, phosphorus_ppm, harvest_date, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (device_id, user_id) DO UPDATE SET
         accumulated_gdd  = COALESCE(EXCLUDED.accumulated_gdd,  grow_cycle_log.accumulated_gdd),
         paw_applications = COALESCE(EXCLUDED.paw_applications, grow_cycle_log.paw_applications),
         phosphorus_ppm   = COALESCE(EXCLUDED.phosphorus_ppm,   grow_cycle_log.phosphorus_ppm),
         harvest_date     = COALESCE(EXCLUDED.harvest_date,     grow_cycle_log.harvest_date),
         notes            = COALESCE(EXCLUDED.notes,            grow_cycle_log.notes),
         updated_at       = NOW()`,
      [
        deviceId,
        userId,
        accumulated_gdd ?? null,
        paw_applications ?? null,
        phosphorus_ppm ?? null,
        harvest_date ?? null,
        notes ?? null,
      ]
    )
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

