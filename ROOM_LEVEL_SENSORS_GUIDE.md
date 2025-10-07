# 🏢 Room-Level Sensor Architecture
## Hydro Nexus - Unified Sensor Model

### Date: October 6, 2025

---

## 📋 CONCEPT

**Problem**: Currently, each grow bag stores ALL sensors (temp, humidity, pH, EC, water level, moisture) independently, even though **room conditions are the same for all bags**.

**Solution**: Separate **room-level sensors** (shared) from **bag-level sensors** (individual).

---

## 🏗️ NEW ARCHITECTURE

### Room-Level Sensors (SHARED by all bags):
- ✅ Room Temperature
- ✅ Humidity  
- ✅ pH Level
- ✅ EC (Electrical Conductivity)
- ✅ Water Level Status

### Bag-Level Sensors (INDIVIDUAL per bag):
- ✅ Substrate Moisture (0-100%)

---

## 📊 DATABASE CHANGES

### Before (OLD):
```
sensor_readings table:
├── device_id (grow-bag-1, grow-bag-2, ...)
├── room_temp ❌ DUPLICATED
├── humidity ❌ DUPLICATED
├── ph ❌ DUPLICATED
├── ec ❌ DUPLICATED
├── water_level_status ❌ DUPLICATED
└── substrate_moisture ✅ UNIQUE
```

**Problem**: 6 bags × 5 duplicated fields = 30 redundant values per reading!

### After (NEW):
```
room_sensors table:
├── room_id (main-room)
├── room_temp ✅ SHARED
├── humidity ✅ SHARED
├── ph ✅ SHARED
├── ec ✅ SHARED
└── water_level_status ✅ SHARED

sensor_readings table:
├── device_id (grow-bag-1, grow-bag-2, ...)
├── substrate_moisture ✅ BAG-SPECIFIC
└── room_id → links to room_sensors
```

**Benefits**: 1 room reading + 6 moisture readings = Much cleaner!

---

## 🔄 API RESPONSE CHANGES

### Before (OLD):
```json
{
  "success": true,
  "data": {
    "grow-bag-1": {
      "roomTemp": 22.5,
      "humidity": 65,
      "pH": 6.2,
      "ec": 1.8,
      "moisture": 75,
      "waterLevel": "Adequate"
    },
    "grow-bag-2": {
      "roomTemp": 22.5,  ← Same as bag 1!
      "humidity": 65,    ← Same as bag 1!
      "pH": 6.2,         ← Same as bag 1!
      "ec": 1.8,         ← Same as bag 1!
      "moisture": 72,    ← Different!
      "waterLevel": "Adequate"
    }
    // ... repeated for all 6 bags
  }
}
```

### After (NEW):
```json
{
  "success": true,
  "room": {
    "roomId": "main-room",
    "roomTemp": 22.5,
    "humidity": 65,
    "pH": 6.2,
    "ec": 1.8,
    "waterLevel": "Adequate",
    "timestamp": "2025-10-06T10:30:00Z"
  },
  "bags": {
    "grow-bag-1": {
      "deviceId": "grow-bag-1",
      "moisture": 75,
      "moistureTimestamp": "2025-10-06T10:30:05Z"
    },
    "grow-bag-2": {
      "deviceId": "grow-bag-2",
      "moisture": 72,
      "moistureTimestamp": "2025-10-06T10:30:05Z"
    }
    // ... all bags
  }
}
```

**Much cleaner!** Room conditions shown ONCE, then individual moisture levels.

---

---

## 📂 FILES MODIFIED

### Database:
- ✅ `migration-room-level-sensors.sql` - NEW TABLE + FUNCTIONS
- ✅ `lib/database.ts` - NEW HELPER FUNCTIONS

### API:
- ✅ `app/api/sensors/latest/route.ts` - NEW RESPONSE FORMAT

### Frontend:
- ✅ `components/realtime-provider.tsx` - UPDATED FOR NEW FORMAT
- ⏳ Dashboard sensor cards (optional optimization)
- ⏳ Individual bag detail pages (optional)
- ⏳ Analytics charts (optional)

---

## 🚀 MIGRATION STEPS

### Step 1: Run Database Migration
```bash
# Connect to your PostgreSQL/TimescaleDB
psql -U your_user -d hydro_nexus

# Run migration
\i migration-room-level-sensors.sql
```

### Step 2: Verify Migration
```sql
-- Check room_sensors table
SELECT * FROM room_sensors ORDER BY timestamp DESC LIMIT 5;

-- Check new function
SELECT * FROM get_latest_sensor_readings_v2();

-- Verify data structure
SELECT 
    room_id, 
    room_temp, 
    humidity,
    COUNT(*) as reading_count 
FROM room_sensors 
GROUP BY room_id, room_temp, humidity;
```

