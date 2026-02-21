/**
 * QBM-HydroNet Crop Database
 * Canonical registry of all approved and excluded crops for the
 * Quantum-Bio-Mycorrhizal Hydroponic Network system.
 */

export type BioactiveType = "curcumin" | "capsaicin"
export type GrowthStage =
  | "germination"
  | "vegetative"
  | "symbiosis_establishment"
  | "stress_induction"
  | "harvest_ready"

export interface LEDSpectrum {
  red_nm: number
  blue_nm: number
  red_blue_ratio: string // e.g. "1:1" or "2:1"
  ppfd_min: number // µmol/m²/s
  ppfd_max: number
  description: string
}

export interface ParameterRange {
  min: number
  max: number
  optimal: number
}

export interface CropParameters {
  temperature: ParameterRange // °C
  humidity_vegetative: ParameterRange // %
  humidity_stress: ParameterRange // % — during PAW stress phase
  pH: ParameterRange
  ec: ParameterRange // mS/cm
  phosphorus_ppm: ParameterRange // RESTRICTED — forced symbiosis requires low P
  substrate_moisture: ParameterRange // %
  nitrogen_ppm: ParameterRange
  potassium_ppm: ParameterRange
  calcium_ppm: ParameterRange
  magnesium_ppm: ParameterRange
}

export interface PAWProtocol {
  activation_weeks_before_harvest: number // start PAW this many weeks before harvest
  h2o2_concentration_min_um: number // minimum µM H₂O₂
  h2o2_concentration_max_um: number // maximum µM H₂O₂ — DO NOT EXCEED (AMF damage risk)
  applications_per_week: number
  volume_percent_of_irrigation_min: number // 5%
  volume_percent_of_irrigation_max: number // 10%
  description: string
}

export interface GDDProfile {
  base_temp_c: number // base temperature for GDD calculation
  target_gdd_min: number
  target_gdd_max: number
  description: string
}

export interface CropCycleStage {
  stage: GrowthStage
  duration_days_min: number
  duration_days_max: number
  description: string
  key_actions: string[]
}

export interface QBMCrop {
  id: string
  name: string
  scientific_name: string
  family: string
  bioactive_type: BioactiveType
  bioactive_target: string // e.g. "≥5% curcumin DW" or ">1,000,000 SHU"
  bioactive_description: string
  approved: true
  substrate_notes: string
  amf_synergy_notes: string
  parameters: CropParameters
  led_spectrum: LEDSpectrum
  paw_protocol: PAWProtocol
  gdd_profile: GDDProfile
  total_cycle_days_min: number
  total_cycle_days_max: number
  growth_stages: CropCycleStage[]
  color: string // UI accent color
  icon: string // emoji
  commercial_note: string
}

export interface ExcludedCrop {
  id: string
  name: string
  scientific_name: string
  approved: false
  reason: string
  biological_incompatibility: string
}

// ═══════════════════════════════════════
// APPROVED QBM-HydroNet Crops
// ═══════════════════════════════════════

