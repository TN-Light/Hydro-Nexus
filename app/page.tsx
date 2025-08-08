import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Droplets, Zap, BarChart3, Smartphone, Leaf, Shield } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Leaf className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="text-xl sm:text-2xl font-bold text-foreground">Hydro Nexus</span>
          </div>
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <Link
              href="#features"
              className="text-sm lg:text-base text-muted-foreground hover:text-primary transition-colors"
            >
              Features
            </Link>
            <Link
              href="#benefits"
              className="text-sm lg:text-base text-muted-foreground hover:text-primary transition-colors"
            >
              Benefits
            </Link>
            <Link href="#contact" className="text-sm lg:text-base text-muted-foreground hover:text-primary transition-colors">
              Contact
            </Link>
          </nav>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center max-w-screen-xl">
          <Badge className="mb-4 sm:mb-6" variant="secondary">
            🌱 Precision Agriculture Platform
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
            Optimize Exotic Crop
            <br />
            <span className="text-primary">Cultivation with AI</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-full sm:max-w-2xl lg:max-w-3xl mx-auto px-4">
            Harness the power of integrated subsurface drip hydroponics, artificial intelligence, and IoT sensors to
            maximize yield and minimize resource consumption.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md sm:max-w-none mx-auto">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto"
              >
                Launch Dashboard
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <Link href="#demo" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                Watch Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="container mx-auto max-w-screen-xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Complete Hydroponic Management
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-full sm:max-w-xl lg:max-w-2xl mx-auto px-4">
              Everything you need to monitor, analyze, and optimize your precision agriculture operation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <Droplets className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-4" />
                <CardTitle className="text-foreground text-lg sm:text-xl">Real-Time Monitoring</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Track water temperature, pH, EC, ORP, dissolved oxygen, and humidity across all grow bags.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-4" />
                <CardTitle className="text-foreground text-lg sm:text-xl">Analytics Studio</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Historical data analysis with ML insights for nutrient optimization and growth prediction.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <Zap className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-4" />
                <CardTitle className="text-foreground text-lg sm:text-xl">Digital Twin</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  3D greenhouse visualization with interactive scenario simulation and optimization.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <Smartphone className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-4" />
                <CardTitle className="text-foreground text-lg sm:text-xl">Mobile PWA</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Install on any device with offline capabilities and push notifications for alerts.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-4" />
                <CardTitle className="text-foreground text-lg sm:text-xl">Device Management</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Monitor IoT sensor health, battery levels, and perform OTA firmware updates.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <Leaf className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-4" />
                <CardTitle className="text-foreground text-lg sm:text-xl">AI Optimization</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Machine learning-powered nutrient recommendations for maximum crop yield.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 cream-gradient">
        <div className="container mx-auto max-w-screen-xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 sm:mb-6">
                Maximize Yield, Minimize Waste
              </h2>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary rounded-full p-2 mt-1 flex-shrink-0">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2 text-lg sm:text-xl">30% Higher Yields</h3>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      AI-optimized nutrient delivery and environmental control systems.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary rounded-full p-2 mt-1 flex-shrink-0">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2 text-lg sm:text-xl">50% Water Savings</h3>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      Precision irrigation with real-time monitoring and automated adjustments.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="bg-primary rounded-full p-2 mt-1 flex-shrink-0">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2 text-lg sm:text-xl">24/7 Monitoring</h3>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      Continuous sensor data with instant alerts for optimal growing conditions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 relative">
              <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-xl max-w-md mx-auto lg:max-w-none">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">6.2</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">pH Level</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">24°C</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Water Temp</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">2.1</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">EC (mS/cm)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">7.2</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">DO (mg/L)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center max-w-screen-xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            Ready to Transform Your Agriculture?
          </h2>
          <p className="text-lg sm:text-xl text-primary-foreground/80 mb-6 sm:mb-8 max-w-full sm:max-w-xl lg:max-w-2xl mx-auto px-4">
            Join the precision agriculture revolution with Hydro Nexus. Start optimizing your exotic crop cultivation
            today.
          </p>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary" className="px-6 sm:px-8 py-3 sm:py-4">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-screen-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="sm:col-span-2 md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <Leaf className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <span className="text-lg sm:text-xl font-bold text-foreground">Hydro Nexus</span>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">
                Precision agriculture platform for the future of farming.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4 text-base sm:text-lg">Platform</h3>
              <ul className="space-y-2 text-muted-foreground text-sm sm:text-base">
                <li>
                  <Link href="/dashboard" className="hover:text-primary transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/analytics" className="hover:text-primary transition-colors">
                    Analytics
                  </Link>
                </li>
                <li>
                  <Link href="/devices" className="hover:text-primary transition-colors">
                    Devices
                  </Link>
                </li>
                <li>
                  <Link href="/optimization" className="hover:text-primary transition-colors">
                    Optimization
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4 text-base sm:text-lg">Resources</h3>
              <ul className="space-y-2 text-muted-foreground text-sm sm:text-base">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Support
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Community
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4 text-base sm:text-lg">Company</h3>
              <ul className="space-y-2 text-muted-foreground text-sm sm:text-base">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-muted-foreground text-sm sm:text-base">
            <p>&copy; 2024 Hydro Nexus. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
