import DashboardLayout from "@/components/dashboard-layout"

export default function DigitalTwinLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}