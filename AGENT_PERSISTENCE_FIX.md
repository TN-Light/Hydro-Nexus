# 🔧 Fix: Agent Disconnecting After First Use

## Problem
The agent closes after you close the dialog once, requiring you to manually restart `node agent.js dev` each time.

## Root Cause
LiveKit agents in `dev` mode automatically join rooms when they detect a connection, but by default they **close the session when the last participant disconnects**. The log shows:

```
closing agent session due to participant disconnect 
(disable via `RoomInputOptions.closeOnDisconnect=False`)
```

## ✅ Solution Applied

### 1. **Agent Configuration Updated** (`agent.ts`)
Changed the agent to:
```typescript
await session.start({
  agent: new QubitAssistant(),
  room: ctx.room,
  inputOptions: {
    noiseCancellation: BackgroundVoiceCancellation(),
    closeOnDisconnect: false, // ✅ Keep agent alive
  },
});
```

### 2. **Persistent Room Name** (`qubit-assistant.tsx`)
Using a fixed room name so the agent can stay connected:
```typescript
const roomName = 'qbm-hydronet-voice'; // Consistent room name
```

## 🚀 How to Test

### Step 1: Stop Current Agent
Press `Ctrl + C` in the terminal running the agent

### Step 2: Restart Agent
```powershell
node agent.js dev
```

You should see:
```
🤖 Qubit Agent starting...
✅ Qubit connected and ready! (Using FREE Gemini Live API)
🔄 Agent will stay alive for multiple connections
```

### Step 3: Test Multiple Connections
1. Open dashboard: http://localhost:3000/dashboard
2. Click Qubit button (bottom-right)
3. Grant microphone permissions
4. Click mic icon and speak
5. **Close the dialog** (X button)
6. **Open it again** (click Qubit button)
7. **Speak again** - it should work without restarting the agent!

## Expected Behavior

### ✅ After Fix:
- Open dialog → Speak → Close dialog → Open again → Speak again → **WORKS!**
- Agent stays running in terminal
- No need to manually restart `node agent.js dev`

### ❌ Before Fix:
- Open dialog → Speak → Close dialog → Open again → Speak again → **SILENT**
- Agent session closed in terminal
- Had to manually restart agent each time

## 📝 Alternative Solution: Production Mode

For production, you should use **agent workers** that LiveKit Cloud manages automatically. This way you don't need to manually run the agent at all:

### Deploy Agent to LiveKit Cloud:
```powershell
# Build the agent
npx tsc

# Deploy to LiveKit Cloud (requires livekit-cli installed)
lk agent create ^
  --name "qbm-hydronet-qubit" ^
  --entrypoint "agent.js" ^
  --agent-file "agent.js"
```

This will:
- Deploy your agent to LiveKit's cloud infrastructure
- Automatically scale based on demand
- Handle reconnections without manual intervention
- No need to keep `node agent.js dev` running locally

## 🐛 If Still Having Issues

### Issue: Agent still disconnects
**Check**: Make sure you stopped the old agent process (Ctrl+C) and restarted with the new code

**Verify**: Look for this line in terminal output:
```
🔄 Agent will stay alive for multiple connections
```

### Issue: "closeOnDisconnect is not a valid option" error
**Fix**: This means the LiveKit Agents version doesn't support this option. Update to latest:
```powershell
pnpm add @livekit/agents@latest @livekit/agents-plugin-google@latest
```

### Issue: Multiple agent instances running
**Fix**: Make sure only ONE agent.js dev process is running:
```powershell
# Check running node processes
Get-Process node

# Kill all node processes if needed
Stop-Process -Name node -Force

# Restart agent
node agent.js dev
```

## 🎯 Current Status

✅ **Agent configured to stay alive**
✅ **Persistent room name set**  
✅ **Ready to test multiple connections**

**Next step**: Restart the agent and test!
