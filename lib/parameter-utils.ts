/**
 * Utility functions for reading and managing system parameters
 */

interface ParameterRange {
  min: number
  max: number
}

interface SystemParameters {
  temperature: ParameterRange
  humidity: ParameterRange
  pH: ParameterRange
  ec: ParameterRange
  ppm: ParameterRange
  nitrogen: ParameterRange
  phosphorus: ParameterRange
  potassium: ParameterRange
  calcium: ParameterRange
  magnesium: ParameterRange
  iron: ParameterRange
}

// Default parameters (fallback)
const defaultParameters: SystemParameters = {
  temperature: { min: 20, max: 28 },
  humidity: { min: 60, max: 80 },
  pH: { min: 5.5, max: 6.8 },
  ec: { min: 1.2, max: 2.4 },
  ppm: { min: 800, max: 1400 },
  nitrogen: { min: 150, max: 200 },
  phosphorus: { min: 30, max: 50 },
  potassium: { min: 200, max: 300 },
  calcium: { min: 150, max: 200 },
  magnesium: { min: 50, max: 75 },
  iron: { min: 2, max: 5 },
}

/**
 * Get parameters for a specific device, with fallback to global and default parameters
 */
export function getDeviceParameters(deviceId: string): SystemParameters {
  try {
    // Try device-specific settings first
    const deviceParams = localStorage.getItem(`hydro-nexus-parameters-${deviceId}`)
    if (deviceParams) {
      const parsed = JSON.parse(deviceParams)
      return {
        temperature: parsed.temperature || defaultParameters.temperature,
        humidity: parsed.humidity || defaultParameters.humidity,
        pH: parsed.pH || defaultParameters.pH,
        ec: parsed.ec || defaultParameters.ec,
        ppm: parsed.ppm || defaultParameters.ppm,
        nitrogen: parsed.nitrogen || defaultParameters.nitrogen,
        phosphorus: parsed.phosphorus || defaultParameters.phosphorus,
        potassium: parsed.potassium || defaultParameters.potassium,
        calcium: parsed.calcium || defaultParameters.calcium,
        magnesium: parsed.magnesium || defaultParameters.magnesium,
        iron: parsed.iron || defaultParameters.iron,
      }
    }
    
    // Try global settings
    const globalParams = localStorage.getItem('hydro-nexus-parameters')
    if (globalParams) {
      const parsed = JSON.parse(globalParams)
      return {
        temperature: parsed.temperature || defaultParameters.temperature,
        humidity: parsed.humidity || defaultParameters.humidity,
        pH: parsed.pH || defaultParameters.pH,
        ec: parsed.ec || defaultParameters.ec,
        ppm: parsed.ppm || defaultParameters.ppm,
        nitrogen: parsed.nitrogen || defaultParameters.nitrogen,
        phosphorus: parsed.phosphorus || defaultParameters.phosphorus,
        potassium: parsed.potassium || defaultParameters.potassium,
        calcium: parsed.calcium || defaultParameters.calcium,
        magnesium: parsed.magnesium || defaultParameters.magnesium,
        iron: parsed.iron || defaultParameters.iron,
      }
    }
    
    // Fall back to defaults
    return defaultParameters
  } catch (error) {
    console.error('Failed to parse device parameters:', error)
    return defaultParameters
  }
}

/**
 * Get sensor status based on current value and configured parameters
 * Warning: ±2 from configured range
 * Alert: ±2 from warning threshold (±4 from configured range)
 */
export function getSensorStatus(
  value: number,
  parameterRange: ParameterRange
): "good" | "warning" | "alert" {
  const { min, max } = parameterRange
  
  // Check if value is within normal range
  if (value >= min && value <= max) {
    return "good"
  }
  
  // Warning thresholds: ±2 from configured range
  const warningMin = min - 2
  const warningMax = max + 2
  if (value >= warningMin && value <= warningMax) {
    return "warning"
  }
  
  // Alert thresholds: ±2 from warning (±4 from configured range)
  // Everything beyond warning range is alert
  return "alert"
}

/**
 * Get status for specific sensor types with special handling
 */
export function getTemperatureStatus(temperature: number, deviceId: string): "good" | "warning" | "alert" {
  const params = getDeviceParameters(deviceId)
  return getSensorStatus(temperature, params.temperature)
}

export function getHumidityStatus(humidity: number, deviceId: string): "good" | "warning" | "alert" {
  const params = getDeviceParameters(deviceId)
  return getSensorStatus(humidity, params.humidity)
}

export function getPHStatus(ph: number, deviceId: string): "good" | "warning" | "alert" {
  const params = getDeviceParameters(deviceId)
  return getSensorStatus(ph, params.pH)
}

export function getECStatus(ec: number, deviceId: string): "good" | "warning" | "alert" {
  const params = getDeviceParameters(deviceId)
  return getSensorStatus(ec, params.ec)
}

/**
 * Special handling for moisture (simple threshold for now)
 */
export function getMoistureStatus(moisture: number): "good" | "warning" | "alert" {
  if (moisture < 50) {
    return "warning"
  }
  return "good"
}

/**
 * Special handling for water level
 */
export function getWaterLevelStatus(waterLevel: string): "good" | "warning" | "alert" {
  return waterLevel === "Below Required Level" ? "alert" : "good"
}