export const TURMERIC: QBMCrop = {
  id: "turmeric-high-curcumin",
  name: "High-Curcumin Turmeric",
  scientific_name: "Curcuma longa",
  family: "Zingiberaceae",
  bioactive_type: "curcumin",
  bioactive_target: "≥5% curcumin DW (pharmaceutical grade)",
  bioactive_description:
    "Curcumin (C₂₁H₂₀O₆) is the primary polyphenol in turmeric. QBM stress protocols target ≥5% curcumin content by dry weight — 2–3× typical commercial yield of 1.5–3%. Used in anti-inflammatory pharmaceuticals, nutraceuticals, and spice extraction.",
  approved: true,
  substrate_notes:
    "Turmeric rhizomes prefer slightly denser substrate; increase biochar to 10% for enhanced CEC. Ensure excellent drainage — standing water causes rhizome rot.",
  amf_synergy_notes:
    "Rhizophagus irregularis colonizes turmeric roots aggressively under P restriction. AMF network significantly increases curcuminoid synthesis by triggering secondary metabolite pathways via jasmonic acid signaling.",
  parameters: {
    temperature: { min: 24, max: 30, optimal: 27 },
    humidity_vegetative: { min: 70, max: 80, optimal: 75 },
    humidity_stress: { min: 55, max: 65, optimal: 60 },
    pH: { min: 5.5, max: 6.5, optimal: 6.0 },
    ec: { min: 1.8, max: 2.4, optimal: 2.1 },
    phosphorus_ppm: { min: 40, max: 60, optimal: 50 }, // CRITICAL: keep low for AMF symbiosis
    substrate_moisture: { min: 60, max: 80, optimal: 70 },
    nitrogen_ppm: { min: 120, max: 180, optimal: 150 },
    potassium_ppm: { min: 200, max: 300, optimal: 250 },
    calcium_ppm: { min: 150, max: 200, optimal: 175 },
    magnesium_ppm: { min: 40, max: 70, optimal: 55 },
  },
  led_spectrum: {
    red_nm: 660,
    blue_nm: 450,
    red_blue_ratio: "1:1",
    ppfd_min: 200,
    ppfd_max: 300,
    description:
      "Balanced 1:1 Red:Blue ratio optimizes photosynthetic quantum yield for curcuminoid synthesis. Red 660nm drives photosynthesis; Blue 450nm activates CRY1/CRY2 cryptochromes and stimulates phenylpropanoid pathway enzyme expression.",
  },
  paw_protocol: {
    activation_weeks_before_harvest: 3,
    h2o2_concentration_min_um: 20,
    h2o2_concentration_max_um: 40,
    applications_per_week: 2,
    volume_percent_of_irrigation_min: 5,
    volume_percent_of_irrigation_max: 8,
    description:
      "Apply PAW 3 weeks before harvest. Mild H₂O₂ oxidative stress (20–40 µM) activates the jasmonic acid defense cascade in turmeric, forcing upregulation of CYC/GAS/BAS sesquiterpenoid enzymes responsible for curcumin biosynthesis.",
  },
  gdd_profile: {
    base_temp_c: 10,
    target_gdd_min: 1500,
    target_gdd_max: 2000,
    description:
      "Turmeric is a tropical geophyte requiring significant heat accumulation. GDD tracking predicts rhizome maturity and optimal harvest window.",
  },
  total_cycle_days_min: 210,
  total_cycle_days_max: 270,
  growth_stages: [
    {
      stage: "germination",
      duration_days_min: 14,
      duration_days_max: 21,
      description: "Rhizome sprouting. Keep substrate at 75% moisture. No fertilization yet.",
      key_actions: ["Monitor substrate moisture ≥70%", "Temp 26–30°C", "Humidity 80%", "No EC stress yet"],
    },
    {
      stage: "vegetative",
      duration_days_min: 90,
      duration_days_max: 120,
      description: "Active leaf and pseudo-stem development. AMF symbiosis establishment period.",
      key_actions: [
        "Maintain P at 40–60 ppm to force AMF symbiosis",
        "EC 1.8–2.2 mS/cm",
        "LED 1:1 Red/Blue at 200 µmol/m²/s",
        "Verify substrate inoculated with AMF + Trichoderma + Bacillus",
        "Inspect CMN cartridges for hyphae activity",
      ],
    },
    {
      stage: "symbiosis_establishment",
      duration_days_min: 30,
      duration_days_max: 45,
      description: "AMF network fully colonizes roots and connects bags via CMN cartridges.",
      key_actions: [
        "P must stay 40–60 ppm — do NOT raise",
        "EC 2.0–2.4 mS/cm (build rhizome mass)",
        "Increase PPFD to 250 µmol/m²/s",
        "Monitor substrate moisture — dehydration kills hyphal network",
      ],
    },
    {
      stage: "stress_induction",
      duration_days_min: 21,
      duration_days_max: 28,
      description: "PAW stress protocol active. Plant redirects energy into curcumin overproduction.",
      key_actions: [
        "Begin PAW: 20–40 µM H₂O₂, 2×/week, 5–8% of irrigation volume",
        "Log every PAW application (date, concentration, volume)",
        "Shift LED to 300 µmol/m²/s",
        "Reduce humidity to 55–65%",
        "Monitor EC daily — stress increases nutrient uptake rate",
      ],
    },
    {
      stage: "harvest_ready",
      duration_days_min: 1,
      duration_days_max: 7,
      description: "GDD target reached. Curcumin at peak. Harvest within 7 days.",
      key_actions: [
        "Stop PAW applications 48 hours before harvest",
        "Generate Quality Certificate",
        "Remove and compost CMN cartridges (single-use)",
        "Harvest rhizomes — test curcumin % for batch record",
      ],
    },
  ],
  color: "#f59e0b",
  icon: "🌿",
  commercial_note:
    "Pharmaceutical-grade turmeric with ≥5% curcumin commands $40–120/kg vs $2–5/kg commercial grade. Primary buyers: nutraceutical manufacturers, Ayurvedic extract companies, cosmetic ingredient suppliers.",
}

