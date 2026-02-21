import { NextResponse } from 'next/server'
import { testConnection, db } from '@/lib/database'

export async function GET() {
  try {
    // Test basic connection
    const isConnected = await testConnection()
    
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // Get table counts
    const tableCountsQuery = `
      SELECT 
        'users' as table_name, COUNT(*) as row_count FROM users
      UNION ALL
      SELECT 'crop_types', COUNT(*) FROM crop_types
      UNION ALL  
      SELECT 'devices', COUNT(*) FROM devices
      UNION ALL
      SELECT 'device_settings', COUNT(*) FROM device_settings
      UNION ALL
      SELECT 'user_settings', COUNT(*) FROM user_settings
      UNION ALL
      SELECT 'alerts', COUNT(*) FROM alerts
      UNION ALL
      SELECT 'sensor_readings', COUNT(*) FROM sensor_readings
      UNION ALL
      SELECT 'daily_stats', COUNT(*) FROM daily_stats
      ORDER BY table_name;
    `

    const result = await db.query(tableCountsQuery)
    
    return NextResponse.json({
      message: 'Database connection successful',
      connected: true,
      tableCounts: result.rows,
      envStatus: {
        database_url: !!process.env.DATABASE_URL,
        jwt_secret: !!process.env.JWT_SECRET
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        details: error.message,
        connected: false
      },
      { status: 500 }
    )
  }
}
