import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Plant Disease Prediction | QBM-HydroNet',
  description: 'AI-powered plant disease detection and analysis for your hydroponic system',
}

export default function PredictionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
