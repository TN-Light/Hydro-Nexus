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
    // Check for stored auth token in both localStorage and cookies
    const token = localStorage.getItem("hydro-nexus-token")
    const userData = localStorage.getItem("hydro-nexus-user")
    
    // Also check cookie for server-side middleware
    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('hydro-nexus-token='))
      ?.split('=')[1]

    if ((token || cookieToken) && userData) {
      setUser(JSON.parse(userData))
      
      // Ensure both localStorage and cookie are set
      if (token && !cookieToken) {
        document.cookie = `hydro-nexus-token=${token}; path=/; max-age=${60*60*24*7}; SameSite=Strict`
      }
    }
    setIsLoading(false)
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
        localStorage.setItem("hydro-nexus-token", data.token)
        localStorage.setItem("hydro-nexus-user", JSON.stringify(userData))
        
        // Set cookie for middleware
        document.cookie = `hydro-nexus-token=${data.token}; path=/; max-age=${60*60*24*7}; SameSite=Strict`
        
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
        localStorage.setItem("hydro-nexus-token", responseData.token)
        localStorage.setItem("hydro-nexus-user", JSON.stringify(userData))
        
        // Set cookie for middleware
        document.cookie = `hydro-nexus-token=${responseData.token}; path=/; max-age=${60*60*24*7}; SameSite=Strict`
        
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
    localStorage.removeItem("hydro-nexus-token")
    localStorage.removeItem("hydro-nexus-user")
    
    // Clear cookie
    document.cookie = "hydro-nexus-token=; path=/; max-age=0; SameSite=Strict"
    
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
