import { create } from "zustand"
import { persist } from "zustand/middleware"

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
  updateProfile: (profile: Partial<UserProfile>) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void
  updateNotificationRule: (rule: string, channels: string[]) => void
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      profile: {
        username: "admin",
        fullName: "Alex Ray",
        email: "alex.r@hydronexus.io",
        role: "Administrator",
        avatarUrl: "/placeholder.svg?height=100&width=100",
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
      updateProfile: (profile) =>
        set((state) => ({
          profile: { ...state.profile, ...profile },
        })),
      updatePreferences: (preferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        })),
      updateNotificationSettings: (settings) =>
        set((state) => ({
          notificationSettings: { ...state.notificationSettings, ...settings },
        })),
      updateNotificationRule: (rule, channels) =>
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            rules: {
              ...state.notificationSettings.rules,
              [rule]: channels,
            },
          },
        })),
    }),
    {
      name: "hydro-nexus-preferences",
    },
  ),
)
