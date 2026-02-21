import DashboardLayout from "@/components/dashboard-layout"

export default function CropsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
