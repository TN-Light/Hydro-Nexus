import type React from "react"
import type { Metadata } from "next"
import { Inter, Roboto_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-roboto-mono",
})

import { Viewport } from "next"

export const metadata: Metadata = {
  title: "QBM-HydroNet - Quantum-Bio-Mycorrhizal Hydroponic Network",
  description: "Maximize bioactive metabolite yield in exotic crops through AMF-driven symbiosis, PAW stress protocols, and precision IoT monitoring.",
  manifest: "/manifest.json",
  generator: 'v0.dev',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'QBM-HydroNet',
  },
}

export const viewport: Viewport = {
  themeColor: "#15803d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${robotoMono.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) { console.log('SW registered:', reg.scope) },
                    function(err) { console.log('SW registration failed:', err) }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