export const BHUT_JOLOKIA: QBMCrop = {
  id: "bhut-jolokia",
  name: "Bhut Jolokia (Ghost Pepper)",
  scientific_name: "Capsicum chinense × frutescens",
  family: "Solanaceae",
  bioactive_type: "capsaicin",
  bioactive_target: ">1,000,000 SHU capsaicin (pharmaceutical grade)",
  bioactive_description:
    "Capsaicin (C₁₈H₂₇NO₃) is the primary vanilloid alkaloid. Bhut Jolokia targets >1,000,000 SHU — one of the most capsaicin-dense peppers achievable. Used in pharmaceutical pain patches (TRPV1 agonist), defense sprays, and ultra-premium spice extracts.",
  approved: true,
  substrate_notes:
    "Chili roots are more drought-tolerant than turmeric. Slightly dry cycles (brief 55% moisture dips) between irrigation is acceptable and can boost capsaicin pre-PAW.",
  amf_synergy_notes:
    "AMF dramatically increases capsaicin precursor supply (phenylpropanoid pool) by improving overall nutrient uptake efficiency. P restriction is especially effective in Capsicum.",
  parameters: {
    temperature: { min: 26, max: 32, optimal: 29 },
    humidity_vegetative: { min: 65, max: 75, optimal: 70 },
    humidity_stress: { min: 50, max: 60, optimal: 55 },
    pH: { min: 6.0, max: 6.8, optimal: 6.4 },
    ec: { min: 2.0, max: 2.8, optimal: 2.4 },
    phosphorus_ppm: { min: 40, max: 60, optimal: 50 },
    substrate_moisture: { min: 55, max: 80, optimal: 68 },
    nitrogen_ppm: { min: 150, max: 200, optimal: 175 },
    potassium_ppm: { min: 250, max: 350, optimal: 300 },
    calcium_ppm: { min: 170, max: 220, optimal: 200 },
    magnesium_ppm: { min: 50, max: 75, optimal: 60 },
  },
  led_spectrum: {
    red_nm: 660,
    blue_nm: 450,
    red_blue_ratio: "2:1",
    ppfd_min: 250,
    ppfd_max: 350,
    description:
      "2:1 Red:Blue ratio maximizes fruiting and capsaicinoid accumulation. Higher PPFD (250–350 µmol) accelerates capsaicin biosynthesis through the phenylpropanoid pathway.",
  },
  paw_protocol: {
    activation_weeks_before_harvest: 3,
    h2o2_concentration_min_um: 30,
    h2o2_concentration_max_um: 50,
    applications_per_week: 2,
    volume_percent_of_irrigation_min: 5,
    volume_percent_of_irrigation_max: 10,
    description:
      "Slightly higher PAW dose (30–50 µM) for Bhut Jolokia activates the capsaicin biosynthesis genes (PAL, C4H, 4CL, AT3) via jasmonic acid/salicylic acid crosstalk. Begin 3 weeks before harvest.",
  },
  gdd_profile: {
    base_temp_c: 10,
    target_gdd_min: 1200,
    target_gdd_max: 1800,
    description:
      "Bhut Jolokia requires substantial heat accumulation. Harvest at full red color stage for maximum capsaicin concentration.",
  },
  total_cycle_days_min: 180,
  total_cycle_days_max: 240,
  growth_stages: [
    {
      stage: "germination",
      duration_days_min: 14,
      duration_days_max: 28,
      description: "Capsicum germination requires high temps. Use 28–32°C for best germination rates.",
      key_actions: ["Maintain 30°C substrate temp", "Humidity 75–80%", "No nutrients until first true leaves"],
    },
    {
      stage: "vegetative",
      duration_days_min: 60,
      duration_days_max: 90,
      description: "Stem, branch, and canopy development. AMF establishment critical now.",
      key_actions: [
        "P at 40–60 ppm for forced symbiosis",
        "EC 2.0–2.4 mS/cm",
        "LED 2:1 Red/Blue at 250 µmol/m²/s",
        "Prune to 2–3 main stems for concentrated yield",
      ],
    },
    {
      stage: "symbiosis_establishment",
      duration_days_min: 21,
      duration_days_max: 35,
      description: "Flowering begins. AMF supplies phosphorus for fruit set.",
      key_actions: [
        "Maintain P restriction — critical during flowering",
        "EC 2.4–2.8 mS/cm (fruiting demand)",
        "Increase K to 300 ppm for fruit development",
        "PPFD to 300 µmol/m²/s",
        "Manual pollination if needed",
      ],
    },
    {
      stage: "stress_induction",
      duration_days_min: 21,
      duration_days_max: 28,
      description: "PAW stress during fruit color change phase maximizes capsaicin.",
      key_actions: [
        "Begin PAW: 30–50 µM H₂O₂, 2×/week, 5–10% volume",
        "Log every PAW dose",
        "PPFD 300–350 µmol/m²/s",
        "Reduce humidity to 50–60% to concentrate capsaicinoids",
        "Do not overwater — mild drought stress adds capsaicin",
      ],
    },
    {
      stage: "harvest_ready",
      duration_days_min: 1,
      duration_days_max: 14,
      description: "Full red color. Maximum capsaicin. Harvest at peak.",
      key_actions: [
        "Stop PAW 48 hours before harvest",
        "Generate Quality Certificate with SHU estimate",
        "Remove CMN cartridges for composting",
        "Test sample batch SHU (HPLC or enzymatic assay)",
      ],
    },
  ],
  color: "#ef4444",
  icon: "🌶️",
  commercial_note:
    "Pharmaceutical Bhut Jolokia (>1M SHU) sells for $150–500/kg dry vs $15–40/kg commercial. Primary buyers: TRPV1 pain patch manufacturers, defense spray producers, ultra-premium extract labs.",
}

