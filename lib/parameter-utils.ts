/**
 * QBM-HydroNet Parameter Utilities
 * Sensor status evaluation, AMF symbiosis detection, PAW protocol tracking,
 * and GDD calculation — all aligned to QBM-HydroNet crop science.
 */

import { QBM_CROPS } from "@/lib/crop-database"

// 
// Types
// 

export interface ParameterRange {
  min: number
  max: number
}

export interface QBMSystemParameters {
  temperature: ParameterRange
  humidity: ParameterRange
  pH: ParameterRange
  ec: ParameterRange
  // QBM-critical: Forced symbiosis (ALWAYS 40-60 ppm)
  phosphorus: ParameterRange
  substrate_moisture: ParameterRange
  ppm: ParameterRange
  nitrogen: ParameterRange
  potassium: ParameterRange
  calcium: ParameterRange
  magnesium: ParameterRange
  iron: ParameterRange
}

export type SensorStatus = "good" | "warning" | "alert"

export type AMFStatusType = {
  status: "active" | "suppressed" | "deficient" | "unknown"
  label: string
  description: string
  color: "green" | "yellow" | "orange" | "red" | "gray"
  icon: string
}

// 
// QBM Default Parameters (Turmeric-based)
// 

export const QBM_DEFAULT_PARAMETERS: QBMSystemParameters = {
  temperature: { min: 24, max: 30 },
  humidity: { min: 65, max: 80 },
  pH: { min: 5.5, max: 6.5 },
  ec: { min: 1.8, max: 2.4 },
  phosphorus: { min: 40, max: 60 },
  substrate_moisture: { min: 60, max: 80 },
  ppm: { min: 800, max: 1400 },
  nitrogen: { min: 120, max: 180 },
  potassium: { min: 200, max: 300 },
  calcium: { min: 150, max: 200 },
  magnesium: { min: 40, max: 70 },
  iron: { min: 2, max: 5 },
}

export function getQBMCropParameters(cropId: string): QBMSystemParameters {
  const crop = QBM_CROPS.find((c) => c.id === cropId)
  if (!crop) return QBM_DEFAULT_PARAMETERS
  const p = crop.parameters
  return {
    temperature: { min: p.temperature.min, max: p.temperature.max },
    humidity: { min: p.humidity_vegetative.min, max: p.humidity_vegetative.max },
    pH: { min: p.pH.min, max: p.pH.max },
    ec: { min: p.ec.min, max: p.ec.max },
    phosphorus: { min: p.phosphorus_ppm.min, max: p.phosphorus_ppm.max },
    substrate_moisture: { min: p.substrate_moisture.min, max: p.substrate_moisture.max },
    ppm: { min: 700, max: 1400 },
    nitrogen: { min: p.nitrogen_ppm.min, max: p.nitrogen_ppm.max },
    potassium: { min: p.potassium_ppm.min, max: p.potassium_ppm.max },
    calcium: { min: p.calcium_ppm.min, max: p.calcium_ppm.max },
    magnesium: { min: p.magnesium_ppm.min, max: p.magnesium_ppm.max },
    iron: { min: 2, max: 5 },
  }
}

// 
// localStorage helpers
// 

const PARAM_KEY_PREFIX = "qbm-hydronet-parameters"

export function getDeviceParameters(deviceId: string): QBMSystemParameters {
  try {
    const deviceParams = localStorage.getItem(`${PARAM_KEY_PREFIX}-${deviceId}`)
    if (deviceParams) return mergeWithDefaults(JSON.parse(deviceParams))
    const globalParams = localStorage.getItem(PARAM_KEY_PREFIX)
    if (globalParams) return mergeWithDefaults(JSON.parse(globalParams))
    return QBM_DEFAULT_PARAMETERS
  } catch {
    return QBM_DEFAULT_PARAMETERS
  }
}

function mergeWithDefaults(parsed: Partial<QBMSystemParameters>): QBMSystemParameters {
  return {
    temperature: parsed.temperature || QBM_DEFAULT_PARAMETERS.temperature,
    humidity: parsed.humidity || QBM_DEFAULT_PARAMETERS.humidity,
    pH: parsed.pH || QBM_DEFAULT_PARAMETERS.pH,
    ec: parsed.ec || QBM_DEFAULT_PARAMETERS.ec,
    phosphorus: parsed.phosphorus || QBM_DEFAULT_PARAMETERS.phosphorus,
    substrate_moisture: parsed.substrate_moisture || QBM_DEFAULT_PARAMETERS.substrate_moisture,
    ppm: parsed.ppm || QBM_DEFAULT_PARAMETERS.ppm,
    nitrogen: parsed.nitrogen || QBM_DEFAULT_PARAMETERS.nitrogen,
    potassium: parsed.potassium || QBM_DEFAULT_PARAMETERS.potassium,
    calcium: parsed.calcium || QBM_DEFAULT_PARAMETERS.calcium,
    magnesium: parsed.magnesium || QBM_DEFAULT_PARAMETERS.magnesium,
    iron: parsed.iron || QBM_DEFAULT_PARAMETERS.iron,
  }
}

