"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"

interface User {
  username: string
  role: string
  lastLogin: string
  firstName?: string
  lastName?: string
  email?: string
}

interface SignupData {
  firstName: string
  lastName: string
  email: string
  username: string
  password: string
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  signup: (data: SignupData) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const clearAuthState = () => {
      localStorage.removeItem("qbm-hydronet-token")
      localStorage.removeItem("qbm-hydronet-user")
      document.cookie = "qbm-hydronet-token=; path=/; max-age=0; SameSite=Strict"
      setUser(null)
    }

    const bootstrapAuth = async () => {
      // Check for stored auth token in both localStorage and cookies
      const token = localStorage.getItem("qbm-hydronet-token")
      const userData = localStorage.getItem("qbm-hydronet-user")

      // Also check cookie for server-side middleware
      const cookieToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('qbm-hydronet-token='))
        ?.split('=')[1]

      // If we have cached user data, show it immediately.
      if ((token || cookieToken) && userData) {
        try {
          setUser(JSON.parse(userData))
        } catch {
          // ignore parse errors; we'll re-validate below
        }
      }

      // Ensure both localStorage and cookie are set (for middleware)
      if (token && !cookieToken) {
        document.cookie = `qbm-hydronet-token=${token}; path=/; max-age=${60*60*24*7}; SameSite=Strict`
      }

      // Validate token with the server so expired tokens don't keep the UI "logged in".
      const effectiveToken = token || cookieToken
      if (effectiveToken) {
        try {
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${effectiveToken}`,
            },
          })

          if (response.ok) {
            const verifiedUser = await response.json()
            const nextUserData = {
              username: verifiedUser.username,
              role: verifiedUser.role,
              lastLogin: new Date().toISOString(),
              firstName: verifiedUser.first_name,
              lastName: verifiedUser.last_name,
              email: verifiedUser.email,
            }
            localStorage.setItem("qbm-hydronet-user", JSON.stringify(nextUserData))
            if (!cancelled) setUser(nextUserData)
          } else if (response.status === 401 || response.status === 404) {
            clearAuthState()
            if (window.location.pathname !== '/login') {
              window.location.href = '/login'
            }
          }
        } catch {
          // Network/server errors: don't aggressively log out.
        }
      }

      if (!cancelled) setIsLoading(false)
    }

    bootstrapAuth()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        const userData = {
          username: data.user.username,
          role: data.user.role,
          lastLogin: new Date().toISOString(),
          firstName: data.user.first_name,
          lastName: data.user.last_name,
          email: data.user.email,
        }

        // Store token and user data
        localStorage.setItem("qbm-hydronet-token", data.token)
        localStorage.setItem("qbm-hydronet-user", JSON.stringify(userData))
        
        // Set cookie for middleware
        document.cookie = `qbm-hydronet-token=${data.token}; path=/; max-age=${60*60*24*7}; SameSite=Strict`
        
        setUser(userData)
        return true
      } else {
        console.error('Login failed:', data.error)
        return false
      }
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }, [])

  const signup = useCallback(async (data: SignupData): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          username: data.username,
          password: data.password,
        }),
      })

      const responseData = await response.json()

      if (response.ok) {
        // Auto-login the new user
        const userData = {
          username: responseData.user.username,
          role: responseData.user.role,
          lastLogin: new Date().toISOString(),
          firstName: responseData.user.first_name,
          lastName: responseData.user.last_name,
          email: responseData.user.email,
        }

        // Store token and user data
        localStorage.setItem("qbm-hydronet-token", responseData.token)
        localStorage.setItem("qbm-hydronet-user", JSON.stringify(userData))
        
        // Set cookie for middleware
        document.cookie = `qbm-hydronet-token=${responseData.token}; path=/; max-age=${60*60*24*7}; SameSite=Strict`
        
        setUser(userData)
        return true
      } else {
        console.error('Signup failed:', responseData.error)
        return false
      }
    } catch (error) {
      console.error("Signup error:", error)
      return false
    }
  }, [])

  const logout = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem("qbm-hydronet-token")
    localStorage.removeItem("qbm-hydronet-user")
    
    // Clear cookie
    document.cookie = "qbm-hydronet-token=; path=/; max-age=0; SameSite=Strict"
    
    setUser(null)
    
    // Use window.location to ensure a complete redirect and avoid hook issues
    window.location.href = "/login"
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    login,
    signup,
    logout,
    isLoading,
    isAuthenticated: !!user
  }), [user, login, signup, logout, isLoading])

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
