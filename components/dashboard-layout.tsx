"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  BarChart3,
  Beaker,
  Bell,
  Box,
  Home,
  Leaf,
  LogOut,
  Menu,
  Moon,
  Settings,
  Smartphone,
  Sun,
  User,
} from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useRealtime } from "@/components/realtime-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Digital Twin", href: "/digital-twin", icon: Box },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Devices", href: "/devices", icon: Smartphone },
  { name: "Optimization", href: "/optimization", icon: Beaker },
  { name: "Settings", href: "/settings", icon: Settings },
]

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const { alerts } = useRealtime()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()

  const unreadAlerts = alerts.filter(
    (alert) => Date.now() - new Date(alert.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
  ).length

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link
            href="/exotic-crops-info"
            className={cn(
              "flex items-center space-x-2 rounded-lg p-2",
              pathname.includes("/exotic-crops-info") && "bg-primary/10"
            )}
          >
            <Leaf className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground group-data-[state=collapsed]:hidden">
              Hydro Nexus
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.name}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <SidebarTrigger className="hidden md:flex" />
        </SidebarFooter>
      </Sidebar>
      <div className="flex flex-col flex-1">
        {/* Main Content */}
        <div className="transition-[margin-left] ease-in-out duration-300 md:ml-[var(--sidebar-width-icon)] peer-[[data-state=expanded]]:md:ml-[var(--sidebar-width)]">
          {/* Top Navigation */}
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-card/80 backdrop-blur-sm px-4 sm:gap-x-6 sm:px-6 lg:px-8">
            <SidebarTrigger className="md:hidden" />

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <div className="flex flex-1 items-center">
                <h1 className="text-lg font-semibold text-foreground truncate">
                  {pathname.includes("exotic-crops")
                    ? "Exotic Crops"
                    : navigation.find(
                        (item) =>
                          pathname === item.href ||
                          pathname.startsWith(item.href + "/")
                      )?.name || "Dashboard"}
                </h1>
              </div>

              <div className="flex items-center gap-x-4 lg:gap-x-6">
                {/* Notifications */}
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadAlerts > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-destructive text-destructive-foreground">
                      {unreadAlerts}
                    </Badge>
                  )}
                  <span className="sr-only">View notifications</span>
                </Button>

                {/* Theme Toggle */}
                <Button variant="ghost" size="sm" onClick={handleThemeToggle}>
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {user?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56"
                    align="end"
                    forceMount
                  >
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none text-foreground">
                          {user?.username}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.role}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/settings/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <main className="flex-grow py-6 px-4 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  )
}