### Step 3: Test API
```bash
# Start/restart Next.js
npm run dev

# Test endpoint
curl http://localhost:3000/api/sensors/latest
```

### Step 4: Test Dashboard
```
1. Open browser → http://localhost:3000/dashboard
2. Verify room conditions display correctly
3. Check individual bag moisture levels
4. Open console (F12) to verify API response format
```

---

## 🧪 EXAMPLE DATA

### Insert Test Data:
```sql
-- Insert room sensor reading
SELECT insert_room_sensor_reading(
    'main-room',  -- room_id
    22.5,         -- temperature
    65,           -- humidity
    6.2,          -- pH
    1.8,          -- EC
    'Adequate'    -- water level
);

-- Insert bag moisture readings
SELECT insert_bag_moisture_reading('grow-bag-1', 75);
SELECT insert_bag_moisture_reading('grow-bag-2', 72);
SELECT insert_bag_moisture_reading('grow-bag-3', 78);
SELECT insert_bag_moisture_reading('grow-bag-4', 70);
SELECT insert_bag_moisture_reading('grow-bag-5', 76);
SELECT insert_bag_moisture_reading('grow-bag-6', 74);

-- Or insert all at once
SELECT insert_combined_sensor_readings(
    'main-room', 22.5, 65, 6.2, 1.8, 'Adequate',
    ARRAY['grow-bag-1', 'grow-bag-2', 'grow-bag-3', 'grow-bag-4', 'grow-bag-5', 'grow-bag-6'],
    ARRAY[75, 72, 78, 70, 76, 74]
);
```

---

## 📊 BENEFITS

### Storage Efficiency:
- **Before**: 6 bags × 6 fields = 36 values per reading
- **After**: 1 room × 5 fields + 6 bags × 1 field = 11 values per reading
- **Savings**: 69% reduction in data redundancy!

### Query Performance:
- Faster queries (less data to scan)
- Better indexing (room_id + timestamp)
- Cleaner aggregations

### Data Integrity:
- Single source of truth for room conditions
- No risk of "bag 1 shows 22.5°C but bag 2 shows 22.3°C" inconsistencies
- Easier to maintain and update

### User Experience:
- Clearer distinction between shared and individual sensors
- Less data repetition in displays
- More intuitive dashboard layout

---

## 🎨 UI CHANGES (Next Phase)

### Dashboard Layout:
```
┌─────────────────────────────────────────┐
│ ROOM CONDITIONS                         │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐│
│ │ 22.5°C│ │  65%  │ │ pH6.2 │ │1.8mS/cm││
│ │  Temp │ │Humid. │ │  pH   │ │  EC   ││
│ └───────┘ └───────┘ └───────┘ └───────┘│
│ ┌─────────────────────────────────┐    │
│ │ Water Level: Adequate            │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ GROW BAGS - Substrate Moisture          │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
│ │Bag 1 │ │Bag 2 │ │Bag 3 │ │Bag 4 │    │
│ │ 75% │ │ 72% │ │ 78% │ │ 70% │    │
│ └──────┘ └──────┘ └──────┘ └──────┘    │
│ ┌──────┐ ┌──────┐                      │
│ │Bag 5 │ │Bag 6 │                      │
│ │ 76% │ │ 74% │                      │
│ └──────┘ └──────┘                      │
└─────────────────────────────────────────┘
```

---

## ✅ CURRENT STATUS

- [x] Database schema created
- [x] Migration script ready
- [x] Database helper functions updated
- [x] API endpoint updated
- [x] Realtime provider updated
- [ ] Frontend dashboard UI optimization (optional)
- [ ] Frontend bag detail pages (optional)
- [ ] Analytics/charts (optional)

---

## 🔍 TROUBLESHOOTING

### Issue: "function get_latest_sensor_readings_v2 does not exist"
**Solution**: Run migration script: `\i migration-room-level-sensors.sql`

### Issue: API returns empty room data
**Solution**: Insert test data:
```sql
INSERT INTO room_sensors (room_id, room_temp, humidity, ph, ec, water_level_status)
VALUES ('main-room', 22.5, 65, 6.2, 1.8, 'Adequate');
```

### Issue: Dashboard shows old format
**Solution**: 
1. Check API response in browser console (F12)
2. Clear browser cache (Ctrl + Shift + R)
3. Restart Next.js server
4. Verify migration ran successfully

---

## 📞 NEXT STEPS

1. **Run Migration**: Execute `migration-room-level-sensors.sql` in PostgreSQL
2. **Test API**: Verify new response format at `/api/sensors/latest`
3. **Test Dashboard**: Open dashboard and verify data displays correctly
4. **Monitor System**: Check sensor readings regularly

---

**Created**: October 6, 2025
**Status**: ✅ Complete
**Migration Script**: `migration-room-level-sensors.sql`
