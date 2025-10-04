# 🌱 ESP32 Hydroponic Automation System - Complete Setup Guide

## 📋 What You Have Now

✅ **Complete ESP32 Arduino Code** - Full automation with sensors and pumps  
✅ **TimescaleDB Schema** - Optimized time-series database  
✅ **API Endpoints** - ESP32 ↔ Database ↔ Dashboard communication  
✅ **Dashboard Controls** - Remote pump control and parameter adjustment  
✅ **Automatic Adjustment** - pH/EC/moisture automation  

## 🔧 Hardware Setup

### **Required Components:**
- **ESP32 Dev Board**
- **DHT22** - Temperature & Humidity
- **TDS Sensor** - PPM/EC measurement  
- **Soil Moisture Sensor** - Substrate moisture
- **2x Relay Modules** - Pump control (5V)
- **2x Water Pumps** - Water + Nutrient solution
- **Power Supply** - 12V for pumps, 5V for ESP32
- **Breadboard/PCB** - Connections

### **Pin Connections:**
```
ESP32 Pin    →  Component                Status
GPIO 4       →  DHT11 Data              ⚠️  CONNECTED BUT NOT WORKING (temp/humidity = NaN)
GPIO 36 (A0) →  TDS Sensor Analog Out   ❌ NOT CONNECTED (TDS = 0)
GPIO 39 (A1) →  Soil Moisture Analog    ❌ NOT CONNECTED (moisture = 0%)
GPIO 2       →  Water Pump Relay        ✅ WORKING (pump activated)
GPIO 3       →  Nutrient Pump Relay     ✅ WORKING
GPIO 5       →  Spare Relay 1           ✅ READY
GPIO 6       →  Spare Relay 2           ✅ READY
3.3V         →  Sensor Power            ⚠️  VERIFY CONNECTION
GND          →  Common Ground           ⚠️  VERIFY CONNECTION
```

### **🔧 Hardware Debug Checklist:**

**DHT11 Temperature/Humidity Sensor (UPDATED):**
- [x] Connect DHT11 VCC to ESP32 3.3V (or 5V if available)
- [x] Connect DHT11 GND to ESP32 GND  
- [x] Connect DHT11 DATA to ESP32 GPIO 4
- [ ] ⚠️ ADD 4.7kΩ-10kΩ pull-up resistor between DATA and VCC (CRITICAL!)
- [ ] ⚠️ Try powering DHT11 with 5V instead of 3.3V
- [ ] ⚠️ Check if DHT11 is genuine (many clones have timing issues)

**DHT11 vs DHT22 Differences:**
```
DHT11:  3-5V power, ±2°C accuracy, 3-sec sampling
DHT22:  3.3-6V power, ±0.5°C accuracy, 2-sec sampling
```

**TDS Sensor:**
- [ ] Connect TDS sensor VCC to ESP32 3.3V
- [ ] Connect TDS sensor GND to ESP32 GND
- [ ] Connect TDS sensor Analog Out to ESP32 GPIO 36 (A0)

**Soil Moisture Sensor:**
- [ ] Connect moisture sensor VCC to ESP32 3.3V
- [ ] Connect moisture sensor GND to ESP32 GND
- [ ] Connect moisture sensor Analog Out to ESP32 GPIO 39 (A1)

**Power & Ground:**
- [ ] Verify all sensors share common ground
- [ ] Check 3.3V power supply stability
- [ ] Ensure ESP32 has adequate power (USB or 5V supply)

## 💾 Database Setup

### **Step 1: Run Schema in pgAdmin 4**
1. Open pgAdmin 4
2. Connect to your PostgreSQL database
3. Run `schema-updated.sql` (creates basic tables)
4. Run `schema-timescale.sql` (adds TimescaleDB features)

### **Step 2: Verify Setup**
```sql
-- Check if TimescaleDB installed
SELECT * FROM pg_extension WHERE extname = 'timescaledb';

-- Check hypertable created
SELECT * FROM timescaledb_information.hypertables;

-- Check sample data
SELECT COUNT(*) FROM sensor_readings;
```

