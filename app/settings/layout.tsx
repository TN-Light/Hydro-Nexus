"use client"

import type React from "react"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Settings, Bell, Shield } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

const settingsNavigation = [
  { name: "Profile", href: "/settings/profile", icon: User, value: "profile" },
  { name: "Preferences", href: "/settings/preferences", icon: Settings, value: "preferences" },
  { name: "Notifications", href: "/settings/notifications", icon: Bell, value: "notifications" },
  { name: "Security", href: "/settings/security", icon: Shield, value: "security" },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileSection, setMobileSection] = useState("")

  useEffect(() => {
    const currentSection = pathname.split("/").pop() || "profile"
    setMobileSection(currentSection)
  }, [pathname])

  const handleMobileNavigation = (value: string) => {
    setMobileSection(value)
    const selectedItem = settingsNavigation.find((item) => item.value === value)
    if (selectedItem) {
      router.push(selectedItem.href)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="px-2 sm:px-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1 sm:mt-2">
            Manage your account preferences and application settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Desktop Sidebar Navigation */}
          <div className="hidden lg:block">
            <nav className="space-y-1 sm:space-y-2">
              {settingsNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start text-sm sm:text-base",
                        isActive && "agriculture-gradient text-white",
                      )}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden col-span-full px-2 sm:px-0">
            <Select value={mobileSection} onValueChange={handleMobileNavigation}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {settingsNavigation.map((item) => (
                  <SelectItem key={item.name} value={item.value}>
                    <div className="flex items-center">
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 px-2 sm:px-0">{children}</div>
        </div>
      </div>
    </DashboardLayout>
  )
}