export const AJI_CHARAPITA: QBMCrop = {
  id: "aji-charapita",
  name: "Aji Charapita",
  scientific_name: "Capsicum chinense",
  family: "Solanaceae",
  bioactive_type: "capsaicin",
  bioactive_target: "~300,000 SHU capsaicin",
  bioactive_description:
    "Aji Charapita is a Peruvian heritage chili prized for both its high capsaicin content (~300,000 SHU) and complex fruity flavor profile. World's most expensive chili by weight ($25,000/kg fresh in Peruvian restaurant markets). Target: pharmaceutical-grade capsaicin extraction + premium culinary markets.",
  approved: true,
  substrate_notes:
    "Smaller fruit size means higher capsaicin-to-mass ratio. Excellent candidate for dense planting in the 6-bag CMN network.",
  amf_synergy_notes:
    "AMF-assisted Aji Charapita shows enhanced aroma terpene production alongside capsaicin — premium flavor for culinary buyers.",
  parameters: {
    temperature: { min: 24, max: 30, optimal: 27 },
    humidity_vegetative: { min: 65, max: 75, optimal: 70 },
    humidity_stress: { min: 50, max: 62, optimal: 56 },
    pH: { min: 5.8, max: 6.5, optimal: 6.2 },
    ec: { min: 1.6, max: 2.2, optimal: 1.9 },
    phosphorus_ppm: { min: 40, max: 60, optimal: 50 },
    substrate_moisture: { min: 55, max: 80, optimal: 68 },
    nitrogen_ppm: { min: 130, max: 180, optimal: 155 },
    potassium_ppm: { min: 220, max: 300, optimal: 260 },
    calcium_ppm: { min: 160, max: 210, optimal: 185 },
    magnesium_ppm: { min: 45, max: 70, optimal: 57 },
  },
  led_spectrum: {
    red_nm: 660,
    blue_nm: 450,
    red_blue_ratio: "2:1",
    ppfd_min: 220,
    ppfd_max: 320,
    description:
      "2:1 Red:Blue. Aji Charapita benefits from slightly lower PPFD than Bhut Jolokia — prevents photooxidative stress that can reduce aroma compound quality.",
  },
  paw_protocol: {
    activation_weeks_before_harvest: 2,
    h2o2_concentration_min_um: 20,
    h2o2_concentration_max_um: 40,
    applications_per_week: 2,
    volume_percent_of_irrigation_min: 5,
    volume_percent_of_irrigation_max: 8,
    description:
      "Gentler PAW protocol (20–40 µM) preserves aroma volatiles while boosting capsaicin. Apply from 2 weeks before harvest.",
  },
  gdd_profile: {
    base_temp_c: 10,
    target_gdd_min: 1100,
    target_gdd_max: 1500,
    description:
      "Faster maturing than Bhut Jolokia. Multiple harvests possible from one plant — harvest when fruits reach full yellow/orange.",
  },
  total_cycle_days_min: 160,
  total_cycle_days_max: 200,
  growth_stages: [
    {
      stage: "germination",
      duration_days_min: 14,
      duration_days_max: 21,
      description: "Seed germination at 28°C.",
      key_actions: ["Maintain 28°C, humidity 75%", "No fertilizer until emergence"],
    },
    {
      stage: "vegetative",
      duration_days_min: 55,
      duration_days_max: 75,
      description: "Bush development and AMF colonization.",
      key_actions: ["P at 40–60 ppm", "EC 1.6–2.0", "LED 2:1 at 220 µmol/m²/s"],
    },
    {
      stage: "symbiosis_establishment",
      duration_days_min: 21,
      duration_days_max: 30,
      description: "Prolific flowering — Aji Charapita is a heavy producer.",
      key_actions: ["Maintain P restriction", "EC 2.0–2.2", "Raise PPFD to 280 µmol"],
    },
    {
      stage: "stress_induction",
      duration_days_min: 14,
      duration_days_max: 21,
      description: "PAW stress from 2 weeks before first major harvest.",
      key_actions: ["PAW 20–40 µM, 2×/week, 5–8% volume", "Log each dose", "Reduce humidity to 50–62%"],
    },
    {
      stage: "harvest_ready",
      duration_days_min: 1,
      duration_days_max: 21,
      description: "Multiple harvests. Fruits turn yellow-orange at peak. Harvest every 2–3 weeks.",
      key_actions: ["Stop PAW 48h before harvest", "Generate batch Quality Certificate", "Leave plant for next flush"],
    },
  ],
  color: "#f97316",
  icon: "🫑",
  commercial_note:
    "World's most expensive fresh chili. Dried pharmaceutical-grade extract: $500–2,000/kg. Culinary micro-batch: $200–600/kg dried. Strong market in luxury Peruvian cuisine and natural capsaicin labs.",
}

