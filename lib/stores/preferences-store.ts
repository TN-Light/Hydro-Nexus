import { create } from "zustand"

interface UserPreferences {
  theme: "light" | "dark"
  units: {
    temperature: "C" | "F"
    concentration: "ppm" | "mS/cm"
  }
  dashboardDefaultRange: "12h" | "24h" | "3d" | "7d"
}

interface NotificationSettings {
  masterEnabled: boolean
  rules: {
    ph_critical: string[]
    ec_range: string[]
    do_low: string[]
    orp_low: string[]
    high_humidity: string[]
    device_offline: string[]
  }
}

interface UserProfile {
  username: string
  fullName: string
  email: string
  role: string
  avatarUrl: string
}

interface PreferencesStore {
  profile: UserProfile
  preferences: UserPreferences
  notificationSettings: NotificationSettings
  isLoading: boolean
  isInitialized: boolean
  loadPreferences: () => Promise<void>
  updateProfile: (profile: Partial<UserProfile>) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>
  updateNotificationRule: (rule: string, channels: string[]) => Promise<void>
}

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('hydro-nexus-token')
  }
  return null
}

export const usePreferencesStore = create<PreferencesStore>()((set, get) => ({
  profile: {
    username: "",
    fullName: "",
    email: "",
    role: "",
    avatarUrl: "/placeholder.svg",
  },
  preferences: {
    theme: "light",
    units: {
      temperature: "C",
      concentration: "ppm",
    },
    dashboardDefaultRange: "24h",
  },
  notificationSettings: {
    masterEnabled: true,
    rules: {
      ph_critical: ["in_app", "push"],
      ec_range: ["in_app"],
      do_low: ["in_app", "push", "email"],
      orp_low: ["in_app"],
      high_humidity: ["in_app", "push"],
      device_offline: ["in_app", "push", "email"],
    },
  },
  isLoading: false,
  isInitialized: false,

  loadPreferences: async () => {
    const token = getAuthToken()
    if (!token) return

    set({ isLoading: true })
    
    try {
      const response = await fetch('/api/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const prefs = data.preferences

        set({
          preferences: {
            theme: prefs.theme || 'light',
            units: prefs.measurement_units || {
              temperature: 'C',
              concentration: 'ppm'
            },
            dashboardDefaultRange: prefs.dashboard_default_range || '24h'
          },
          notificationSettings: prefs.notification_preferences || {
            masterEnabled: true,
            rules: {
              ph_critical: ['in_app', 'push'],
              ec_range: ['in_app'],
              do_low: ['in_app', 'push', 'email'],
              orp_low: ['in_app'],
              high_humidity: ['in_app', 'push'],
              device_offline: ['in_app', 'push', 'email']
            }
          },
          isInitialized: true
        })
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  updateProfile: (profile) =>
    set((state) => ({
      profile: { ...state.profile, ...profile },
    })),

  updatePreferences: async (preferences) => {
    const token = getAuthToken()
    if (!token) return

    // Optimistically update the state
    set((state) => ({
      preferences: { ...state.preferences, ...preferences },
    }))

    try {
      const currentPrefs = get().preferences
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          theme: currentPrefs.theme,
          measurement_units: currentPrefs.units,
          dashboard_default_range: currentPrefs.dashboardDefaultRange
        })
      })

      if (!response.ok) {
        // Revert on error
        throw new Error('Failed to update preferences')
      }
    } catch (error) {
      console.error('Failed to update preferences:', error)
      // Could revert the optimistic update here if needed
    }
  },

  updateNotificationSettings: async (settings) => {
    const token = getAuthToken()
    if (!token) return

    // Optimistically update the state
    set((state) => ({
      notificationSettings: { ...state.notificationSettings, ...settings },
    }))

    try {
      const currentSettings = get().notificationSettings
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notification_preferences: currentSettings
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update notification settings')
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error)
    }
  },

  updateNotificationRule: async (rule, channels) => {
    const token = getAuthToken()
    if (!token) return

    // Optimistically update the state
    set((state) => ({
      notificationSettings: {
        ...state.notificationSettings,
        rules: {
          ...state.notificationSettings.rules,
          [rule]: channels,
        },
      },
    }))

    try {
      const currentSettings = get().notificationSettings
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notification_preferences: currentSettings
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update notification rule')
      }
    } catch (error) {
      console.error('Failed to update notification rule:', error)
    }
  },
}))
