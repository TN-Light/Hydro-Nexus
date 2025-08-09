"use client"

import { useAuth } from "@/components/auth-provider"
import { Card, CardContent } from "@/components/ui/card"
import { getSeasonalGreeting } from "@/lib/date-helpers"
import { format } from "date-fns"

export function Greeting() {
  const { user } = useAuth()

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {user?.username}!
            </h1>
            <p className="text-muted-foreground">{getSeasonalGreeting()}</p>
          </div>
          {user?.lastLogin && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Last login</p>
              <p className="text-sm font-medium text-foreground">
                {format(new Date(user.lastLogin), "PPpp")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
