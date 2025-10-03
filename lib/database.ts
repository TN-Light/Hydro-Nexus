import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create a connection pool
const pool = new Pool({
  connectionString,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // return error after 2 seconds if connection could not be established
})

// Database connection wrapper
export const db = {
  // Execute a query with parameters
  async query(text: string, params?: any[]) {
    const start = Date.now()
    try {
      const res = await pool.query(text, params)
      const duration = Date.now() - start
      console.log('Executed query', { text, duration, rows: res.rowCount })
      return res
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    }
  },

  // Get a client from the pool for transactions
  async getClient() {
    return await pool.connect()
  },

  // Close the pool
  async end() {
    await pool.end()
  }
}

// Helper functions for common operations
export const dbHelpers = {
  // User operations
  async findUserByUsername(username: string) {
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    )
    return result.rows[0] || null
  },

  async findUserByEmail(email: string) {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    )
    return result.rows[0] || null
  },

  async findUserById(userId: string) {
    const result = await db.query(
      'SELECT * FROM users WHERE user_id = $1 AND is_active = true',
      [userId]
    )
    return result.rows[0] || null
  },

  async createUser(userData: {
    username: string
    email: string
    password_hash: string
    full_name?: string
    first_name?: string
    last_name?: string
    role?: string
  }) {
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, username, email, full_name, role, created_at`,
      [
        userData.username,
        userData.email,
        userData.password_hash,
        userData.full_name,
        userData.first_name,
        userData.last_name,
        userData.role || 'user'
      ]
    )
    return result.rows[0]
  },

  async updateUserProfile(userId: string, updates: {
    first_name?: string
    last_name?: string
    full_name?: string
    avatar_url?: string
  }) {
    const setParts = []
    const values = []
    let paramIndex = 1

    if (updates.first_name !== undefined) {
      setParts.push(`first_name = $${paramIndex}`)
      values.push(updates.first_name)
      paramIndex++
    }

    if (updates.last_name !== undefined) {
      setParts.push(`last_name = $${paramIndex}`)
      values.push(updates.last_name)
      paramIndex++
    }

    if (updates.full_name !== undefined) {
      setParts.push(`full_name = $${paramIndex}`)
      values.push(updates.full_name)
      paramIndex++
    }

    if (updates.avatar_url !== undefined) {
      setParts.push(`avatar_url = $${paramIndex}`)
      values.push(updates.avatar_url)
      paramIndex++
    }

    if (setParts.length === 0) {
      throw new Error('No fields to update')
    }

    // Add updated_at
    setParts.push(`updated_at = CURRENT_TIMESTAMP`)

    // Add user_id as the last parameter
    values.push(userId)

    const query = `
      UPDATE users 
      SET ${setParts.join(', ')}
      WHERE user_id = $${paramIndex} AND is_active = true
      RETURNING user_id, username, email, first_name, last_name, full_name, avatar_url, role, updated_at
    `

    const result = await db.query(query, values)
    return result.rows[0]
  },

  // Device operations
  async getDevices(userId?: string) {
    const query = userId 
      ? 'SELECT * FROM devices WHERE user_id = $1 ORDER BY created_at'
      : 'SELECT * FROM devices ORDER BY created_at'
    const params = userId ? [userId] : []
    
    const result = await db.query(query, params)
    return result.rows
  },

  async getDeviceSettings(deviceId: string) {
    const result = await db.query(
      'SELECT * FROM device_settings WHERE device_id = $1',
      [deviceId]
    )
    return result.rows[0] || null
  },

  // Sensor data operations (TimescaleDB optimized)
  async insertSensorReading(data: {
    device_id: string;
    room_temp: number;
    ph: number;
    ec: number;
    substrate_moisture: number;
    water_level_status: string;
    humidity: number;
  }) {
    const result = await db.query(
      'SELECT insert_sensor_reading($1, $2, $3, $4, $5, $6, $7)',
      [
        data.device_id,
        data.room_temp,
        data.ph,
        data.ec,
        data.substrate_moisture,
        data.water_level_status,
        data.humidity
      ]
    )
    return result.rows[0].insert_sensor_reading
  },

  async getLatestSensorReadings(deviceIds?: string[]) {
    const result = await db.query(
      'SELECT * FROM get_latest_sensor_readings($1)',
      [deviceIds]
    )
    return result.rows
  },

  // Alert operations
  async getActiveAlerts(deviceId?: string) {
    const query = deviceId
      ? 'SELECT * FROM active_alerts WHERE device_id = $1'
      : 'SELECT * FROM active_alerts'
    
    const params = deviceId ? [deviceId] : []
    const result = await db.query(query, params)
    return result.rows
  },

  async acknowledgeAlert(alertId: string, userId: string) {
    const result = await db.query(
      'SELECT acknowledge_alert($1, $2)',
      [alertId, userId]
    )
    return result.rows[0]
  },

  // User settings operations
  async getUserSettings(userId: string) {
    const result = await db.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    )
    return result.rows[0] || null
  },

  async updateUserSettings(userId: string, settings: any) {
    const result = await db.query(
      `INSERT INTO user_settings (user_id, theme, notification_preferences, measurement_units, dashboard_default_range)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         theme = EXCLUDED.theme,
         notification_preferences = EXCLUDED.notification_preferences,
         measurement_units = EXCLUDED.measurement_units,
         dashboard_default_range = EXCLUDED.dashboard_default_range,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        userId,
        settings.theme,
        JSON.stringify(settings.notification_preferences),
        JSON.stringify(settings.measurement_units),
        settings.dashboard_default_range
      ]
    )
    return result.rows[0]
  },

  // TimescaleDB sensor data operations
  async validateApiKey(apiKey: string) {
    const result = await db.query(
      'SELECT ak.*, d.device_id FROM api_keys ak JOIN devices d ON ak.device_id = d.device_id WHERE ak.api_key = $1 AND ak.is_active = true AND (ak.expires_at IS NULL OR ak.expires_at > NOW())',
      [apiKey]
    )
    
    if (result.rows.length > 0) {
      // Update last used timestamp
      await db.query(
        'UPDATE api_keys SET last_used = NOW() WHERE api_key = $1',
        [apiKey]
      )
      return result.rows[0]
    }
    
    return null
  },

  async getSensorReadingsRange(
    deviceIds: string[],
    startTime: string,
    endTime: string,
    intervalMinutes: number = 60
  ) {
    const result = await db.query(
      'SELECT * FROM get_sensor_readings_range($1, $2, $3, $4)',
      [deviceIds, startTime, endTime, intervalMinutes]
    )
    return result.rows
  },

  async getHourlyAggregates(deviceIds: string[], startTime: string, endTime: string) {
    const result = await db.query(
      `SELECT device_id, hour as timestamp, avg_temp as room_temp, avg_ph as ph, 
              avg_ec as ec, avg_moisture as substrate_moisture, avg_humidity as humidity,
              reading_count
       FROM sensor_readings_hourly 
       WHERE device_id = ANY($1) AND hour >= $2 AND hour <= $3
       ORDER BY device_id, hour`,
      [deviceIds, startTime, endTime]
    )
    return result.rows
  },

  async getDailyAggregates(deviceIds: string[], startTime: string, endTime: string) {
    const result = await db.query(
      `SELECT device_id, day as timestamp, avg_temp as room_temp, avg_ph as ph,
              avg_ec as ec, avg_moisture as substrate_moisture, avg_humidity as humidity,
              reading_count
       FROM sensor_readings_daily 
       WHERE device_id = ANY($1) AND day >= $2 AND day <= $3
       ORDER BY device_id, day`,
      [deviceIds, startTime, endTime]
    )
    return result.rows
  },

  // Device command operations for ESP32 remote control
  async createDeviceCommand(command: {
    device_id: string;
    action: string;
    parameters?: any;
    priority?: string;
    expires_at?: string;
  }) {
    const result = await db.query(
      `INSERT INTO device_commands (device_id, action, parameters, priority, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING command_id`,
      [
        command.device_id,
        command.action,
        JSON.stringify(command.parameters || {}),
        command.priority || 'normal',
        command.expires_at || new Date(Date.now() + 300000).toISOString()
      ]
    )
    return result.rows[0].command_id
  },

  async getPendingCommands(deviceId: string) {
    const result = await db.query(
      `SELECT * FROM device_commands 
       WHERE device_id = $1 AND status = 'pending' AND expires_at > NOW()
       ORDER BY priority DESC, created_at ASC`,
      [deviceId]
    )
    return result.rows
  },

  async markCommandsAsSent(commandIds: string[]) {
    if (commandIds.length === 0) return
    
    const result = await db.query(
      `UPDATE device_commands 
       SET status = 'sent', sent_at = NOW()
       WHERE command_id = ANY($1)`,
      [commandIds]
    )
    return result.rowCount
  },

  async getDeviceById(deviceId: string) {
    const result = await db.query(
      'SELECT * FROM devices WHERE device_id = $1',
      [deviceId]
    )
    return result.rows[0] || null
  },

  // User preferences operations
  async getUserPreferences(userId: string) {
    const result = await db.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    )
    return result.rows[0] || null
  },

  async updateUserPreferences(userId: string, preferences: {
    theme?: string
    notification_preferences?: object
    measurement_units?: object
    dashboard_default_range?: string
    dashboard_layout?: object
  }) {
    // First check if user settings exist
    const existing = await this.getUserPreferences(userId)
    
    if (existing) {
      // Update existing preferences
      const setParts = []
      const values = []
      let paramIndex = 1

      if (preferences.theme !== undefined) {
        setParts.push(`theme = $${paramIndex}`)
        values.push(preferences.theme)
        paramIndex++
      }

      if (preferences.notification_preferences !== undefined) {
        setParts.push(`notification_preferences = $${paramIndex}`)
        values.push(JSON.stringify(preferences.notification_preferences))
        paramIndex++
      }

      if (preferences.measurement_units !== undefined) {
        setParts.push(`measurement_units = $${paramIndex}`)
        values.push(JSON.stringify(preferences.measurement_units))
        paramIndex++
      }

      if (preferences.dashboard_default_range !== undefined) {
        setParts.push(`dashboard_default_range = $${paramIndex}`)
        values.push(preferences.dashboard_default_range)
        paramIndex++
      }

      if (preferences.dashboard_layout !== undefined) {
        setParts.push(`dashboard_layout = $${paramIndex}`)
        values.push(JSON.stringify(preferences.dashboard_layout))
        paramIndex++
      }

      if (setParts.length === 0) {
        return existing
      }

      // Add updated_at
      setParts.push(`updated_at = CURRENT_TIMESTAMP`)
      
      // Add user_id as the last parameter
      values.push(userId)

      const query = `
        UPDATE user_settings 
        SET ${setParts.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING *
      `

      const result = await db.query(query, values)
      return result.rows[0]
    } else {
      // Create new preferences
      const result = await db.query(
        `INSERT INTO user_settings (
          user_id, theme, notification_preferences, measurement_units, 
          dashboard_default_range, dashboard_layout
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          userId,
          preferences.theme || 'light',
          JSON.stringify(preferences.notification_preferences || {
            masterEnabled: true,
            rules: {
              ph_critical: ['in_app', 'push'],
              ec_range: ['in_app'],
              do_low: ['in_app', 'push', 'email'],
              orp_low: ['in_app'],
              high_humidity: ['in_app', 'push'],
              device_offline: ['in_app', 'push', 'email']
            }
          }),
          JSON.stringify(preferences.measurement_units || {
            temperature: 'C',
            concentration: 'ppm'
          }),
          preferences.dashboard_default_range || '24h',
          JSON.stringify(preferences.dashboard_layout || {})
        ]
      )
      return result.rows[0]
    }
  }
}

// Test database connection
export async function testConnection() {
  try {
    const result = await db.query('SELECT NOW() as current_time')
    console.log('✅ Database connected successfully:', result.rows[0].current_time)
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}