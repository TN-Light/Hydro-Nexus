/**
 * Script to create/update an admin user in the database.
 *
 * Run:
 *   node create-admin-user.cjs
 */

const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

function loadEnvLocal() {
  // Prefer already-set env vars.
  if (process.env.DATABASE_URL) return

  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvLocal()

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set (expected in .env.local)')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 5,
  connectionTimeoutMillis: 5000,
})

async function upsertAdminUser() {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'Abhi'
  const email = 'admin@hydro-nexus.com'

  console.log('🔄 Connecting to database...')

  const passwordHash = await bcrypt.hash(password, 10)
  const existing = await pool.query('SELECT user_id FROM users WHERE username = $1', [username])

  if (existing.rows.length > 0) {
    console.log('⚠️  Admin exists. Updating password + activating...')
    const updated = await pool.query(
      `UPDATE users
       SET password_hash = $1,
           email = $2,
           role = 'admin',
           is_active = true,
           updated_at = NOW()
       WHERE username = $3
       RETURNING user_id, username, email, role`,
      [passwordHash, email, username]
    )
    console.log('✅ Admin updated:', updated.rows[0])
  } else {
    console.log('🔄 Creating admin user...')
    const inserted = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING user_id, username, email, role`,
      [username, email, passwordHash, 'System Administrator', 'System', 'Administrator', 'admin', true]
    )
    console.log('✅ Admin created:', inserted.rows[0])
  }

  console.log('\n🎉 Login credentials:')
  console.log(`   Username: ${username}`)
  console.log(`   Password: ${password}`)
  console.log('\nℹ️  Note: This is the app login password (users table), not the Postgres password in DATABASE_URL.')
}

upsertAdminUser()
  .catch((err) => {
    console.error('❌ Error:', err?.message || err)
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end().catch(() => {})
  })
