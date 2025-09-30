"use client"

import React from "react"
import { Line as RechartsLine } from "recharts"
import type { LineProps } from "recharts"

// This is a wrapper around Recharts Line component that disables animations by default
// to prevent the "Maximum update depth exceeded" error
export function Line(props: LineProps) {
  return <RechartsLine {...props} isAnimationActive={false} />
}