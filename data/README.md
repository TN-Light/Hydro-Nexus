# Mock Data Files - Legacy/Reference Only

⚠️ **These files are NOT used in production!**

## Purpose

These JSON files contain hardcoded mock sensor data that was used during early development and testing phases. They serve as **reference examples** only.

## Files

### `mock-devices.json`
- **Status**: Not used in production
- **Purpose**: Example device metadata structure
- **Content**: Static device information (battery, RSSI, health scores)
- **Production Alternative**: Real device data from `devices` table in PostgreSQL

### `mock-historical-data.json`
- **Status**: Not used in production
- **Purpose**: Example historical sensor readings structure
- **Content**: Hardcoded hourly sensor readings with fake patterns
- **Production Alternative**: Real time-series data from `sensor_readings` hypertable in TimescaleDB

---

## Production Data Flow

The actual application uses **real data** from these sources:

### 1. **Live Sensor Data**
- **Source**: ESP32 devices → `/api/sensors/ingest` → PostgreSQL `sensor_readings` table
- **Frequency**: Every 30 seconds from ESP32
- **Used by**: Dashboard real-time displays, alerts, current values

### 2. **Historical Chart Data**
- **Source**: TimescaleDB hypertable → `/api/sensors/history` endpoint
- **Aggregation**: Time-bucketed averages over 24 hours
- **Used by**: Dashboard sensor charts (pH, temperature, EC, moisture, humidity)

### 3. **Demo Mode Fallback**
- **When**: ESP32 not connected or database empty
- **Source**: `generateMockSensorData()` function in `components/realtime-provider.tsx`
- **Purpose**: Allows testing/demos without physical hardware
- **Indicator**: Dashboard shows "🎭 Demo Mode" badge

---

## Data Source Detection

The system automatically detects whether to use real or mock data:

```typescript
// components/realtime-provider.tsx
if (result.data && deviceKeys.length > 0) {
  // ✅ Real ESP32 data available
  setIsRealData(true)
  setSensorData(result.data)
} else {
  // ⚠️ No ESP32 data, use mock fallback
  setIsRealData(false)
  setSensorData(generateMockSensorData())
}
```

Users see a clear badge on the dashboard:
- **📡 Live ESP32 Data** = Real hardware data
- **🎭 Demo Mode** = Generated mock data for demonstration

---

## Can I Delete These Files?

**Yes!** These files can be safely deleted without affecting the application. They exist for:
1. Reference during development
2. Understanding data structure examples
3. Historical documentation

The application will continue to work because:
- ✅ Real data comes from PostgreSQL/TimescaleDB
- ✅ Demo fallback is generated programmatically
- ✅ These JSON files are never imported or read by the app

---

## Migration Guide

If you're maintaining this codebase and want to clean up:

1. **Keep**: `components/realtime-provider.tsx` (contains `generateMockSensorData()` for demo mode)
2. **Keep**: `/api/sensors/history` endpoint (fetches real TimescaleDB data)
3. **Delete**: `data/mock-devices.json` (not used)
4. **Delete**: `data/mock-historical-data.json` (not used)

The demo mode fallback will still work because it's generated dynamically in code, not read from files.

---

Last Updated: October 8, 2025