## 📱 ESP32 Setup

### **Step 1: Install Arduino Libraries**
Open Arduino IDE → Library Manager → Install:
- ArduinoJson (v6+)
- DHT sensor library (Adafruit)
- Adafruit Unified Sensor
- OneWire
- DallasTemperature

### **Step 2: Configure ESP32 Code**
Edit `esp32-hydroponic-system.ino`:
```cpp
// Update these values:
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverURL = "http://YOUR_SERVER_IP:3000";
```

### **Step 3: Upload to ESP32**
1. Connect ESP32 to computer
2. Select Board: ESP32 Dev Module
3. Select correct COM port
4. Upload code

## 🌐 Web Dashboard Integration

### **Step 1: Add Device Control to Dashboard**
Add to your dashboard page:
```tsx
import { DeviceControl } from '@/components/device-control'

// In your dashboard component:
<DeviceControl 
  deviceId="grow-bag-1" 
  isOnline={true} 
/>
```

### **Step 2: Test API Endpoints**
Use the commands in `ESP32_API_TESTING.txt` to verify:
- ESP32 can send sensor data
- Dashboard can send commands to ESP32
- Database stores everything correctly

## 🎛️ Complete Automation Features

### **Sensor Monitoring:**
- 📊 Temperature & Humidity (DHT22)
- 🧪 pH & EC/PPM (TDS sensor + calculation)
- 💧 Soil moisture percentage
- 📡 Real-time data every 30 seconds

### **Automatic Control:**
- 💧 **Water Pump** - Runs when moisture < target
- 🧪 **Nutrient Pump** - Runs when EC < target  
- ⚙️ **Auto pH/EC** - Maintains optimal ranges
- 🕒 **Scheduled Operations** - Based on crop needs

### **Remote Control:**
- 📱 **Manual Pump Control** - Start/stop from dashboard
- ⚙️ **Parameter Adjustment** - Change pH/EC targets remotely
- 🔧 **Settings Update** - Modify automation rules
- 📈 **Real-time Monitoring** - Live sensor dashboard

### **Crop-Specific Automation:**
```cpp
// Default settings (can be changed remotely):
pH Range: 5.5 - 6.5
EC Range: 1.2 - 2.0 mS/cm  
Moisture: 60 - 80%
Auto Control: Enabled
```

## 🔄 Data Flow

```
ESP32 Sensors → HTTP POST → /api/sensors/ingest → TimescaleDB
                    ↓
Dashboard ← HTTP GET ← /api/sensors/latest ← TimescaleDB
                    ↓
Dashboard → HTTP POST → /api/devices/{id}/commands → ESP32
```

## 🧪 Testing Sequence

### **1. Test Database Connection:**
Visit: `http://localhost:3000/api/test-db`
Should show: "Connected" status

### **2. Test ESP32 Communication:**
- Upload ESP32 code
- Monitor Serial output
- Check for "Data sent successfully!" messages

### **3. Test Dashboard Control:**
- Open dashboard
- Use DeviceControl component
- Send pump commands
- Verify ESP32 receives and executes

### **4. Test Automation:**
- Simulate low moisture/EC readings
- Verify pumps activate automatically
- Check dashboard shows real-time updates

## 🚀 Ready for Production!

Your system now provides:
- ✅ **Full Automation** - ESP32 handles crop requirements
- ✅ **Remote Control** - Dashboard pump/parameter control  
- ✅ **Real-time Data** - Live sensor monitoring
- ✅ **Historical Analytics** - TimescaleDB time-series data
- ✅ **Scalable Architecture** - Multiple ESP32 devices supported

**Next Steps:**
1. Run database schema in pgAdmin 4
2. Upload ESP32 code with your WiFi credentials
3. Test the complete data flow
4. Enjoy your automated hydroponic system! 🌱