"use client"

import { useEffect } from 'react'
import { useAuth } from '@/components/auth-provider'
import { usePreferencesStore } from '@/lib/stores/preferences-store'

export function PreferencesInitializer() {
  const { user, isAuthenticated } = useAuth()
  const { loadPreferences, isInitialized } = usePreferencesStore()

  useEffect(() => {
    if (isAuthenticated && user && !isInitialized) {
      loadPreferences()
    }
  }, [isAuthenticated, user, isInitialized, loadPreferences])

  return null // This component doesn't render anything
}