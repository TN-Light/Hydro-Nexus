# ⚡ ESP32 + Vercel + TimescaleDB - Quick Reference

## 🔗 Your System URLs

- **Website**: https://qbm-hydronet.vercel.app/
- **Database**: xtxeoq4snx.j4nl6wefeq.tsdb.cloud.timescale.com:30557
- **WiFi**: "sam" / "vivoy543"
- **Device**: grow-bag-1
- **API Key**: esp32_grow_bag_1_key_2024_secure

---

## 🚀 One-Command Deploy

```powershell
cd c:\Users\amanu\Desktop\Hydro-Nexus; git add .; git commit -m "ESP32 HTTPS fix"; git push origin version-5
```

---

## 🧪 Quick Tests

### Test API
```powershell
curl https://qbm-hydronet.vercel.app/api/sensors/ingest -H "x-api-key: esp32_grow_bag_1_key_2024_secure"
```

### Check Logs
```powershell
vercel logs --follow
```

---

## 📊 What You'll See

### ESP32 Serial Monitor (115200 baud)
```
✓ WiFi connected! IP: 192.168.x.x
✓ HTTPS connection OK (code: 200)      ← KEY SUCCESS
✓ Success!                              ← Every 30 seconds
```

### Vercel Logs
```
🔑 API Key received: esp32_grow...
✅ Device authenticated: grow-bag-1
✅ Data stored successfully
```

---

## 🔧 Common Issues

| Serial Monitor Says | Fix |
|---------------------|-----|
| `certificate verify failed` | Wait 30s for time sync |
| `connection timeout` | Check WiFi signal |
| `HTTP 401` | Check API key in DB |
| `HTTP 400` | Sensor data missing |

---

## 📖 Full Guides

- Quick Start: `ESP32_QUICK_START.md`
- Full Setup: `ESP32_HTTPS_VERCEL_SETUP.md`
- Deployment: `ESP32_TIMESCALEDB_DEPLOYMENT.md`
- Summary: `DEPLOYMENT_SUMMARY.md`

---

**Modified Files**: 2  
**Database Changes**: None (works as-is!)  
**Deploy Time**: ~5 minutes  
**Certificate Valid Until**: 2036 ✅
