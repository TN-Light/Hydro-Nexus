"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Database, Settings } from 'lucide-react'

interface ConnectionStatus {
  connected: boolean
  message: string
  timestamp?: string
}

interface TableCount {
  table_name: string
  row_count: number
}

interface EnvStatus {
  database_url: boolean
  jwt_secret: boolean
}

export default function DatabaseTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false, message: 'Not tested' })
  const [tableCounts, setTableCounts] = useState<TableCount[]>([])
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-db')
      const data = await response.json()
      
      setConnectionStatus({
        connected: response.ok,
        message: data.message || data.error,
        timestamp: new Date().toLocaleTimeString()
      })

      if (response.ok && data.tableCounts) {
        setTableCounts(data.tableCounts)
      }

      // Get environment status from the API response
      if (data.envStatus) {
        setEnvStatus(data.envStatus)
      }
    } catch (error) {
      setConnectionStatus({
        connected: false,
        message: 'Failed to connect to API',
        timestamp: new Date().toLocaleTimeString()
      })
    } finally {
      setLoading(false)
    }
  }

  const testAuth = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      })
      
      const data = await response.json()
      alert(response.ok ? 'Auth test successful!' : `Auth test failed: ${data.error}`)
    } catch (error) {
      alert('Auth API not available')
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Database Connection Test</h1>
          <p className="text-muted-foreground">
            Test your PostgreSQL database connection and API endpoints
          </p>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {connectionStatus.connected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                Status: {connectionStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
              {connectionStatus.timestamp && (
                <Badge variant="outline">{connectionStatus.timestamp}</Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {connectionStatus.message}
            </p>

            <div className="flex gap-2">
              <Button onClick={testConnection} disabled={loading}>
                {loading ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button variant="outline" onClick={testAuth}>
                Test Authentication
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table Counts */}
        {tableCounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Database Tables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {tableCounts.map((table) => (
                  <div key={table.table_name} className="flex justify-between items-center p-3 border rounded">
                    <span className="font-medium">{table.table_name}</span>
                    <Badge variant="secondary">{table.row_count} rows</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Environment Status */}
        {envStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">DATABASE_URL: </span>
                  <span className="text-muted-foreground">
                    {envStatus.database_url ? '✅ Set' : '❌ Not set'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">JWT_SECRET: </span>
                  <span className="text-muted-foreground">
                    {envStatus.jwt_secret ? '✅ Set' : '❌ Not set'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Database Setup</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Install PostgreSQL</li>
                <li>• Create database: <code className="bg-muted px-1 rounded">hydro_nexus</code></li>
                <li>• Run the schema-updated.sql file</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">2. Environment Configuration</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Update <code className="bg-muted px-1 rounded">.env.local</code></li>
                <li>• Set your DATABASE_URL</li>
                <li>• Configure JWT_SECRET</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">3. Test Connection</h4>
              <p className="text-sm text-muted-foreground ml-4">
                Click "Test Connection" above to verify everything is working.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}