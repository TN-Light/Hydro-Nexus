"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Leaf, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import Link from "next/link"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const success = await login(username, password)
      if (success) {
        router.push("/dashboard")
      } else {
        setError("Invalid username or password")
      }
    } catch (err) {
      setError("An error occurred during login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4">
            <Leaf className="h-6 w-6 sm:h-8 sm:w-8 text-green-700" />
            <span className="text-xl sm:text-2xl font-bold text-soil-950 dark:text-white">Hydro Nexus</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-soil-950 dark:text-white">Welcome Back</h1>
          <p className="text-soil-950/70 mt-2 text-sm sm:text-base dark:text-gray-300">
            Sign in to your precision agriculture dashboard
          </p>
        </div>

        <Card className="border-green-100 dark:border-gray-800">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl dark:text-white">Sign In</CardTitle>
            <CardDescription className="text-sm sm:text-base dark:text-gray-300">
              Enter your credentials to access the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm sm:text-base dark:text-gray-300">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  className="border-green-200 focus:border-green-500 text-sm sm:text-base dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm sm:text-base dark:text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="border-green-200 focus:border-green-500 pr-10 text-sm sm:text-base dark:bg-gray-800 dark:text-white"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full agriculture-gradient text-white hover:opacity-90 text-sm sm:text-base py-2 sm:py-3"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 p-3 sm:p-4 bg-green-50 rounded-lg dark:bg-gray-800">
              <p className="text-sm font-medium text-green-800 mb-2 dark:text-green-400">Demo Credentials:</p>
              <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                Username: <code className="bg-green-100 px-1 rounded text-xs dark:bg-gray-700">admin</code>
              </p>
              <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                Password: <code className="bg-green-100 px-1 rounded text-xs dark:bg-gray-700">hydro123</code>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-4 sm:mt-6">
          <Link
            href="/"
            className="text-green-700 hover:text-green-800 text-sm transition-colors dark:text-green-400 dark:hover:text-green-300"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
