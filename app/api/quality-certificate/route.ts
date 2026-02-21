import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET!

function verifyToken(token: string): { userId: number } {
  return jwt.verify(token, JWT_SECRET) as { userId: number }
}

/**
 * GET /api/quality-certificate?deviceId=grow-bag-1
 * Generate a QBM-HydroNet Quality Certificate for a specific grow bag.
 *
 * The certificate is derived from:
 *  - Latest sensor readings (pH, EC, temp, humidity, moisture)
 *  - Accumulated GDD (from gdd_log table)
 *  - PAW applications count (from paw_applications table)
 *  - Phosphorus compliance days (from manual_measurements table)
 *  - Crop assignment (from devices table / crop_types)
 */
export async function GET(req: NextRequest) {
  // Auth check
  const token =
    req.cookies.get("qbm-hydronet-token")?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "")

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let userId: number
  try {
    const decoded = verifyToken(token) as { userId: number }
    userId = decoded.userId
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const deviceId = req.nextUrl.searchParams.get("deviceId")
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 })
  }

  try {
    // 1. Latest sensor reading
    const sensorRes = await db.query(
      `SELECT * FROM sensor_readings
       WHERE device_id = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [deviceId]
    )
    const sensor = sensorRes.rows[0] || null

    // 2. Crop assignment
    const cropRes = await db.query(
      `SELECT d.crop_id, d.planting_date, d.accumulated_gdd, d.bioactive_index,
              c.name AS crop_name, c.bioactive_compound, c.target_bioactive_concentration
       FROM devices d
       LEFT JOIN crop_types c ON d.crop_id = c.crop_id
       WHERE d.device_id = $1
       LIMIT 1`,
      [deviceId]
    )
    const cropRow = cropRes.rows[0] || null

    // 3. GDD accumulated
    const gddRes = await db.query(
      `SELECT COALESCE(SUM(daily_gdd), 0) AS total_gdd,
              COUNT(*)::int AS days_logged
       FROM gdd_log
       WHERE device_id = $1`,
      [deviceId]
    )
    const gddData = gddRes.rows[0] || { total_gdd: 0, days_logged: 0 }

    // 4. PAW applications
    const pawRes = await db.query(
      `SELECT COUNT(*)::int AS total_applications,
              AVG(h2o2_concentration_um) AS avg_h2o2_um
       FROM paw_applications
       WHERE device_id = $1`,
      [deviceId]
    )
    const pawData = pawRes.rows[0] || { total_applications: 0, avg_h2o2_um: null }

    // 5. Phosphorus compliance (days within 40-60 ppm)
    const pRes = await db.query(
      `SELECT COUNT(*)::int AS compliant_days,
              AVG(phosphorus_ppm) AS avg_phosphorus_ppm
       FROM manual_measurements
       WHERE device_id = $1
         AND phosphorus_ppm BETWEEN 40 AND 60`,
      [deviceId]
    )

    const pTotal = await db.query(
      `SELECT COUNT(*)::int AS total_p_days
       FROM manual_measurements
       WHERE device_id = $1 AND phosphorus_ppm IS NOT NULL`,
      [deviceId]
    )
    const pData = pRes.rows[0] || { compliant_days: 0, avg_phosphorus_ppm: null }
    const pTotalDays = pTotal.rows[0]?.total_p_days ?? 0

    // 6. Existing certificate (most recent)
    let existingCert = null
    try {
      const certRes = await db.query(
        `SELECT * FROM quality_certificates
         WHERE device_id = $1
         ORDER BY issued_at DESC
         LIMIT 1`,
        [deviceId]
      )
      existingCert = certRes.rows[0] || null
    } catch {
      // Table may not exist yet — graceful fallback
    }

    // Calculated scores
    const gddProgress = cropRow?.accumulated_gdd
      ? Math.min(100, Math.round((cropRow.accumulated_gdd / 2200) * 100))
      : Math.min(100, Math.round((parseFloat(gddData.total_gdd) / 2200) * 100))

    const pawScore =
      pawData.total_applications > 0
        ? Math.min(100, Math.round((pawData.total_applications / 8) * 100))
        : 0

    const pCompliance =
      pTotalDays > 0
        ? Math.round((pData.compliant_days / pTotalDays) * 100)
        : 0

    const bioactiveIndex = Math.round(gddProgress * 0.4 + pawScore * 0.35 + pCompliance * 0.25)

    const certificate = {
      certificateId: `QBM-${deviceId.toUpperCase().replace(/-/g, "")}-${Date.now()}`,
      issuedAt: new Date().toISOString(),
      deviceId,
      cropName: cropRow?.crop_name ?? "Unknown",
      bioactiveCompound: cropRow?.bioactive_compound ?? "Unknown",
      targetConcentration: cropRow?.target_bioactive_concentration ?? "—",
      plantingDate: cropRow?.planting_date ?? null,
      // GDD
      accumulatedGDD: parseFloat((cropRow?.accumulated_gdd ?? gddData.total_gdd) || 0),
      gddProgress,
      // PAW
      pawApplicationsTotal: pawData.total_applications,
      pawAvgH2O2Um: pawData.avg_h2o2_um ? parseFloat(pawData.avg_h2o2_um).toFixed(1) : null,
      // Phosphorus
      phosphorusCompliantDays: pData.compliant_days,
      phosphorusTotalDays: pTotalDays,
      phosphorusCompliancePercent: pCompliance,
      avgPhosphorusPpm: pData.avg_phosphorus_ppm ? parseFloat(pData.avg_phosphorus_ppm).toFixed(1) : null,
      // Scores
      bioactiveIndex,
      grade:
        bioactiveIndex >= 85 ? "A — Pharmaceutical Grade"
        : bioactiveIndex >= 65 ? "B — Premium Grade"
        : bioactiveIndex >= 40 ? "C — Commercial Grade"
        : "D — Sub-optimal",
      // Latest sensor snapshot
      latestSensor: sensor
        ? {
            pH: sensor.ph,
            ec: sensor.ec,
            temperature: sensor.room_temp,
            humidity: sensor.humidity,
            moisture: sensor.moisture,
            timestamp: sensor.timestamp,
          }
        : null,
      // Previous certificate summary
      previousCertificate: existingCert
        ? {
            certificateId: existingCert.certificate_id,
            issuedAt: existingCert.issued_at,
            grade: existingCert.grade,
          }
        : null,
    }

    return NextResponse.json({ success: true, certificate })
  } catch (error) {
    console.error("Quality certificate error:", error)
    return NextResponse.json(
      { error: "Failed to generate quality certificate", detail: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/quality-certificate
 * Save a Quality Certificate to the database.
 */
export async function POST(req: NextRequest) {
  const token =
    req.cookies.get("qbm-hydronet-token")?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "")

  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let userId: number
  try {
    const decoded = verifyToken(token) as { userId: number }
    userId = decoded.userId
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { deviceId, certificate } = body as { deviceId: string; certificate: any }

    await db.query(
      `INSERT INTO quality_certificates
         (certificate_id, device_id, user_id, crop_name, bioactive_compound,
          bioactive_index, grade, gdd_accumulated, paw_applications,
          phosphorus_compliance_percent, issued_at, certificate_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
       ON CONFLICT (certificate_id) DO NOTHING`,
      [
        certificate.certificateId,
        deviceId,
        userId,
        certificate.cropName,
        certificate.bioactiveCompound,
        certificate.bioactiveIndex,
        certificate.grade,
        certificate.accumulatedGDD,
        certificate.pawApplicationsTotal,
        certificate.phosphorusCompliancePercent,
        JSON.stringify(certificate),
      ]
    )

    return NextResponse.json({ success: true, certificateId: certificate.certificateId })
  } catch (error) {
    console.error("Save certificate error:", error)
    return NextResponse.json(
      { error: "Failed to save certificate", detail: String(error) },
      { status: 500 }
    )
  }
}

