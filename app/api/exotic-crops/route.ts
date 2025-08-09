import { NextResponse } from "next/server"

export async function GET() {
  const crops = [
    {
      name: "Saffron",
      image: "/placeholder.jpg",
      conditions: {
        pH: { min: 6.0, max: 8.0 },
        ec: { min: 0.8, max: 1.2 },
        temp: { min: 15, max: 20 },
        humidity: { min: 40, max: 50 },
      },
      yield: "0.6-1.0 kg/ha",
      marketPrice: "$500 - $5,000 per pound",
    },
    {
      name: "Wasabi",
      image: "/placeholder.jpg",
      conditions: {
        pH: { min: 6.0, max: 7.0 },
        ec: { min: 1.8, max: 2.4 },
        temp: { min: 8, max: 20 },
        humidity: { min: 80, max: 90 },
      },
      yield: "1.5-2.0 kg/m²",
      marketPrice: "$160 per kilogram",
    },
    {
      name: "Vanilla",
      image: "/placeholder.jpg",
      conditions: {
        pH: { min: 5.5, max: 7.0 },
        ec: { min: 1.0, max: 1.5 },
        temp: { min: 21, max: 32 },
        humidity: { min: 80, max: 90 },
      },
      yield: "0.1-0.2 kg per vine",
      marketPrice: "$200 - $600 per kilogram",
    },
  ]

  return NextResponse.json(crops)
}
