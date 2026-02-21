import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, sendAlertEmail, sendDailySummaryEmail } from '@/lib/email'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'

/**
 * POST /api/notifications/email
 * Send email notifications — alert emails, test emails, or daily summaries.
 *
 * Body:
 *   { type: "alert", deviceId, parameter, value, threshold: {min,max}, severity }
 *   { type: "test", to: "user@example.com" }
 *   { type: "summary", deviceCount, avgTemp, avgPH, avgEC, alertCount, issues }
 */
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientId(request), { maxRequests: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()

    if (!body.type) {
      return NextResponse.json({ error: 'Missing "type" field (alert | test | summary)' }, { status: 400 })
    }

    switch (body.type) {
      case 'test': {
        const to = body.to || process.env.ALERT_EMAIL
        if (!to) {
          return NextResponse.json({ error: 'No recipient — set ALERT_EMAIL or provide "to" in body' }, { status: 400 })
        }
        const result = await sendEmail({
          to,
          subject: '✅ QBM-HydroNet Test Email',
          text: 'This is a test email from your QBM-HydroNet system. If you received this, email notifications are working!',
          html: `
            <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;background:#0a1a0f;color:#22c55e;border-radius:12px;text-align:center">
              <h1>🌱 QBM-HydroNet</h1>
              <p style="color:#86efac">Email notifications are working!</p>
              <p style="color:#64748b;font-size:12px">${new Date().toISOString()}</p>
            </div>
          `,
        })
        return NextResponse.json({ success: result.success, messageId: result.messageId, error: result.error })
      }

      case 'alert': {
        if (!body.deviceId || !body.parameter) {
          return NextResponse.json({ error: 'Missing deviceId or parameter' }, { status: 400 })
        }
        const result = await sendAlertEmail({
          deviceId: body.deviceId,
          parameter: body.parameter,
          value: body.value ?? 0,
          threshold: body.threshold ?? { min: 0, max: 100 },
          severity: body.severity ?? 'warning',
        })
        return NextResponse.json({ success: result.success, messageId: result.messageId, error: result.error })
      }

      case 'summary': {
        const result = await sendDailySummaryEmail({
          deviceCount: body.deviceCount ?? 0,
          avgTemp: body.avgTemp ?? 0,
          avgPH: body.avgPH ?? 0,
          avgEC: body.avgEC ?? 0,
          alertCount: body.alertCount ?? 0,
          issues: body.issues ?? [],
        })
        return NextResponse.json({ success: result.success, messageId: result.messageId, error: result.error })
      }

      default:
        return NextResponse.json({ error: `Unknown type: ${body.type}` }, { status: 400 })
    }
  } catch (err: any) {
    console.error('Email API error:', err)
    return NextResponse.json({ error: 'Failed to send email', details: err.message }, { status: 500 })
  }
}

/**
 * GET /api/notifications/email
 * Check email configuration status
 */
export async function GET() {
  const configured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  const alertRecipients = process.env.ALERT_EMAIL || null

  return NextResponse.json({
    configured,
    smtp: configured
      ? { host: process.env.SMTP_HOST, port: process.env.SMTP_PORT || 587 }
      : null,
    alertRecipients: alertRecipients ? alertRecipients.split(',').length : 0,
    hint: configured
      ? 'Email is configured. POST with {type:"test"} to verify.'
      : 'Set SMTP_HOST, SMTP_USER, SMTP_PASS, ALERT_EMAIL in .env',
  })
}
