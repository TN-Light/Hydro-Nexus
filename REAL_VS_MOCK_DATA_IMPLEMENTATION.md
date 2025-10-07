# Real vs Mock Data Implementation Summary

## 🎯 Implementation Complete

All hardcoded data issues have been resolved with intelligent fallback system.

---

## ✅ What Was Changed

### 1. **New API Endpoint: `/api/sensors/history`**
**File**: `app/api/sensors/history/route.ts`

Fetches real time-series data from TimescaleDB hypertable:
- Queries `sensor_readings` table with time_bucket aggregation
- Parameters: `deviceId`, `hours` (1-168), `interval` (1-1440 minutes)
- Returns averaged sensor readings (temperature, pH, EC, moisture, humidity)
- Smart aggregation for efficient chart rendering

**Example Request:**
```
GET /api/sensors/history?deviceId=grow-bag-1&hours=24&interval=60
```

---

### 2. **Dashboard Charts Now Use Real Data**
**File**: `app/dashboard/page.tsx`

**Before** (Hardcoded):
```typescript
data={Array.from({ length: 24 }, (_, i) => ({
  time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
  value: 24 + Math.random() * 6 + Math.sin(i / 4) * 3, // Fake sine wave
}))}
```

**After** (Real + Fallback):
```typescript
data={getChartData('roomTemp')} // Uses real data if available
```

**New Logic:**
1. ✅ **ESP32 Connected**: Fetches real historical data from TimescaleDB
2. ⚠️ **ESP32 Disconnected**: Falls back to generated mock patterns
3. 🎭 User sees clear indicator: "📡 Live ESP32 Data" vs "🎭 Demo Mode"

---

### 3. **Smart Mock Data Detection**
**File**: `components/realtime-provider.tsx`

**New Features:**
- Tracks `isRealData` state - detects if actual ESP32 data exists
- Monitors `lastRealDataTimeRef` - switches to demo mode if >2 minutes without data
- Exposes `isRealData` to dashboard via context

**Detection Logic:**
```typescript
if (result.data && deviceKeys.length > 0) {
  // ✅ Got real data from database
  setIsRealData(true)
  lastRealDataTimeRef.current = Date.now()
} else if (Date.now() - lastRealDataTimeRef.current > 120000) {
  // ⚠️ No data for >2 minutes
  setIsRealData(false)
  console.log('No ESP32 data, switching to demo mode')
}
```

---

### 4. **Visual Data Source Indicator**
**File**: `app/dashboard/page.tsx`

Dashboard now shows clear badge:

```tsx
<Badge 
  variant={isRealData ? "default" : "secondary"}
  className={isRealData ? "bg-green-600" : "bg-amber-500"}
>
  {isRealData ? "📡 Live ESP32 Data" : "🎭 Demo Mode"}
</Badge>
```

**Colors:**
- 🟢 **Green**: Real ESP32 hardware data
- 🟠 **Amber**: Demo mode with generated mock data

---

### 5. **Mock JSON Files Documented as Legacy**
**File**: `data/README.md`

Created comprehensive documentation explaining:
- ✅ `mock-devices.json` - NOT used in production
- ✅ `mock-historical-data.json` - NOT used in production
- ✅ These can be safely deleted
- ✅ Mock data is generated programmatically when needed
- ✅ Real data flows from ESP32 → PostgreSQL → Dashboard

---

## 📊 Data Flow Architecture

### **When ESP32 is Connected:**
```
ESP32 Hardware
    ↓ (every 30s)
POST /api/sensors/ingest
    ↓
PostgreSQL sensor_readings table
    ↓ (query)
GET /api/sensors/latest  → Current values (dashboard badges)
GET /api/sensors/history → Historical charts (24h)
    ↓
Dashboard displays: 📡 Live ESP32 Data
```

### **When ESP32 is Disconnected:**
```
No hardware data
    ↓
realtime-provider.tsx detects timeout (>2 min)
    ↓
generateMockSensorData() function
    ↓
Mock data with realistic patterns
    ↓
Dashboard displays: 🎭 Demo Mode
```

---

## 🔧 Hardcoded Values Still Present (Intentional)

### **ESP32 Defaults (Sensor Fallbacks)**
**File**: `esp32-hydroponic-system.ino`
- `ec = 1.2` - When TDS sensor fails
- `soil_moisture = 70` - When moisture sensor fails
- `target_ph_min = 5.5` - Control parameter
- `target_ph_max = 6.5` - Control parameter

**Reason**: ✅ **Safety fallbacks** - prevents undefined values when sensors malfunction

### **Database Crop Thresholds**
**File**: `schema-updated.sql`
- Tomato: pH 5.5-6.5, EC 2.0-3.5, Temp 20-26°C
- Lettuce: pH 5.8-6.2, EC 0.8-1.2, Temp 15-22°C
- Basil: pH 5.5-6.5, EC 1.0-1.6, Temp 20-28°C

