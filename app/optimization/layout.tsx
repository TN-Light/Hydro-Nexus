import DashboardLayout from "@/components/dashboard-layout"

export default function OptimizationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}