import { NextRequest } from 'next/server'
import { dbHelpers } from '@/lib/database'

/**
 * GET /api/sensors/stream
 * Server-Sent Events (SSE) endpoint for real-time sensor data push.
 * Replaces HTTP polling — the server pushes new readings every 5 seconds.
 * 
 * Client usage:
 *   const es = new EventSource('/api/sensors/stream')
 *   es.onmessage = (e) => { const data = JSON.parse(e.data); ... }
 *   es.onerror = () => { ... reconnect logic ... }
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() })}\n\n`)
      )

      const sendSensorData = async () => {
        if (closed) return

        try {
          const readings = await dbHelpers.getLatestSensorReadings()

          // Build room + bags structure (same as /api/sensors/latest)
          const roomSensors: any = {}
          const bagData: Record<string, any> = {}

          readings.forEach((reading: any) => {
            const roomId = reading.room_id || 'main-room'

            if (!roomSensors[roomId]) {
              roomSensors[roomId] = {
                roomId,
                roomTemp: Number(reading.room_temp),
                humidity: Number(reading.humidity),
                pH: Number(reading.ph),
                ec: Number(reading.ec),
                waterLevel: reading.water_level_status || 'Adequate',
                timestamp: reading.room_timestamp || reading.timestamp,
              }
            }

            bagData[reading.device_id] = {
              deviceId: reading.device_id,
              moisture: Number(reading.substrate_moisture),
              moistureTimestamp: reading.moisture_timestamp || reading.timestamp,
              roomId,
            }
          })

          // Freshness check — use the MOST RECENT timestamp from ANY source
          const STALE_MS = 2 * 60 * 1000 // 2 minutes
          const allTimestamps: number[] = []
          if (roomSensors['main-room']?.timestamp) {
            allTimestamps.push(new Date(roomSensors['main-room'].timestamp).getTime())
          }
          Object.values(bagData).forEach((bag: any) => {
            if (bag?.moistureTimestamp) {
              allTimestamps.push(new Date(bag.moistureTimestamp).getTime())
            }
          })
          const latestTsMs = allTimestamps.length > 0 ? Math.max(...allTimestamps) : 0
          const dataAgeMs = latestTsMs > 0 ? Date.now() - latestTsMs : Infinity
          const isDataFresh = dataAgeMs < STALE_MS

          // If room data is stale but bag data is fresh, pull room data from sensor_readings
          if (isDataFresh && roomSensors['main-room']) {
            const roomTs = new Date(roomSensors['main-room'].timestamp).getTime()
            if (Date.now() - roomTs > STALE_MS) {
              try {
                const freshRoom = await dbHelpers.getLatestRoomFromSensorReadings()
                if (freshRoom) {
                  roomSensors['main-room'] = {
                    ...roomSensors['main-room'],
                    roomTemp: Number(freshRoom.room_temp),
                    humidity: Number(freshRoom.humidity),
                    pH: Number(freshRoom.ph),
                    ec: Number(freshRoom.ec),
                    waterLevel: freshRoom.water_level_status || 'Adequate',
                    timestamp: freshRoom.timestamp,
                  }
                }
              } catch {
                // Use what we have
              }
            }
          }

          const payload = {
            success: true,
            room: roomSensors['main-room'] || null,
            bags: bagData,
            timestamp: new Date().toISOString(),
            count: Object.keys(bagData).length,
            isDataFresh,
            dataAgeSeconds: Math.round(dataAgeMs / 1000),
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          )
        } catch (err) {
          // Send error event but keep connection alive
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Failed to fetch sensor data' })}\n\n`)
          )
        }
      }

      // Send data immediately on connect
      await sendSensorData()

      // Then push every 5 seconds
      const interval = setInterval(sendSensorData, 5000)

      // Keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`))
        } catch {
          // Stream closed
        }
      }, 30000)

      // Cleanup when client disconnects
      request.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(interval)
        clearInterval(keepAlive)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}

// Disable body parsing and set max duration for streaming
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
