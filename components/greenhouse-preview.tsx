"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function GreenhousePreview() {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Digital Twin Preview</CardTitle>
        <CardDescription>A glimpse into your virtual greenhouse.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-center text-center">
        <Image
          src="/placeholder.svg"
          alt="3D Greenhouse Preview"
          width={200}
          height={150}
          className="rounded-lg object-cover"
        />
        <p className="text-sm text-muted-foreground mt-4">
          What if the temperature rises by 2°C?
        </p>
      </CardContent>
      <div className="p-6 pt-0">
        <Link href="/digital-twin">
          <Button variant="secondary" className="w-full">
            Launch Digital Twin
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Card>
  )
}
