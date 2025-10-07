"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface User {
  username: string
  role: string
  lastLogin: string
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
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

  const login = async (username: string, password: string): Promise<boolean> => {
    // Mock authentication - in real app, this would call an API
    if (username === "admin" && password === "hydro123") {
      const userData = {
        username: "admin",
        role: "administrator",
        lastLogin: new Date().toISOString(),
      }

      const token = "mock-jwt-token"
      // Store in localStorage for client-side access
      localStorage.setItem("hydro-nexus-token", token)
      localStorage.setItem("hydro-nexus-user", JSON.stringify(userData))
      
      // Also set in cookies for middleware authentication
      document.cookie = `hydro-nexus-token=${token}; path=/; max-age=${60*60*24*7}; SameSite=Strict`
      
      setUser(userData)
      return true
    }
    return false
  }

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem("hydro-nexus-token")
    localStorage.removeItem("hydro-nexus-user")
    
    // Clear cookie
    document.cookie = "hydro-nexus-token=; path=/; max-age=0; SameSite=Strict"
    
    setUser(null)
    router.push("/login")
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading, isAuthenticated: !!user }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
