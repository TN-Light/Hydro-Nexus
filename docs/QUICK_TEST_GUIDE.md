# 🎯 Quick Test Guide

## The Fix: Unique Room Names!

Each time you open the dialog, it creates a **NEW room** so the agent treats it as a fresh job.

---

## 🧪 Test It Now (3 Steps)

### 1️⃣ Restart Agent
```powershell
# Press Ctrl+C to stop current agent
# Then run:
node agent.js dev
```

### 2️⃣ Test First Connection
```
Open Dashboard → Click Qubit → Speak → Get Response ✅
```

### 3️⃣ Test Reconnection
```
Close Dialog → Open Again → Speak → Get Response ✅
```

**If step 3 works = SUCCESS!** 🎉

---

## 💡 What You'll See

### Browser Console:
```javascript
✅ Token fetched for room: qbm-hydronet-1738843200123
// ... close dialog ...
🔄 Dialog closed, clearing token for next connection
// ... open again ...
✅ Token fetched for room: qbm-hydronet-1738843250456  // NEW!
```

### Agent Terminal:
```
INFO: received job request
  room: qbm-hydronet-1738843200123
🤖 Qubit Agent starting...
✅ Qubit voice session active!
// ... user closes dialog ...
INFO: AgentSession closed ← This is NORMAL!
// ... user opens again ...
INFO: received job request  ← Agent picks up new room!
  room: qbm-hydronet-1738843250456  ← Different timestamp!
🤖 Qubit Agent starting...
✅ Qubit voice session active!
```

---

## ✅ Success Indicators

| What to Look For | Meaning |
|-----------------|---------|
| Different room names | ✅ Creating unique sessions |
| "received job request" repeats | ✅ Agent picking up new rooms |
| "AgentSession closed" appears | ✅ Normal dev mode behavior |
| Voice works after reopening | ✅ **FIX WORKING!** |

---

## ❌ Still Not Working?

### Check 1: Agent Running?
```powershell
# Is node process running?
Get-Process node
```

### Check 2: Fresh Start?
```powershell
# Kill all node processes
Stop-Process -Name node -Force

# Start fresh
node agent.js dev
```

### Check 3: Browser Cache?
```
Press Ctrl+Shift+R to hard refresh dashboard
```

### Check 4: Console Errors?
```
Open browser DevTools (F12)
Check Console and Network tabs for errors
```

---

## 🎊 Expected Result

**You should be able to:**
1. Open dialog ✅
2. Talk to Qubit ✅
3. Close dialog ✅
4. Open again ✅
5. Talk to Qubit AGAIN ✅
6. Repeat UNLIMITED times ✅

**All with just ONE `node agent.js dev` running!**

---

## 🚀 Ready?

**Restart the agent and try it!**

```powershell
node agent.js dev
```

Then open the dashboard and test 2-3 times in a row! 🎉