export const KANTHARI: QBMCrop = {
  id: "kanthari-chili",
  name: "Kanthari Chili",
  scientific_name: "Capsicum frutescens",
  family: "Solanaceae",
  bioactive_type: "capsaicin",
  bioactive_target: "~100,000 SHU capsaicin",
  bioactive_description:
    "Kanthari (Bird's Eye Chili from Kerala, India) — compact, prolific, ~100,000 SHU. Uniquely tolerant of humid conditions, making it ideal for grow bag cultivation. Strong demand in South Asian pharmaceutical and Ayurvedic markets.",
  approved: true,
  substrate_notes:
    "Kanthari is the most compact of the four crops — ideal for high-density planting. Can also be grown as a permanent perennial if root zone is maintained.",
  amf_synergy_notes:
    "Highly responsive to AMF colonization. Studies show 40–60% increase in capsaicin content under AMF + P restriction vs. standard hydroponics.",
  parameters: {
    temperature: { min: 22, max: 30, optimal: 26 },
    humidity_vegetative: { min: 65, max: 80, optimal: 72 },
    humidity_stress: { min: 55, max: 65, optimal: 60 },
    pH: { min: 5.8, max: 6.5, optimal: 6.1 },
    ec: { min: 1.5, max: 2.0, optimal: 1.75 },
    phosphorus_ppm: { min: 40, max: 60, optimal: 50 },
    substrate_moisture: { min: 60, max: 80, optimal: 70 },
    nitrogen_ppm: { min: 120, max: 170, optimal: 145 },
    potassium_ppm: { min: 200, max: 280, optimal: 240 },
    calcium_ppm: { min: 150, max: 200, optimal: 175 },
    magnesium_ppm: { min: 40, max: 65, optimal: 52 },
  },
  led_spectrum: {
    red_nm: 660,
    blue_nm: 450,
    red_blue_ratio: "2:1",
    ppfd_min: 200,
    ppfd_max: 280,
    description:
      "2:1 Red:Blue. Kanthari is adapted to tropical understory light — does not benefit from extreme PPFD. Keep at 200–280 µmol/m²/s to prevent light stress.",
  },
  paw_protocol: {
    activation_weeks_before_harvest: 2,
    h2o2_concentration_min_um: 20,
    h2o2_concentration_max_um: 40,
    applications_per_week: 2,
    volume_percent_of_irrigation_min: 5,
    volume_percent_of_irrigation_max: 8,
    description:
      "Gentle PAW protocol (20–40 µM). Kanthari responds well but is smaller-fruited — avoid overloading the plant's antioxidant system.",
  },
  gdd_profile: {
    base_temp_c: 10,
    target_gdd_min: 1000,
    target_gdd_max: 1400,
    description:
      "Fastest maturing of the four QBM crops. Multiple harvests per cycle. Harvest when fruits are fully white or red depending on variety.",
  },
  total_cycle_days_min: 150,
  total_cycle_days_max: 190,
  growth_stages: [
    {
      stage: "germination",
      duration_days_min: 10,
      duration_days_max: 18,
      description: "Fast germinator at 26–28°C.",
      key_actions: ["Substrate at 75% moisture", "Humidity 75–80%", "No nutrients yet"],
    },
    {
      stage: "vegetative",
      duration_days_min: 50,
      duration_days_max: 70,
      description: "Dense bushy growth. Prolific branching.",
      key_actions: ["P at 40–60 ppm", "EC 1.5–1.8", "LED 2:1 at 200 µmol/m²/s"],
    },
    {
      stage: "symbiosis_establishment",
      duration_days_min: 21,
      duration_days_max: 30,
      description: "Continuous flowering. AMF supplying nutrients for heavy fruit set.",
      key_actions: ["Maintain P restriction", "EC 1.8–2.0", "PPFD 240–260 µmol"],
    },
    {
      stage: "stress_induction",
      duration_days_min: 14,
      duration_days_max: 21,
      description: "PAW stress 2 weeks before harvest flush.",
      key_actions: ["PAW 20–40 µM, 2×/week, 5–8%", "Log applications", "Humidity 55–65%"],
    },
    {
      stage: "harvest_ready",
      duration_days_min: 1,
      duration_days_max: 14,
      description: "Continuous harvest. Pick when fully colored.",
      key_actions: ["Stop PAW 48h before batch harvest", "Generate Quality Certificate", "Stagger harvests every 10–14 days"],
    },
  ],
  color: "#16a34a",
  icon: "🌿",
  commercial_note:
    "Strong South Asian pharmaceutical demand. Ayurvedic extract buyers pay $80–250/kg for verified-potency Kanthari. Mass volume advantage — highest fruit yield per m² of all 4 QBM crops.",
}

