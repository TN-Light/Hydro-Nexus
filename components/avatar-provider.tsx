"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'

interface AvatarContextType {
  avatarUrl: string | null
  setAvatarUrl: (url: string | null) => void
  refreshAvatar: () => Promise<void>
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined)

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const refreshAvatar = async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('qbm-hydronet-token')
      if (!token) return

      const response = await fetch('/api/profile/get', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        setAvatarUrl(userData.user?.avatar_url || null)
      }
    } catch (error) {
      console.log('Could not load avatar:', error)
    }
  }

  useEffect(() => {
    if (user) {
      refreshAvatar()
    } else {
      setAvatarUrl(null)
    }
  }, [user])

  return (
    <AvatarContext.Provider value={{ avatarUrl, setAvatarUrl, refreshAvatar }}>
      {children}
    </AvatarContext.Provider>
  )
}

export function useAvatar() {
  const context = useContext(AvatarContext)
  if (context === undefined) {
    throw new Error('useAvatar must be used within an AvatarProvider')
  }
  return context
}