# ESP32 HTTPS Connection to Vercel - Complete Guide

## 🔴 Problem Identified

**Root Cause**: Your ESP32 was trying to connect using HTTP (unencrypted), but Vercel only serves HTTPS (encrypted). The ESP32 couldn't establish SSL/TLS connections without proper certificate configuration.

### Why It Worked Locally But Not on Vercel

- **Local (`http://localhost:3000`)**: No encryption needed ✅
- **Vercel (`https://qbm-hydronet.vercel.app`)**: Requires SSL/TLS certificates ❌

---

## ✅ Solution Applied

### 1. ESP32 Code Changes

**Changes Made:**
- ✅ Added `WiFiClientSecure.h` library for HTTPS support
- ✅ Included Google Trust Services Root CA certificate (valid until 2036)
- ✅ Updated `sendSensorData()` to use `WiFiClientSecure` with certificate validation
- ✅ Updated `checkForCommands()` to use `WiFiClientSecure`
- ✅ Added `testHTTPSConnection()` function to verify HTTPS on startup
- ✅ Increased timeouts for HTTPS (15s for data send, 10s for commands)
- ✅ Enhanced error logging with detailed HTTPS error messages

### 2. Backend API Changes

**Changes Made:**
- ✅ Case-insensitive header handling (`x-api-key` or `X-API-Key`)
- ✅ Enhanced logging with emoji indicators for easier debugging
- ✅ Added `success` field to all responses
- ✅ Improved GET endpoint for connectivity testing
- ✅ Better error messages with specific error details

---

## 🚀 Deployment Steps

### Step 1: Upload ESP32 Code

