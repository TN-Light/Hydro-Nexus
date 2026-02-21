import { NextResponse } from 'next/server'
import { QBM_CROPS } from '@/lib/crop-database'

/**
 * GET /api/crops
 * Returns the four QBM-approved crops directly from the canonical
 * crop-database.ts file — no DB dependency needed for the crop list.
 */
export async function GET() {
  const crops = QBM_CROPS.map((crop) => ({
    id: crop.id,               // string slug e.g. "turmeric"
    name: crop.name,
    icon: crop.icon,
    color: crop.color,
    bioactive_type: crop.bioactive_type,
    bioactive_target: crop.bioactive_target,
    bioactive_description: crop.bioactive_description,
    notes: crop.commercial_note ?? null,
    optimalRanges: {
      pH:          { min: crop.parameters.pH.min,                      max: crop.parameters.pH.max },
      ec:          { min: crop.parameters.ec.min,                      max: crop.parameters.ec.max },
      temperature: { min: crop.parameters.temperature.min,             max: crop.parameters.temperature.max },
      humidity:    { min: crop.parameters.humidity_vegetative.min,     max: crop.parameters.humidity_vegetative.max },
      moisture:    { min: crop.parameters.substrate_moisture.min,      max: crop.parameters.substrate_moisture.max },
      phosphorus:  { min: crop.parameters.phosphorus_ppm.min,          max: crop.parameters.phosphorus_ppm.max },
    },
  }))

  return NextResponse.json({ success: true, crops })
}

