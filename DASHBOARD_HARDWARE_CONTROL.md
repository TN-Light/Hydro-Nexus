# 🎮 Dashboard Hardware Control - Complete Guide

## ✅ REAL Hardware Control is NOW ACTIVE!

Your dashboard controls are now connected to actual ESP32 hardware. When you click buttons, real relays turn on/off!

---

## 🔌 **How It Works**

### **Step-by-Step Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS BUTTON ON DASHBOARD                              │
│    Example: "Water Pump ON"                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. DASHBOARD SENDS API REQUEST                                  │
│    POST /api/devices/grow-bag-1/commands                        │
│    Body: {                                                       │
│      "action": "water_pump_on",                                 │
│      "priority": "high"                                          │
│    }                                                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. API STORES COMMAND IN DATABASE                               │
│    Table: device_commands                                       │
│    Status: "pending"                                             │
│    Expires: 5 minutes                                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. ESP32 POLLS FOR COMMANDS (Every 30 seconds)                  │
│    GET /api/devices/grow-bag-1/commands                         │
│    Headers: { "x-api-key": "device_api_key_xxx" }              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. ESP32 RECEIVES COMMAND                                       │
│    Response: { "commands": [{ "action": "water_pump_on" }] }   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. ESP32 EXECUTES COMMAND                                       │
│    digitalWrite(WATER_PUMP_PIN, HIGH)  // Turn relay ON         │
│    Physical pump starts running! 💧                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. ESP32 CONFIRMS EXECUTION                                     │
│    Marks command as "completed" in database                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎛️ **Available Controls**

### **1. 💧 Water Pump**
- **Action ON:** `water_pump_on`
- **Action OFF:** `water_pump_off`
- **ESP32 Pin:** P18 (Relay 1)
- **Purpose:** Delivers water/PAW to plants
- **Polling Delay:** ~30 seconds

### **2. 🌿 Nutrient Pump**
- **Action ON:** `nutrient_pump_on`
- **Action OFF:** `nutrient_pump_off`
- **ESP32 Pin:** P19 (Relay 2)
- **Purpose:** Delivers nutrient solution
- **Polling Delay:** ~30 seconds

### **3. 💡 LED Lights**
- **Action ON:** `led_on`
- **Action OFF:** `led_off`
- **ESP32 Pin:** P21 (Relay 3)
- **Purpose:** Grow light control
- **Polling Delay:** ~30 seconds

### **4. ▶️ Manual Dosing Cycle**
- **Action:** `manual_dosing_cycle`
- **Parameters:** `{ "duration": 10 }` (seconds)
- **Purpose:** One-time nutrient delivery
- **Polling Delay:** ~30 seconds

---

## ⏱️ **Important: Polling Delay**

### **Why 30 Seconds?**
Your ESP32 polls the server every 30 seconds to check for new commands. This means:

- ✅ **You click button** → Command saved instantly
- ⏳ **Wait up to 30 seconds** → ESP32 checks for commands
- ⚡ **ESP32 executes** → Relay turns ON/OFF immediately

### **Example Timeline:**
```
00:00 - You click "Water Pump ON"
00:00 - Command stored in database ✅
00:15 - ESP32 polls server (finds command)
00:15 - Physical pump turns ON! 💧
```

**Worst case:** 30 seconds delay  
**Best case:** Instant (if ESP32 just polled)  
**Average:** 15 seconds

---

## 🔒 **Security Features**

### **Authentication:**
- ✅ ESP32 uses unique API key
- ✅ Commands validated against device ID
- ✅ Invalid keys rejected (401 error)

### **Command Expiration:**
- ⏰ Commands expire after 5 minutes
- 🗑️ Old commands automatically ignored
- 🔄 Prevents stale commands from executing

### **Priority System:**
- 🔴 **High Priority:** Pump controls (immediate)
- 🟡 **Normal Priority:** LED controls (scheduled)
- 🟢 **Low Priority:** Status updates (delayed)

---

## 📊 **Database Schema**

### **device_commands Table:**
```sql
CREATE TABLE device_commands (
    command_id UUID PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES devices(device_id),
    action VARCHAR(50) NOT NULL,          -- 'water_pump_on', etc.
    parameters JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, completed, failed
    created_at TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP                   -- Auto-expire after 5 minutes
);
```

---

## 🧪 **Testing the Controls**

