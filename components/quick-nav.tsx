"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BarChart3, Smartphone, Zap, ArrowRight } from "lucide-react"

const navItems = [
  {
    title: "Digital Twin",
    href: "/digital-twin",
    icon: Zap,
    description: "Visualize your greenhouse and simulate scenarios.",
  },
  {
    title: "Analytics Studio",
    href: "/analytics",
    icon: BarChart3,
    description: "Analyze historical data and predict trends.",
  },
  {
    title: "Device Manager",
    href: "/devices",
    icon: Smartphone,
    description: "Monitor and manage your IoT sensors.",
  },
]

export function QuickNav() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Navigation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {navItems.map((item) => (
            <Card key={item.title} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <item.icon className="h-8 w-8 text-primary" />
                  <CardTitle>{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">{item.description}</p>
              </CardContent>
              <div className="p-6 pt-0">
                <Link href={item.href}>
                  <Button variant="outline" className="w-full">
                    Go to {item.title}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
