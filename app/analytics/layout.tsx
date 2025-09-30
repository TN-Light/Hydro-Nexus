import DashboardLayout from "@/components/dashboard-layout"

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}