// ═══════════════════════════════════════
// EXCLUDED Crops (biologically incompatible)
// ═══════════════════════════════════════

export const EXCLUDED_CROPS: ExcludedCrop[] = [
  {
    id: "saffron",
    name: "Saffron",
    scientific_name: "Crocus sativus",
    approved: false,
    reason: "Non-viable economics due to 11-month dormancy cycle",
    biological_incompatibility:
      "Crocus sativus requires an 11-month dormancy period (corm storage at low temperatures) between flowering seasons. The corm storage phase requires expensive refrigeration ($0.50–1.20/corm/month) and generates zero revenue for most of the year. The 3-week flowering window with 3 stigmas per flower makes large-scale production in a modular grow bag system economically unviable. Additionally, Crocus is a corm-forming geophyte that does not form productive AMF symbiosis — removing the core value proposition of the QBM network.",
  },
  {
    id: "wasabi",
    name: "Wasabi",
    scientific_name: "Wasabia japonica",
    approved: false,
    reason: "Defense chemicals actively destroy the AMF fungal network",
    biological_incompatibility:
      "Wasabi (and all Brassicaceae including cabbage, broccoli, mustard) produces glucosinolates and isothiocyanates as root exudates. Isothiocyanate hydrolysis products are potent antifungal compounds — they are literally the plant's evolved defense against soil fungi. Studies confirm complete inhibition and death of Glomus and Rhizophagus irregularis colonies within 3–7 days of Brassica root contact. A single Wasabi plant in the CMN network would collapse the entire fungal highway connecting all 6 bags.",
  },
  {
    id: "brassicas",
    name: "Brassicas (Broccoli, Cabbage, Mustard, Kale)",
    scientific_name: "Brassica spp.",
    approved: false,
    reason: "Root exudates kill AMF network — same mechanism as Wasabi",
    biological_incompatibility:
      "All Brassicaceae members produce AMF-lethal glucosinolate/isothiocyanate compounds. In a connected CMN network where all bags share a mycorrhizal highway, introducing any Brassica would poison the entire network, destroying the foundational innovation of QBM-HydroNet. Additionally, Brassicas are commodity crops with no pharmaceutical bioactive value relevant to this system.",
  },
]

