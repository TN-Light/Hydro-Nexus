# ESP32 Local Development Setup Guide

## 🔧 Configuration Steps

### 1. **WiFi Credentials**
In `esp32-hydroponic-system.ino`, replace these lines:

```cpp
const char* ssid = "YOUR_WIFI_SSID";           // ⚠️  REPLACE WITH YOUR ACTUAL WIFI NAME
const char* password = "YOUR_WIFI_PASSWORD";   // ⚠️  REPLACE WITH YOUR ACTUAL WIFI PASSWORD
```

**Example:**
```cpp
const char* ssid = "MyHome_WiFi";
const char* password = "mypassword123";
```

### 2. **Server URL (Already Updated)**
✅ Already configured to your local server:
```cpp
const char* serverURL = "http://192.168.43.224:3000";
```

### 3. **API Key (Already Set)**
✅ Already configured with database API key:
```cpp
const char* apiKey = "esp32_grow_bag_1_key_2024_secure";
```

## 🌐 Network Setup

### Your Local Development Environment:
- **Next.js App:** `http://localhost:3000` (for browser)
- **ESP32 Access:** `http://192.168.43.224:3000` (local network IP)
- **Device ID:** `grow-bag-1`
- **API Key:** `esp32_grow_bag_1_key_2024_secure`

### ⚠️ IMPORTANT: Network Connectivity Requirements

**ESP32 Network Connection (NOT USB):**
- ESP32 connects to your WiFi network wirelessly
- ESP32 does NOT need USB cable connection to laptop for HTTP access
- Both ESP32 and laptop must be on the SAME WiFi network

**Network Flow:**
```
Router/WiFi ←→ Laptop (192.168.43.224:3000)
Router/WiFi ←→ ESP32 (192.168.43.xxx) → HTTP requests to laptop
```

### 🔧 Starting Next.js for ESP32 Access:

**UPDATED COMMAND:**
```bash
npm run dev
# This now runs with --hostname 0.0.0.0 to accept external connections
```

### 📱 Testing Network Access:

**Before using ESP32, test with your phone:**
1. Connect your phone to the SAME WiFi network
2. Open browser on phone
3. Visit: `http://192.168.43.224:3000`
4. If it works on phone → it will work on ESP32!

### API Endpoints the ESP32 Will Use:
1. **Send Sensor Data:** `POST /api/sensors/ingest`
2. **Get Commands:** `GET /api/devices/grow-bag-1/commands`

## 📊 Database API Keys

Your database already has these API keys configured:

| Device ID | API Key | Status |
|-----------|---------|--------|
| grow-bag-1 | esp32_grow_bag_1_key_2024_secure | ✅ Active |
| grow-bag-2 | esp32_grow_bag_2_key_2024_secure | ✅ Active |
| grow-bag-3 | esp32_grow_bag_3_key_2024_secure | ✅ Active |
| grow-bag-4 | esp32_grow_bag_4_key_2024_secure | ✅ Active |
| grow-bag-5 | esp32_grow_bag_5_key_2024_secure | ✅ Active |
| grow-bag-6 | esp32_grow_bag_6_key_2024_secure | ✅ Active |

## 🚀 Upload Steps

1. **Install Required Libraries** (see ESP32_LIBRARIES.md)
2. **Update WiFi credentials** in the code
3. **Verify server URL** matches your local IP
4. **Upload code** to ESP32
5. **Monitor Serial output** to verify connection

## 🔍 Testing Connection

### From ESP32 Serial Monitor, you should see:
```
Connecting to WiFi....
WiFi connected!
IP address: 192.168.43.xxx
ESP32 Hydroponic System Initialized
Device ID: grow-bag-1

=== Sensor Readings ===
Temperature: 24.5°C
Humidity: 65.2%
TDS: 450.1 ppm
EC: 0.90 mS/cm
pH: 6.20
Soil Moisture: 75%
...

Sending sensor data:
{"room_temp":24.5,"humidity":65.2,...}
✅ Data sent successfully!
```

### From Next.js Dashboard:
- Check dashboard for real-time sensor data
- Verify device shows as "Active"
- Test device commands from the web interface

## 🛠️ Troubleshooting

### Common Issues:

1. **ESP32 Can't Connect to WiFi**
   - Double-check WiFi credentials
   - Ensure ESP32 and computer are on same network

2. **HTTP Connection Failed**
   - Verify server URL (use IP address, not localhost)
   - Check if Next.js app is running on port 3000
   - Ensure firewall allows connections

3. **API Authentication Failed**
   - Verify API key matches database
   - Check if TimescaleDB schema is properly applied

4. **No Data in Dashboard**
   - Check API route: `/api/sensors/ingest`
   - Verify database connection
   - Monitor ESP32 serial output for errors

## 📱 Multiple ESP32 Devices

To add more devices:
1. Use different device IDs (grow-bag-2, grow-bag-3, etc.)
2. Use corresponding API keys from database
3. Update device ID in ESP32 code:
   ```cpp
   // In checkForCommands() function, change:
   http.begin(String(serverURL) + "/api/devices/grow-bag-2/commands");
   ```

## ⚡ Production Deployment

When moving to production (hosting online):
1. Update `serverURL` to your hosted domain
2. Enable HTTPS in ESP32 code
3. Add SSL certificate verification
4. Use environment variables for sensitive data