export function saveDeviceParameters(deviceId: string, params: QBMSystemParameters): void {
  try {
    localStorage.setItem(`${PARAM_KEY_PREFIX}-${deviceId}`, JSON.stringify(params))
  } catch (e) {
    console.error("Failed to save device parameters:", e)
  }
}

export function saveGlobalParameters(params: QBMSystemParameters): void {
  try {
    localStorage.setItem(PARAM_KEY_PREFIX, JSON.stringify(params))
  } catch (e) {
    console.error("Failed to save global parameters:", e)
  }
}

// 
// Generic Sensor Status
// 

export function getSensorStatus(value: number, range: ParameterRange): SensorStatus {
  const { min, max } = range
  if (value >= min && value <= max) return "good"
  if (value >= min - 2 && value <= max + 2) return "warning"
  return "alert"
}

export function getTemperatureStatus(temperature: number, deviceId: string): SensorStatus {
  return getSensorStatus(temperature, getDeviceParameters(deviceId).temperature)
}

export function getHumidityStatus(humidity: number, deviceId: string): SensorStatus {
  return getSensorStatus(humidity, getDeviceParameters(deviceId).humidity)
}

export function getPHStatus(ph: number, deviceId: string): SensorStatus {
  return getSensorStatus(ph, getDeviceParameters(deviceId).pH)
}

export function getECStatus(ec: number, deviceId: string): SensorStatus {
  return getSensorStatus(ec, getDeviceParameters(deviceId).ec)
}

export function getMoistureStatus(moisture: number, deviceId?: string): SensorStatus {
  const range = deviceId
    ? getDeviceParameters(deviceId).substrate_moisture
    : QBM_DEFAULT_PARAMETERS.substrate_moisture
  if (moisture < 50) return "alert"
  return getSensorStatus(moisture, range)
}

export function getWaterLevelStatus(waterLevel: string): SensorStatus {
  return waterLevel === "Below Required Level" ? "alert" : "good"
}

// 
// QBM: Phosphorus Status
// 40-60 ppm = AMF ACTIVE (forced symbiosis)
// >80 ppm = AMF SUPPRESSED (reduce immediately)
// <30 ppm = P DEFICIENT
// 

export function getPhosphorusStatus(phosphorus_ppm: number): SensorStatus {
  if (phosphorus_ppm >= 40 && phosphorus_ppm <= 60) return "good"
  if ((phosphorus_ppm > 60 && phosphorus_ppm <= 80) || (phosphorus_ppm >= 30 && phosphorus_ppm < 40)) return "warning"
  return "alert"
}

export function getAMFSymbiosisStatus(phosphorus_ppm: number | null | undefined): AMFStatusType {
  if (phosphorus_ppm === null || phosphorus_ppm === undefined) {
    return {
      status: "unknown",
      label: "P not recorded",
      description: "Log a manual phosphorus measurement to assess AMF symbiosis status.",
      color: "gray",
      icon: "?",
    }
  }
  if (phosphorus_ppm >= 40 && phosphorus_ppm <= 60) {
    return {
      status: "active",
      label: "AMF ACTIVE",
      description: `P = ${phosphorus_ppm} ppm — within forced-symbiosis range. AMF network is colonizing roots.`,
      color: "green",
      icon: "AMF OK",
    }
  }
  if (phosphorus_ppm > 60 && phosphorus_ppm <= 80) {
    return {
      status: "suppressed",
      label: "AMF AT RISK",
      description: `P = ${phosphorus_ppm} ppm — above target. Reduce P to 40-60 ppm immediately.`,
      color: "yellow",
      icon: "WARN",
    }
  }
  if (phosphorus_ppm > 80) {
    return {
      status: "suppressed",
      label: "AMF SUPPRESSED",
      description: `P = ${phosphorus_ppm} ppm — too high. Fungal network dormant. Reduce P to 40-60 ppm.`,
      color: "red",
      icon: "OFF",
    }
  }
  if (phosphorus_ppm < 30) {
    return {
      status: "deficient",
      label: "P DEFICIENT",
      description: `P = ${phosphorus_ppm} ppm — too low. Raise P to 40-60 ppm.`,
      color: "orange",
      icon: "LOW",
    }
  }
  return {
    status: "active",
    label: "AMF ACTIVE (Low End)",
    description: `P = ${phosphorus_ppm} ppm — near lower boundary. Monitor.`,
    color: "green",
    icon: "AMF OK",
  }
}

// 
// QBM: PAW Protocol Status
// 

