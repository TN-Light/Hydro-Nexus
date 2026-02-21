/**
 * Email notification utility using nodemailer.
 *
 * Environment variables required:
 *   SMTP_HOST     — e.g. smtp.gmail.com
 *   SMTP_PORT     — e.g. 587
 *   SMTP_USER     — e.g. alerts@yourdomain.com
 *   SMTP_PASS     — app password or SMTP credential
 *   SMTP_FROM     — e.g. "QBM-HydroNet <alerts@yourdomain.com>"
 *   ALERT_EMAIL   — comma-separated recipient list
 *
 * If SMTP is not configured, functions log warnings but do NOT throw,
 * so the rest of the application still works.
 */

interface EmailOptions {
  to: string | string[]
  subject: string
  text?: string
  html?: string
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// ─── Lightweight SMTP sender (no nodemailer dependency) ───
// Uses raw fetch to an SMTP-relay API or falls back to console log.
// For full SMTP, install nodemailer and swap in the transport below.

let transporter: any = null

async function getTransporter() {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    console.warn('⚠️ SMTP not configured — email notifications disabled')
    console.warn('   Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env')
    return null
  }

  try {
    // Dynamic import so the app still builds without nodemailer installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = await (Function('return import("nodemailer")')() as Promise<any>)
    transporter = nodemailer.default?.createTransport
      ? nodemailer.default.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        })
      : nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        })
    console.log('✅ SMTP transporter created:', host)
    return transporter
  } catch {
    console.warn('⚠️ nodemailer not installed — run: pnpm add nodemailer')
    console.warn('   Email notifications will be logged to console only')
    return null
  }
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'QBM-HydroNet <noreply@hydronet.local>'
  const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to

  const transport = await getTransporter()

  if (!transport) {
    // Log email to console as fallback
    console.log('📧 [EMAIL STUB]', {
      from,
      to: recipients,
      subject: options.subject,
      body: (options.text || '').slice(0, 200),
    })
    return { success: true, messageId: `console-${Date.now()}` }
  }

  try {
    const info = await transport.sendMail({
      from,
      to: recipients,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })
    console.log('✅ Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (err: any) {
    console.error('❌ Email send failed:', err.message)
    return { success: false, error: err.message }
  }
}

// ─── Pre-built alert email templates ───

export async function sendAlertEmail(alert: {
  deviceId: string
  parameter: string
  value: number
  threshold: { min: number; max: number }
  severity: 'warning' | 'alert' | 'critical'
}): Promise<EmailResult> {
  const recipients = process.env.ALERT_EMAIL
  if (!recipients) {
    console.warn('⚠️ ALERT_EMAIL not set — skipping alert email')
    return { success: false, error: 'ALERT_EMAIL not configured' }
  }

  const severityEmoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'alert' ? '⚠️' : '📋'
  const subject = `${severityEmoji} QBM-HydroNet: ${alert.parameter} ${alert.severity} on ${alert.deviceId}`

  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#0a1a0f;color:#e2e8f0;border-radius:12px">
      <h1 style="color:#22c55e;text-align:center">🌱 QBM-HydroNet Alert</h1>
      <div style="background:#1a2e23;padding:16px;border-radius:8px;border-left:4px solid ${
        alert.severity === 'critical' ? '#ef4444' : alert.severity === 'alert' ? '#f59e0b' : '#3b82f6'
      }">
        <h2 style="margin:0 0 8px;color:${
          alert.severity === 'critical' ? '#ef4444' : alert.severity === 'alert' ? '#f59e0b' : '#3b82f6'
        }">${severityEmoji} ${alert.severity.toUpperCase()}: ${alert.parameter}</h2>
        <p style="margin:4px 0"><strong>Device:</strong> ${alert.deviceId}</p>
        <p style="margin:4px 0"><strong>Current Value:</strong> ${alert.value}</p>
        <p style="margin:4px 0"><strong>Expected Range:</strong> ${alert.threshold.min} – ${alert.threshold.max}</p>
        <p style="margin:4px 0"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p style="color:#86efac;font-size:12px;text-align:center;margin-top:16px">
        This is an automated alert from your QBM-HydroNet hydroponic monitoring system.
      </p>
    </div>
  `

  return sendEmail({
    to: recipients.split(',').map((e) => e.trim()),
    subject,
    text: `${alert.severity.toUpperCase()}: ${alert.parameter} on ${alert.deviceId}\nValue: ${alert.value}\nRange: ${alert.threshold.min}–${alert.threshold.max}\nTime: ${new Date().toISOString()}`,
    html,
  })
}

export async function sendDailySummaryEmail(summary: {
  deviceCount: number
  avgTemp: number
  avgPH: number
  avgEC: number
  alertCount: number
  issues: string[]
}): Promise<EmailResult> {
  const recipients = process.env.ALERT_EMAIL
  if (!recipients) return { success: false, error: 'ALERT_EMAIL not configured' }

  const status = summary.alertCount > 0 ? '⚠️ Issues Detected' : '✅ All Systems Normal'
  const subject = `QBM-HydroNet Daily Summary — ${status}`

  const issuesList = summary.issues.length > 0
    ? summary.issues.map((i) => `<li>${i}</li>`).join('')
    : '<li>No issues detected</li>'

  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#0a1a0f;color:#e2e8f0;border-radius:12px">
      <h1 style="color:#22c55e;text-align:center">🌱 Daily Summary</h1>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border-bottom:1px solid #2d3748">Devices Online</td><td style="padding:8px;border-bottom:1px solid #2d3748;text-align:right">${summary.deviceCount}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #2d3748">Avg Temperature</td><td style="padding:8px;border-bottom:1px solid #2d3748;text-align:right">${summary.avgTemp.toFixed(1)}°C</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #2d3748">Avg pH</td><td style="padding:8px;border-bottom:1px solid #2d3748;text-align:right">${summary.avgPH.toFixed(1)}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #2d3748">Avg EC</td><td style="padding:8px;border-bottom:1px solid #2d3748;text-align:right">${summary.avgEC.toFixed(2)} mS/cm</td></tr>
        <tr><td style="padding:8px">Alerts (24h)</td><td style="padding:8px;text-align:right;color:${summary.alertCount > 0 ? '#f59e0b' : '#22c55e'}">${summary.alertCount}</td></tr>
      </table>
      <h3 style="color:#86efac">Issues</h3>
      <ul style="color:#e2e8f0">${issuesList}</ul>
    </div>
  `

  return sendEmail({
    to: recipients.split(',').map((e) => e.trim()),
    subject,
    html,
  })
}
