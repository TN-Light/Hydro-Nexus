# 🚀 ESP32 HTTPS - Quick Start Card

## Upload ESP32 Code
1. Open Arduino IDE
2. Select Board: ESP32 Dev Module
3. Select Port: Your ESP32's COM port
4. Click Upload (→)
5. Open Serial Monitor (115200 baud)

## Deploy Backend
```powershell
cd c:\Users\amanu\Desktop\Hydro-Nexus
git add app/api/sensors/ingest/route.ts esp32-hydroponic-system.ino
git commit -m "Add HTTPS support for ESP32"
git push origin version-5
```

## Expected Output
```
✓ WiFi connected!
🔐 Testing HTTPS connection to Vercel...
   ✓ HTTPS connection OK (code: 200)
✅ System ready!

📤 Sending to Vercel (HTTPS)...
   ✓ Success!
```

## Quick Test
```powershell
# Test API connectivity
curl -X GET "https://qbm-hydronet.vercel.app/api/sensors/ingest" `
  -H "x-api-key: esp32_grow_bag_1_key_2024_secure"
```

## Troubleshooting
| Issue | Fix |
|-------|-----|
| `certificate verify failed` | Certificate expired (check date) |
| `connection timeout` | Check WiFi signal (RSSI) |
| `HTTP 401` | Check API key in database |
| `HTTP 400` | Missing sensor data fields |

## Success Checklist
- [ ] HTTPS test passes on startup
- [ ] Data sends every 30 seconds
- [ ] No SSL errors
- [ ] Dashboard shows real-time data

---
📖 Full Guide: `ESP32_HTTPS_VERCEL_SETUP.md`
