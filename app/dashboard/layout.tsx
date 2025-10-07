"use client"

import { memo } from "react"
import DashboardLayout from "@/components/dashboard-layout"

const MemoizedDashboardLayout = memo(DashboardLayout)

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <MemoizedDashboardLayout>{children}</MemoizedDashboardLayout>
}