// ═══════════════════════════════════════
// Registry
// ═══════════════════════════════════════

export const QBM_CROPS: QBMCrop[] = [TURMERIC, BHUT_JOLOKIA, AJI_CHARAPITA, KANTHARI]

export const ALL_CROP_IDS = QBM_CROPS.map((c) => c.id)

export function getCropById(id: string): QBMCrop | undefined {
  return QBM_CROPS.find((c) => c.id === id)
}

export function getCropByDeviceAssignment(cropName: string): QBMCrop | undefined {
  return QBM_CROPS.find(
    (c) => c.name.toLowerCase().includes(cropName.toLowerCase()) || c.id.includes(cropName.toLowerCase()),
  )
}

/**
 * Returns the AMF symbiosis status based on current Phosphorus ppm reading.
 */
export function getAMFStatus(
  phosphorus_ppm: number,
): { status: "active" | "suppressed" | "deficient" | "unknown"; label: string; color: string } {
  if (phosphorus_ppm >= 40 && phosphorus_ppm <= 60) {
    return { status: "active", label: "AMF ACTIVE", color: "green" }
  } else if (phosphorus_ppm > 60 && phosphorus_ppm <= 80) {
    return { status: "suppressed", label: "AMF AT RISK", color: "yellow" }
  } else if (phosphorus_ppm > 80) {
    return { status: "suppressed", label: "AMF SUPPRESSED — Reduce P", color: "red" }
  } else if (phosphorus_ppm < 30) {
    return { status: "deficient", label: "P DEFICIENT", color: "orange" }
  }
  return { status: "unknown", label: "P Unknown", color: "gray" }
}

/**
 * Calculate Growing Degree Days for a crop.
 * GDD = (Max_Temp + Min_Temp) / 2 - Base_Temp
 * Accumulated daily. Returns total GDD and % progress toward target.
 */
export function calculateGDD(
  temperatureReadings: number[],
  crop: QBMCrop,
): { accumulated_gdd: number; progress_percent: number; estimated_days_remaining: number } {
  const baseTemp = crop.gdd_profile.base_temp_c
  const targetGDD = crop.gdd_profile.target_gdd_max

  let accumulated = 0
  for (const temp of temperatureReadings) {
    const daily = Math.max(0, temp - baseTemp)
    accumulated += daily
  }

  const progress = Math.min(100, (accumulated / targetGDD) * 100)
  const remaining = targetGDD - accumulated
  const avgDailyGDD = accumulated / Math.max(1, temperatureReadings.length)
  const daysRemaining = avgDailyGDD > 0 ? Math.ceil(remaining / avgDailyGDD) : 999

  return {
    accumulated_gdd: Math.round(accumulated),
    progress_percent: Math.round(progress),
    estimated_days_remaining: Math.max(0, daysRemaining),
  }
}
