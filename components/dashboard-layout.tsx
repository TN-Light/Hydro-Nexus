"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Leaf,
  Menu,
  Home,
  BarChart3,
  Settings,
  Smartphone,
  Beaker,
  Bell,
  User,
  LogOut,
  Moon,
  Sun,
  CuboidIcon as Cube,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useRealtime } from "@/components/realtime-provider"
import { RealtimeProvider } from "@/components/realtime-provider"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Digital Twin", href: "/digital-twin", icon: Cube },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Devices", href: "/devices", icon: Smartphone },
  { name: "Optimization", href: "/optimization", icon: Beaker },
  { name: "Settings", href: "/settings", icon: Settings },
]

// Dashboard layout content component
function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const { alerts } = useRealtime()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const unreadAlerts = alerts.filter(
    (alert) => Date.now() - new Date(alert.timestamp).getTime() < 5 * 60 * 1000, // Last 5 minutes
  ).length || 0

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? "p-4" : "p-4 sm:p-6"}`}>
      <div className="flex items-center space-x-2 mb-6 sm:mb-8">
        <Leaf className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <span className="text-lg sm:text-xl font-bold text-foreground">Hydro Nexus</span>
      </div>

      <nav className="flex-1 space-y-1 sm:space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
              }`}
              onClick={() => mobile && setMobileMenuOpen(false)}
            >
              <item.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 xl:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card border-r">
          <Sidebar />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 sm:w-72 p-0 bg-card">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="lg:pl-64 xl:pl-72">
        {/* Top Navigation */}
        <div className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 items-center gap-x-4 border-b bg-card/80 backdrop-blur-sm px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open sidebar</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 sm:w-72 p-0 bg-card">
              <Sidebar mobile />
            </SheetContent>
          </Sheet>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
                {navigation.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))?.name ||
                  "Dashboard"}
              </h1>
            </div>

            <div className="flex items-center gap-x-2 sm:gap-x-4 lg:gap-x-6">
              {/* Notifications */}
              <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                    {unreadAlerts > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 text-xs bg-destructive text-destructive-foreground">
                        {unreadAlerts > 99 ? "99+" : unreadAlerts}
                      </Badge>
                    )}
                    <span className="sr-only">View notifications</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    <Badge variant="secondary">{alerts.length}</Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {alerts.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications</p>
                      <p className="text-xs">All systems operating normally</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-64">
                      <div className="space-y-1">
                        {alerts.slice(0, 10).map((alert) => (
                          <DropdownMenuItem key={alert.id} className="flex-col items-start p-3 space-y-1">
                            <div className="flex items-center justify-between w-full">
                              <Badge 
                                variant={alert.severity === "error" ? "destructive" : alert.severity === "warning" ? "secondary" : "outline"}
                                className="text-xs"
                              >
                                {alert.severity.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-mono">
                                {alert.deviceId.replace("grow-bag-", "Bag ")}
                              </span>
                            </div>
                            <p className="text-sm w-full">{alert.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(alert.timestamp).toLocaleTimeString()}
                            </p>
                          </DropdownMenuItem>
                        ))}
                        {alerts.length > 10 && (
                          <DropdownMenuItem className="justify-center">
                            <span className="text-xs text-muted-foreground">+{alerts.length - 10} more notifications</span>
                          </DropdownMenuItem>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Theme Toggle */}
              <Button variant="ghost" size="sm" onClick={handleThemeToggle}>
                <Sun className="h-4 w-4 sm:h-5 sm:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 sm:h-5 sm:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 sm:w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-foreground">{user?.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.role}</p>
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
        <main className="py-4 sm:py-6 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

// Dashboard layout wrapper that provides the RealtimeProvider
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </RealtimeProvider>
  )
}
