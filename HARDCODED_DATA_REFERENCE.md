# Hardcoded Data Quick Reference

## 🔍 Current Status of All Hardcoded Values

### ✅ **KEPT (Production Use)**

#### 1. **ESP32 Safety Fallbacks**
**Location**: `esp32-hydroponic-system.ino` lines 322-348
```cpp
currentData.tds_ppm = 150.0;    // When TDS sensor fails
currentData.ec = 1.2;            // When EC sensor fails
currentData.soil_moisture = 70;  // When moisture sensor fails
```
**Purpose**: Prevent undefined values when sensors malfunction  
**Action**: ✅ Keep - Critical safety feature

#### 2. **Crop Threshold Parameters**
**Location**: `schema-updated.sql` lines 241-244
```sql
('Tomato', 5.5, 6.5, 2.0, 3.5, 20.0, 26.0, 60, 80, 60, 80, ...)
('Lettuce', 5.8, 6.2, 0.8, 1.2, 15.0, 22.0, 50, 70, 60, 75, ...)
```
**Purpose**: Scientific reference values for plant growth  
**Action**: ✅ Keep - Based on agricultural research

#### 3. **Demo Mode Generator**
**Location**: `components/realtime-provider.tsx` lines 141-195
```typescript
roomTemp: 24 + Math.random() * 6  // 24-30°C
pH: 5.8 + Math.random() * 0.8     // 5.8-6.6
ec: 1.8 + Math.random() * 0.6     // 1.8-2.4
```
**Purpose**: Generate realistic mock data when ESP32 disconnected  
**Action**: ✅ Keep - Essential for demo/testing

---

### ❌ **REMOVED (Now Using Real Data)**

#### 1. **Dashboard Chart Patterns**
**Location**: `app/dashboard/page.tsx`
```typescript
// OLD (REMOVED):
value: 24 + Math.random() * 6 + Math.sin(i / 4) * 3

// NEW:
data={getChartData('roomTemp')} // Uses real TimescaleDB data
```
**Status**: ✅ Fixed - Now fetches from `/api/sensors/history`

#### 2. **Static Historical Data**
**Location**: `data/mock-historical-data.json`
```json
{ "roomTemp": 25.2, "pH": 6.2, "ec": 1.8 }
```
**Status**: ✅ Documented - File not used, can delete

---

## 🎭 How Demo Mode Works

### **Trigger Conditions**
1. ESP32 not connected
2. Database empty (no sensor_readings)
3. API timeout (no data for >2 minutes)

### **Automatic Behavior**
```
No ESP32 Data Detected
        ↓
isRealData = false
        ↓
Badge shows: 🎭 Demo Mode
        ↓
generateMockSensorData() activates
        ↓
Charts use fallback patterns
```

### **Return to Live Mode**
```
ESP32 Sends Data
        ↓
Database receives data
        ↓
/api/sensors/latest returns data
        ↓
isRealData = true
        ↓
Badge shows: 📡 Live ESP32 Data
        ↓
Charts use real TimescaleDB history
```

---

## 🔧 Configuration

### **Change Demo Mode Timeout**
```typescript
// components/realtime-provider.tsx line ~274
if (timeSinceRealData > 120000) { // 2 minutes = 120000ms
  setIsRealData(false)
}
```

### **Adjust Mock Data Ranges**
```typescript
// components/realtime-provider.tsx lines 141-195
const baseValues = {
  roomTemp: 24 + Math.random() * 6,    // Change: 24 (min) and 6 (range)
  pH: 5.8 + Math.random() * 0.8,       // Change: 5.8 (min) and 0.8 (range)
  ec: 1.8 + Math.random() * 0.6,       // Change: 1.8 (min) and 0.6 (range)
  moisture: 60 + Math.random() * 30,   // Change: 60 (min) and 30 (range)
  humidity: 65 + Math.random() * 20,   // Change: 65 (min) and 20 (range)
}
```

### **Change Historical Data Window**
```typescript
// app/dashboard/page.tsx line ~57
const response = await fetch(
  `/api/sensors/history?deviceId=${selectedGrowBag}&hours=24&interval=60`
  // Change: hours (1-168), interval (1-1440 minutes)
)
```

---

## 📊 Data Sources Summary

| Component | Live Mode (ESP32 Connected) | Demo Mode (No ESP32) |
|-----------|----------------------------|---------------------|
| **Current Values** | PostgreSQL `sensor_readings` | `generateMockSensorData()` |
| **Chart History** | TimescaleDB aggregation | Fallback patterns |
| **Water Level** | ESP32 sensor calculation | Mock depletion simulation |
| **Alerts** | Real threshold violations | Mock threshold checks |
| **Badge** | 📡 Live ESP32 Data (green) | 🎭 Demo Mode (amber) |

---

## 🎯 Quick Decision Guide

### **Should I keep this hardcoded value?**

| Value Type | Keep? | Reason |
|------------|-------|---------|
| ESP32 sensor fallbacks | ✅ YES | Safety when sensors fail |
| Crop thresholds in DB | ✅ YES | Scientific reference data |
| Mock generator function | ✅ YES | Demo mode essential |
| Static JSON files | ❌ NO | Not used, can delete |
| Dashboard chart patterns | ❌ NO | Now using real data |
| Fixed test data | ❌ NO | Use real or generated |

---

## 🚨 Common Questions

**Q: Why does dashboard show demo mode when ESP32 is connected?**  
A: Wait 2 minutes for timeout reset, or ESP32 hasn't sent data yet (30s interval)

**Q: Can I delete mock-devices.json and mock-historical-data.json?**  
A: Yes! They're not used. See `data/README.md` for details.

**Q: How do I know if ESP32 is really sending data?**  
A: Check dashboard badge. Green "📡 Live ESP32 Data" = real hardware.

**Q: Why do charts show patterns instead of real data?**  
A: Either no historical data in database yet, or API failed. Check `/api/sensors/history` endpoint.

**Q: Are the hardcoded ESP32 defaults (70%, 1.2 mS/cm) used in production?**  
A: Only when specific sensors fail. If all sensors work, real values are used.

---

Last Updated: October 8, 2025
