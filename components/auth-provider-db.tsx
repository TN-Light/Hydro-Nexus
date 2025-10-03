"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import bcrypt from "bcryptjs"

interface User {
  user_id: string
  username: string
  email: string
  full_name?: string
  first_name?: string
  last_name?: string
  role: string
}

interface SignupData {
  firstName: string
  lastName: string
  email: string
  password: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  signup: (data: SignupData) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const isAuthenticated = !!user

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = useCallback(async () => {
    try {
      // Try to get user from localStorage first (for demo mode)
      const storedUser = localStorage.getItem("hydro-nexus-user")
      if (storedUser) {
        setUser(JSON.parse(storedUser))
        setLoading(false)
        return
      }

      // Check for database session (future implementation)
      const token = localStorage.getItem("hydro-nexus-token")
      if (token) {
        // Validate token with backend API
        const response = await fetch("/api/auth/verify", {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        } else {
          localStorage.removeItem("hydro-nexus-token")
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)

      // Check for admin user (demo mode)
      if (username === "admin" && password === "admin") {
        const adminUser: User = {
          user_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          username: "admin",
          email: "admin@hydro-nexus.com",
          full_name: "Admin User",
          first_name: "Admin",
          last_name: "User",
          role: "admin"
        }
        setUser(adminUser)
        localStorage.setItem("hydro-nexus-user", JSON.stringify(adminUser))
        return true
      }

      // Try database authentication
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        })

        if (response.ok) {
          const { user: userData, token } = await response.json()
          setUser(userData)
          localStorage.setItem("hydro-nexus-user", JSON.stringify(userData))
          localStorage.setItem("hydro-nexus-token", token)
          return true
        }
      } catch (apiError) {
        console.log("API not available, falling back to localStorage")
      }

      // Fallback to localStorage for registered users (demo mode)
      const registeredUsers = JSON.parse(localStorage.getItem("hydro-nexus-registered-users") || "[]")
      const foundUser = registeredUsers.find((u: any) => 
        (u.username === username || u.email === username)
      )

      if (foundUser) {
        // In production, you'd verify the password hash here
        // For demo, we'll check if password matches stored password
        if (foundUser.password === password) {
          const userObj: User = {
            user_id: foundUser.id || `user-${Date.now()}`,
            username: foundUser.username,
            email: foundUser.email,
            full_name: `${foundUser.firstName} ${foundUser.lastName}`,
            first_name: foundUser.firstName,
            last_name: foundUser.lastName,
            role: "user"
          }
          setUser(userObj)
          localStorage.setItem("hydro-nexus-user", JSON.stringify(userObj))
          return true
        }
      }

      return false
    } catch (error) {
      console.error("Login failed:", error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const signup = useCallback(async (data: SignupData): Promise<boolean> => {
    try {
      setLoading(true)

      // Try database registration first
      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        })

        if (response.ok) {
          const { user: userData, token } = await response.json()
          setUser(userData)
          localStorage.setItem("hydro-nexus-user", JSON.stringify(userData))
          localStorage.setItem("hydro-nexus-token", token)
          return true
        } else {
          const error = await response.json()
          throw new Error(error.message || "Signup failed")
        }
      } catch (apiError) {
        console.log("API not available, using localStorage fallback")
      }

      // Fallback to localStorage (demo mode)
      const registeredUsers = JSON.parse(localStorage.getItem("hydro-nexus-registered-users") || "[]")
      
      // Check if email already exists
      if (registeredUsers.some((u: any) => u.email === data.email)) {
        throw new Error("Email already registered")
      }

      // Generate username from email
      const username = data.email.split("@")[0]
      
      // Check if username already exists
      if (registeredUsers.some((u: any) => u.username === username)) {
        throw new Error("Username already taken")
      }

      // Create new user record
      const newUser = {
        id: `user-${Date.now()}`,
        username,
        email: data.email,
        password: data.password, // In production, this would be hashed
        firstName: data.firstName,
        lastName: data.lastName,
        createdAt: new Date().toISOString()
      }

      // Save to localStorage
      registeredUsers.push(newUser)
      localStorage.setItem("hydro-nexus-registered-users", JSON.stringify(registeredUsers))

      // Auto-login the new user
      const userObj: User = {
        user_id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        full_name: `${newUser.firstName} ${newUser.lastName}`,
        first_name: newUser.firstName,
        last_name: newUser.lastName,
        role: "user"
      }
      
      setUser(userObj)
      localStorage.setItem("hydro-nexus-user", JSON.stringify(userObj))
      return true

    } catch (error) {
      console.error("Signup failed:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem("hydro-nexus-user")
    localStorage.removeItem("hydro-nexus-token")
  }, [])

  const value = {
    user,
    isAuthenticated,
    login,
    signup,
    logout,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}