1. **Open Arduino IDE**
2. **Select your ESP32 board**: Tools → Board → ESP32 Dev Module (or your specific board)
3. **Select COM Port**: Tools → Port → (Select your ESP32's port)
4. **Verify code**: Click the ✓ (Verify) button
5. **Upload**: Click the → (Upload) button
6. **Monitor**: Open Serial Monitor (Ctrl+Shift+M) at 115200 baud

### Step 2: Deploy Backend to Vercel

```powershell
# Navigate to your project
cd c:\Users\amanu\Desktop\Hydro-Nexus

# Check what changed
git status

# Add the changes
git add app/api/sensors/ingest/route.ts

# Commit
git commit -m "Add HTTPS support for ESP32 with improved error handling"

# Push to GitHub (Vercel will auto-deploy)
git push origin version-5
```

### Step 3: Monitor Deployment

1. Go to https://vercel.com/your-dashboard
2. Wait for deployment to complete (usually 1-2 minutes)
3. Check deployment logs for any errors

---

## 🔍 Testing & Verification

### Expected Serial Monitor Output

When ESP32 starts successfully, you should see:

```
╔════════════════════════════════════════╗
║  ESP32 Hydroponic System v2.2 (SSL)   ║
║  Vercel HTTPS Support Enabled         ║
║  Device: grow-bag-1                    ║
╚════════════════════════════════════════╝

⚙️  Setting up pins...
   ✓ All pumps/relays OFF
   ✓ DHT11 internal pullup enabled
   ✓ ADC configured

🌡️  Initializing DHT11...
   ✓ DHT11 ready

🌡️  Initializing DS18B20...
   ✓ Found 1 DS18B20 sensor(s)

📡 Connecting to WiFi...
.....
   ✓ WiFi connected!
   IP: 192.168.1.xxx
   Signal: -45 dBm

🔐 Testing HTTPS connection to Vercel...
   ✓ HTTPS connection OK (code: 200)
   Response: {"status":"online","device_id":"grow-bag-1",...}

✅ System ready!
```

### Successful Data Send

```
📤 Sending to Vercel (HTTPS)...
   Data: {"device_id":"grow-bag-1","room_temp":25.5,"humidity":65...}
   ✓ Success! Response:
   {"success":true,"reading_id":123,"device_id":"grow-bag-1",...}
```

---

## 🐛 Troubleshooting

### Problem 1: Certificate Verification Failed

**Serial Output:**
```
✗ HTTPS failed: certificate verify failed
```

**Solution:**
The root CA certificate might be outdated. The certificate in the code is valid until 2036, but if you see this:

1. Check your ESP32's date/time (might be set to 1970)
2. Try adding time sync code:
```cpp
configTime(0, 0, "pool.ntp.org", "time.nist.gov");
```

### Problem 2: Connection Timeout

**Serial Output:**
```
✗ Failed: connection timeout
```

**Possible Causes:**
- Weak WiFi signal (check RSSI, should be > -70 dBm)
- Firewall blocking outbound HTTPS
- Vercel temporarily down

**Solution:**
```cpp
// Check WiFi signal strength
Serial.println(WiFi.RSSI()); // Should be > -70

// Try reconnecting
connectToWiFi();
```

### Problem 3: HTTP 401 (Unauthorized)

**Serial Output:**
```
⚠ HTTP 401
Response: {"error":"Invalid API key","success":false}
```

**Solution:**
Verify API key in database:
```sql
-- Run this in Supabase SQL Editor
SELECT * FROM api_keys WHERE device_id = 'grow-bag-1';

-- If no result, insert the key:
INSERT INTO api_keys (device_id, api_key, is_active)
VALUES ('grow-bag-1', 'esp32_grow_bag_1_key_2024_secure', true);
```

### Problem 4: HTTP 400 (Bad Request)

**Serial Output:**
```
⚠ HTTP 400
Response: {"error":"Missing required sensor fields","success":false}
```

**Solution:**
Check sensor data in Serial Monitor. Ensure all these fields exist:
- `room_temp`
- `humidity`
- `ph`
- `ec`
- `substrate_moisture`

### Problem 5: Can't Create Secure Client

**Serial Output:**
```
❌ Failed to create secure client
```

**Solution:**
ESP32 ran out of memory. Reduce memory usage:
```cpp
// In sendSensorData(), delete client immediately after use
delete client; // Already in code ✓
```

---

## 📊 Check Vercel Logs

### Option 1: Vercel Dashboard
1. Go to https://vercel.com/your-project
2. Click "Deployments"
3. Click latest deployment
4. Click "Functions" tab
5. Look for logs from `/api/sensors/ingest`

### Option 2: Vercel CLI
```powershell
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# View live logs
vercel logs --follow
```

**What to Look For:**
```
✅ Good logs:
🔑 API Key received: esp32_grow...
✅ Device authenticated: grow-bag-1
📊 Sensor data received: {...}
✅ Data stored successfully. Reading ID: 123

❌ Bad logs:
❌ No API key provided
❌ Invalid API key: esp32_grow...
❌ Error processing ESP32 data: ...
```

---

## 🧪 Manual API Testing

### Test 1: Check API Connectivity

```powershell
# Test GET endpoint (connectivity check)
curl -X GET "https://qbm-hydronet.vercel.app/api/sensors/ingest" `
  -H "x-api-key: esp32_grow_bag_1_key_2024_secure"
```

**Expected Response:**
```json
{
  "status": "online",
  "device_id": "grow-bag-1",
  "timestamp": "2025-10-12T...",
  "message": "API endpoint ready",
  "success": true
}
```

### Test 2: Send Test Data

```powershell
curl -X POST "https://qbm-hydronet.vercel.app/api/sensors/ingest" `
  -H "Content-Type: application/json" `
  -H "x-api-key: esp32_grow_bag_1_key_2024_secure" `
  -d '{
    "device_id": "grow-bag-1",
    "room_temp": 25.5,
    "humidity": 65,
    "water_temp": 22.0,
    "ph": 6.2,
    "ec": 1.5,
    "tds_ppm": 750,
    "substrate_moisture": 70,
    "water_level_status": "Adequate"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "reading_id": 123,
  "device_id": "grow-bag-1",
  "timestamp": "2025-10-12T...",
  "message": "Sensor data stored successfully"
}
```

---

## 📝 Verification Checklist

Before considering it "working":

- [ ] ESP32 connects to WiFi
- [ ] HTTPS test passes on startup (`✓ HTTPS connection OK`)
- [ ] Sensor data sends successfully every 30 seconds
- [ ] Vercel logs show `✅ Data stored successfully`
- [ ] Dashboard shows real-time data from ESP32
- [ ] No SSL/certificate errors in Serial Monitor
- [ ] Commands from dashboard work (test pump controls)

---

## 🎯 Key Improvements Over Old Code

| Feature | Old Code | New Code |
|---------|----------|----------|
| Protocol | HTTP | HTTPS with certificate |
| Security | None | SSL/TLS encryption |
| Certificate | None | Google Trust Services Root CA |
| Timeout | 10s | 15s (HTTPS needs more time) |
| Error Handling | Basic | Detailed with error codes |
| Logging | Minimal | Comprehensive with emojis |
| Header Support | Exact match | Case-insensitive |
| Connectivity Test | No | Yes (`testHTTPSConnection()`) |

---

## 🔐 Security Notes

### Certificate Expiration
- **Current Certificate Expires**: June 22, 2036
- **Action Required in 2036**: Update the `root_ca` variable with new certificate

### Getting New Certificate
When the certificate expires, get new one:
```bash
# Get Vercel's certificate chain
echo | openssl s_client -showcerts -connect qbm-hydronet.vercel.app:443 2>/dev/null | openssl x509 -text
```

### API Key Security
- ✅ API key is validated on every request
- ✅ Keys can be disabled in database
- ✅ Keys have expiration support
- ⚠️ Don't commit API keys to public repos

---

## 📞 Need Help?

If you're still having issues:

1. **Check Serial Monitor** - Look for specific error codes
2. **Check Vercel Logs** - Look for backend errors
3. **Verify Database** - Ensure API key exists and is active
4. **Test Manually** - Use curl commands above to isolate issue
5. **Check Certificate** - Ensure it hasn't expired (valid until 2036)

---

## ✅ Success Indicators

Your ESP32 is working correctly when:

1. **Startup**: Shows `✓ HTTPS connection OK`
2. **Data Send**: Shows `✓ Success! Response:` every 30 seconds
3. **Dashboard**: Real-time data updates visible
4. **Vercel Logs**: No errors, shows `✅ Data stored successfully`
5. **Database**: New rows in `sensor_readings` table
6. **No Errors**: No certificate or SSL errors in Serial Monitor

---

**Last Updated**: October 12, 2025  
**ESP32 Firmware Version**: v2.2 (SSL)  
**Certificate Valid Until**: June 22, 2036
