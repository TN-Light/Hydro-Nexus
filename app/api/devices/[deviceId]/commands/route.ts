import { NextRequest, NextResponse } from 'next/server'
import { dbHelpers } from '@/lib/database'
import { requireOperator } from '@/lib/auth-roles'

// GET device commands (for ESP32 to poll)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const apiKey = request.headers.get('x-api-key')
    const { deviceId } = await params
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      )
    }

    // Validate API key
    const deviceInfo = await dbHelpers.validateApiKey(apiKey)
    if (!deviceInfo || deviceInfo.device_id !== deviceId) {
      return NextResponse.json(
        { error: 'Invalid API key or device mismatch' },
        { status: 401 }
      )
    }

    // Get pending commands for this device
    const commands = await dbHelpers.getPendingCommands(deviceId)

    // Mark commands as sent
    if (commands.length > 0) {
      await dbHelpers.markCommandsAsSent(commands.map(cmd => cmd.command_id))
    }

    return NextResponse.json({
      success: true,
      device_id: deviceId,
      commands: commands,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(`Error getting commands for device:`, error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get device commands',
        message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// POST new command for device (from dashboard) — requires operator or admin role
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  // Role check: only operators and admins can send device commands
  const auth = requireOperator(request)
  if (auth.error) return auth.error

  try {
    const { deviceId } = await params
    const commandData = await request.json()
    
    // Validate command data
    if (!commandData.action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    // Validate device exists
    const device = await dbHelpers.getDeviceById(deviceId)
    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      )
    }

    // Create command
    const command = {
      device_id: deviceId,
      action: commandData.action,
      parameters: commandData.parameters || {},
      priority: commandData.priority || 'normal',
      expires_at: commandData.expires_at || new Date(Date.now() + 300000).toISOString() // 5 minutes default
    }

    const commandId = await dbHelpers.createDeviceCommand(command)

    console.log(`Command created for device ${deviceId}:`, {
      command_id: commandId,
      action: command.action,
      parameters: command.parameters
    })

    return NextResponse.json({
      success: true,
      command_id: commandId,
      device_id: deviceId,
      action: command.action,
      message: 'Command queued successfully'
    })

  } catch (error) {
    console.error(`Error creating command for device:`, error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create device command',
        message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}