export interface PAWProtocolConfig {
  isActive: boolean
  h2o2ConcentrationUm: number | null
  applicationsThisWeek: number
  daysUntilHarvest: number | null
}

export interface PAWStressStatus {
  isActive: boolean
  isInWindow: boolean
  label: string
  color: "green" | "yellow" | "gray"
  description: string
}

export function getPAWStressStatus(config: PAWProtocolConfig): PAWStressStatus {
  const { isActive, daysUntilHarvest } = config
  if (daysUntilHarvest === null) {
    return {
      isActive: false, isInWindow: false, label: "Set harvest date",
      color: "gray", description: "Set an expected harvest date to enable PAW protocol scheduling.",
    }
  }
  if (daysUntilHarvest <= 0) {
    return {
      isActive: false, isInWindow: false, label: "HARVEST NOW",
      color: "green", description: "GDD target reached. Stop PAW 48h before harvest. Generate Quality Certificate.",
    }
  }
  const weeksUntilHarvest = daysUntilHarvest / 7
  if (weeksUntilHarvest <= 4) {
    if (isActive) {
      return {
        isActive: true, isInWindow: true, label: "PAW ACTIVE",
        color: "green", description: `PAW stress running. ${daysUntilHarvest} days to harvest. Apply 20-50 uM H2O2 twice this week at 5-10% irrigation volume.`,
      }
    }
    return {
      isActive: false, isInWindow: true, label: "START PAW NOW",
      color: "yellow", description: `${daysUntilHarvest} days to harvest — in PAW window. Begin Plasma-Activated Water protocol.`,
    }
  }
  const weeksAway = Math.round(weeksUntilHarvest - 4)
  return {
    isActive: false, isInWindow: false, label: `PAW in ${weeksAway} weeks`,
    color: "gray", description: `${daysUntilHarvest} days to harvest. PAW activates 4 weeks before harvest.`,
  }
}

// 
// QBM: Bioactive Index
// 

export interface BioactiveIndexInput {
  gddProgressPercent: number
  pawApplicationsCount: number
  pawApplicationsTarget: number
  pCompliantDays: number
  totalCycleDays: number
}

export function calculateBioactiveIndex(input: BioactiveIndexInput): number {
  const { gddProgressPercent, pawApplicationsCount, pawApplicationsTarget, pCompliantDays, totalCycleDays } = input
  const gddScore = Math.min(100, gddProgressPercent) * 0.40
  const pawScore = pawApplicationsTarget > 0
    ? Math.min(100, (pawApplicationsCount / pawApplicationsTarget) * 100) * 0.35
    : 0
  const pScore = totalCycleDays > 0
    ? Math.min(100, (pCompliantDays / totalCycleDays) * 100) * 0.25
    : 0
  return Math.round(gddScore + pawScore + pScore)
}

export function getBioactiveIndexStatus(
  index: number,
  bioactiveType: "curcumin" | "capsaicin",
): { label: string; color: string; estimate: string } {
  if (index < 20) return { label: "Very Low", color: "gray", estimate: bioactiveType === "curcumin" ? "<1% DW" : "<50k SHU" }
  if (index < 40) return { label: "Building", color: "yellow", estimate: bioactiveType === "curcumin" ? "~2-3% DW" : "~100-300k SHU" }
  if (index < 65) return { label: "Moderate", color: "orange", estimate: bioactiveType === "curcumin" ? "~3-4% DW" : "~300-600k SHU" }
  if (index < 85) return { label: "High", color: "green", estimate: bioactiveType === "curcumin" ? "~4-5% DW" : "~600k-1M SHU" }
  return { label: "Pharmaceutical Grade", color: "green", estimate: bioactiveType === "curcumin" ? ">=5% DW" : ">1M SHU" }
}

// 
// GDD Helpers
// 

export function computeDailyGDD(maxTemp: number, minTemp: number, baseTemp = 10): number {
  return Math.max(0, (maxTemp + minTemp) / 2 - baseTemp)
}

export function computeGDDProgress(
  accumulatedGDD: number,
  targetGDDMin: number,
  targetGDDMax: number,
): { progressPercent: number; isInHarvestWindow: boolean; isPastPeak: boolean; label: string } {
  const progressPercent = Math.min(100, Math.round((accumulatedGDD / targetGDDMax) * 100))
  const isInHarvestWindow = accumulatedGDD >= targetGDDMin
  const isPastPeak = accumulatedGDD > targetGDDMax * 1.1
  let label = `${accumulatedGDD.toFixed(0)} GDD (${progressPercent}%)`
  if (isPastPeak) label += " — Past peak, harvest ASAP"
  else if (isInHarvestWindow) label += " — HARVEST WINDOW"
  return { progressPercent, isInHarvestWindow, isPastPeak, label }
}