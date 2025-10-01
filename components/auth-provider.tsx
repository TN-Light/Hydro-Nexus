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
    // Mock authentication - in real app, this would call an API
    
    // Check default admin credentials
    if (username === "admin" && password === "hydro123") {
      const userData = {
        username: "admin",
        role: "administrator",
        lastLogin: new Date().toISOString(),
      }

      const token = "mock-jwt-token"
      localStorage.setItem("hydro-nexus-token", token)
      localStorage.setItem("hydro-nexus-user", JSON.stringify(userData))
      
      document.cookie = `hydro-nexus-token=${token}; path=/; max-age=${60*60*24*7}; SameSite=Strict`
      
      setUser(userData)
      return true
    }

    // Check registered users
    try {
      const existingUsers = JSON.parse(localStorage.getItem("hydro-nexus-users") || "[]")
      const foundUser = existingUsers.find((user: any) => 
        (user.username === username || user.email === username) && 
        user.passwordHash === "hashed_" + password
      )

      if (foundUser) {
        const userData = {
          username: foundUser.username,
          role: foundUser.role,
          lastLogin: new Date().toISOString(),
          firstName: foundUser.firstName,
          lastName: foundUser.lastName,
          email: foundUser.email,
        }

        const token = "mock-jwt-token-" + Date.now()
        localStorage.setItem("hydro-nexus-token", token)
        localStorage.setItem("hydro-nexus-user", JSON.stringify(userData))
        
        document.cookie = `hydro-nexus-token=${token}; path=/; max-age=${60*60*24*7}; SameSite=Strict`
        
        setUser(userData)
        return true
      }
    } catch (error) {
      console.error("Login error:", error)
    }

    return false
  }, [])

  const signup = useCallback(async (data: SignupData): Promise<boolean> => {
    // Mock signup - in real app, this would call an API
    // For demo purposes, we'll simulate user registration
    try {
      // Check if username already exists (simulate database check)
      const existingUsers = JSON.parse(localStorage.getItem("hydro-nexus-users") || "[]")
      const userExists = existingUsers.some((user: any) => 
        user.username === data.username || user.email === data.email
      )
      
      if (userExists) {
        return false // Username or email already exists
      }

      // Create new user
      const newUser = {
        id: Date.now().toString(),
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "user",
        createdAt: new Date().toISOString(),
        // In real app, password would be hashed
        passwordHash: "hashed_" + data.password
      }

      // Save to mock database
      existingUsers.push(newUser)
      localStorage.setItem("hydro-nexus-users", JSON.stringify(existingUsers))

      // Auto-login the new user
      const userData = {
        username: data.username,
        role: "user",
        lastLogin: new Date().toISOString(),
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
      }

      const token = "mock-jwt-token-" + Date.now()
      localStorage.setItem("hydro-nexus-token", token)
      localStorage.setItem("hydro-nexus-user", JSON.stringify(userData))
      
      document.cookie = `hydro-nexus-token=${token}; path=/; max-age=${60*60*24*7}; SameSite=Strict`
      
      setUser(userData)
      return true
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