**Reason**: ✅ **Scientific reference values** - based on agricultural research

### **Mock Data Generator Function**
**File**: `components/realtime-provider.tsx`
- `roomTemp: 24 + Math.random() * 6` (24-30°C)
- `pH: 5.8 + Math.random() * 0.8` (5.8-6.6)
- `ec: 1.8 + Math.random() * 0.6` (1.8-2.4)

**Reason**: ✅ **Demo mode support** - allows testing without hardware

---

## 🎭 Demo Mode vs Live Mode

| Feature | Demo Mode (No ESP32) | Live Mode (ESP32 Connected) |
|---------|---------------------|----------------------------|
| **Current Values** | Generated mock (realistic patterns) | Real sensor readings from database |
| **Historical Charts** | Fallback patterns (sine waves) | Real TimescaleDB aggregated data |
| **Update Frequency** | Every 5 seconds (simulated) | Every 30 seconds (actual ESP32) |
| **Badge Color** | 🟠 Amber "Demo Mode" | 🟢 Green "Live ESP32 Data" |
| **Data Source** | `generateMockSensorData()` function | PostgreSQL `sensor_readings` table |
| **Alerts** | Generated from mock thresholds | Real alerts from actual readings |
| **Hardware Control** | Still works (ESP32 polls for commands) | Fully functional |

---

## 🚀 Benefits of New System

### **1. Production Ready**
- ✅ Uses real TimescaleDB data when available
- ✅ Automatic fallback to demo mode
- ✅ No manual switching required

### **2. Developer Friendly**
- ✅ Can develop without ESP32 hardware
- ✅ Demo mode shows realistic patterns
- ✅ Clear visual indicator of data source

### **3. User Transparent**
- ✅ Badge clearly shows data source
- ✅ Charts display real historical trends
- ✅ No confusion about data authenticity

### **4. Performance Optimized**
- ✅ TimescaleDB time_bucket for efficient aggregation
- ✅ Configurable time ranges (1-168 hours)
- ✅ Adjustable aggregation intervals (1-1440 minutes)

---

## 📝 Testing Checklist

### **With ESP32 Connected:**
1. ✅ Dashboard shows "📡 Live ESP32 Data" badge
2. ✅ Charts display real sensor history from database
3. ✅ Current values update every 30 seconds
4. ✅ Charts refresh when switching grow bags

### **Without ESP32 (Demo Mode):**
1. ✅ Dashboard shows "🎭 Demo Mode" badge after 2 minutes
2. ✅ Charts show fallback patterns (not empty)
3. ✅ Current values still display (mock data)
4. ✅ User can still test UI and controls

### **Historical Data API:**
```bash
# Test API endpoint directly
curl "http://localhost:3000/api/sensors/history?deviceId=grow-bag-1&hours=24&interval=60"

# Expected response:
{
  "success": true,
  "deviceId": "grow-bag-1",
  "hours": 24,
  "interval": 60,
  "dataPoints": 24,
  "data": [
    {
      "time": "2025-10-07T12:00:00.000Z",
      "roomTemp": 25.3,
      "pH": 6.2,
      "ec": 2.1,
      "moisture": 75,
      "humidity": 68,
      ...
    }
  ]
}
```

---

## 🎓 For Future Developers

### **To Add New Sensor Type:**
1. Add column to `sensor_readings` table
2. Update ESP32 to send new sensor data
3. Update `/api/sensors/history` query
4. Add `getChartData()` case in dashboard
5. Update `generateMockSensorData()` for demo mode

### **To Delete Mock JSON Files:**
```bash
rm data/mock-devices.json
rm data/mock-historical-data.json
```
Application will continue working - mock data is generated programmatically.

### **To Change Demo Mode Timeout:**
```typescript
// components/realtime-provider.tsx, line ~274
if (timeSinceRealData > 120000) { // Change 120000 (2 minutes) to desired timeout
  setIsRealData(false)
}
```

---

## 🏆 Summary

| Item | Status | Notes |
|------|--------|-------|
| ✅ Real historical data from TimescaleDB | **DONE** | `/api/sensors/history` endpoint |
| ✅ Dashboard charts use real data | **DONE** | `getChartData()` with smart fallback |
| ✅ Mock data auto-detection | **DONE** | 2-minute timeout detection |
| ✅ Visual mode indicator | **DONE** | Badge shows Live/Demo |
| ✅ Mock JSON files documented | **DONE** | `data/README.md` explains legacy status |
| ✅ ESP32 defaults kept | **DONE** | Safety fallbacks for sensor failures |
| ✅ Demo mode functional | **DONE** | Generated mock patterns work |

**All requirements met!** 🎉

The system now intelligently switches between real ESP32 data and demo mode, with clear visual indicators and proper fallbacks at every level.

---

Last Updated: October 8, 2025  
Implementation Status: ✅ Complete