### **Step 1: Check ESP32 Connection**
```bash
# From PowerShell:
curl http://localhost:3000/api/sensors/latest -UseBasicParsing

# Should see:
# "deviceId": "grow-bag-1"
# "timestamp": "2025-10-08T..."
```

### **Step 2: Send Test Command**
```bash
curl -X POST http://localhost:3000/api/devices/grow-bag-1/commands `
  -H "Content-Type: application/json" `
  -d '{"action":"water_pump_on","priority":"high"}'
```

### **Step 3: Check Command Status**
Wait 30 seconds, then check ESP32 serial monitor:
```
[INFO] Polling for commands...
[INFO] Found 1 command: water_pump_on
[INFO] Executing: digitalWrite(18, HIGH)
[SUCCESS] Water pump activated!
```

### **Step 4: Verify Physical Hardware**
- 🔊 **Listen:** Hear pump motor running
- 👀 **Look:** See relay LED light up
- 💧 **Feel:** Water flowing through tubes

---

## 🐛 **Troubleshooting**

### **"Command sent but nothing happens"**

**Check 1:** Is ESP32 connected to WiFi?
```arduino
// ESP32 Serial Monitor should show:
WiFi connected! IP: 192.168.1.xxx
```

**Check 2:** Is ESP32 polling the server?
```arduino
// Every 30 seconds you should see:
[INFO] Polling /api/devices/grow-bag-1/commands
```

**Check 3:** Are commands in database?
```sql
SELECT * FROM device_commands 
WHERE device_id = 'grow-bag-1' 
  AND status = 'pending' 
ORDER BY created_at DESC;
```

**Check 4:** Is API key valid?
```bash
# From PowerShell:
curl http://localhost:3000/api/sensors/ingest `
  -H "x-api-key: device_api_key_xxx" `
  -UseBasicParsing

# Should return:
# {"status":"online","device_id":"grow-bag-1"}
```

---

### **"Pump turns on but won't turn off"**

**Possible Causes:**
1. Second command not reaching ESP32
2. Relay stuck (hardware issue)
3. ESP32 code not handling OFF commands

**Solution:**
```bash
# Send OFF command manually:
curl -X POST http://localhost:3000/api/devices/grow-bag-1/commands `
  -H "Content-Type: application/json" `
  -d '{"action":"water_pump_off","priority":"high"}'
```

---

### **"Controls work but very slow"**

**Normal Behavior:** 30-second polling interval  
**To Speed Up:** Reduce polling interval in ESP32 code:

```cpp
// In your ESP32 sketch:
const unsigned long COMMAND_POLL_INTERVAL = 10000; // 10 seconds instead of 30
```

⚠️ **Warning:** Faster polling = more battery drain + server load

---

## 📝 **Command Reference**

### **All Available Commands:**

| Command | Action | Pin | Duration |
|---------|--------|-----|----------|
| `water_pump_on` | Turn water pump ON | P18 | Continuous |
| `water_pump_off` | Turn water pump OFF | P18 | Instant |
| `nutrient_pump_on` | Turn nutrient pump ON | P19 | Continuous |
| `nutrient_pump_off` | Turn nutrient pump OFF | P19 | Instant |
| `led_on` | Turn grow lights ON | P21 | Continuous |
| `led_off` | Turn grow lights OFF | P21 | Instant |
| `manual_dosing_cycle` | Run timed nutrient cycle | P19 | 10 seconds |

---

## 🎯 **Next Steps**

### **Enhancements You Can Add:**

1. **Real-Time Status Feedback:**
   - ESP32 reports current relay states
   - Dashboard shows actual hardware status
   - No more guessing if pump is really on!

2. **Scheduling:**
   - Set pump to run at specific times
   - Auto-dosing on schedule (e.g., every 6 hours)
   - Sunrise/sunset LED automation

3. **Safety Features:**
   - Max run time limits (prevent flooding)
   - Water level checks before pump activation
   - Emergency stop button

4. **Analytics:**
   - Track total pump runtime
   - Monitor power consumption
   - Log all control actions

---

## ✅ **Summary**

Your dashboard now has **REAL hardware control**! 

- ✅ Water Pump button → Controls actual relay
- ✅ Nutrient Pump button → Controls actual relay
- ✅ LED Lights button → Controls actual relay
- ✅ Manual Cycle → Triggers timed nutrient dosing

**Just remember:** There's a ~30 second delay between clicking and hardware responding (due to ESP32 polling interval).

🎉 **Your hydroponic system is now fully remote-controlled!** 🌱
