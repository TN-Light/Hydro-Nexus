import DashboardLayout from "@/components/dashboard-layout"

export default function DevicesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}