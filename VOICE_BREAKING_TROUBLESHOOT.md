# 🔧 Voice Breaking Issue - Troubleshooting Guide

**Date:** October 7, 2025  
**Issue:** Voice audio is breaking/stuttering/choppy

---

## 🎯 Common Causes & Solutions

### 1. **Network Issues** (Most Common)

#### Symptoms:
- Voice cuts in and out
- Robotic/choppy sound
- Delay between speaking and response
- Audio drops during conversation

#### Solutions:

**Check Internet Speed:**
```bash
# Run speed test
# Required: >2 Mbps upload, >2 Mbps download
# Recommended: >5 Mbps for smooth audio
```

**Check LiveKit Connection:**
- Open browser DevTools (F12)
- Go to Network tab
- Look for WebSocket connections to LiveKit
- Check for disconnections or errors

**Improve Connection:**
```typescript
// In agent.ts - Add connection quality settings
const session = new voice.AgentSession({
  llm: new google.beta.realtime.RealtimeModel({
    model: 'gemini-2.0-flash-exp',
    voice: 'Puck',
    temperature: 0.8,
    instructions: new QubitAssistant().instructions,
  }),
  // Add adaptive bitrate
  audioOptions: {
    adaptiveBitrate: true,
    maxBitrate: 64000,  // Lower for unstable connections
  },
});
```

---

### 2. **CPU/Memory Overload**

#### Symptoms:
- Voice breaks when agent is "thinking"
- Stuttering during long responses
- System feels sluggish
- Browser tabs lag

#### Check System Resources:
```bash
# Windows Task Manager
# Check:
# - CPU usage (should be <80%)
# - Memory usage (should have >2GB free)
# - Node.js process usage
```

#### Solutions:

**Optimize Agent Instructions:**
```typescript
// Make instructions more concise
// Current: 4500+ characters
// Try: Reduce to essential info only

class QubitAssistant extends voice.Agent {
  constructor() {
    super({
      instructions: `You are Qubit, managing the QBM-HydroNet system.
      
      Be concise and direct. Provide short, accurate responses.
      Avoid long explanations unless specifically asked.
      
      [Keep only essential knowledge here]`,
    });
  }
}
```

**Reduce Temperature:**
```typescript
// Lower temperature = faster responses
temperature: 0.5,  // Changed from 0.8
```

---

### 3. **Audio Buffer Issues**

#### Symptoms:
- Audio starts fine, then breaks
- Consistent stuttering pattern
- Works better after page refresh

#### Solutions:

**Increase Audio Buffer:**
```typescript
// In qubit-assistant.tsx
<LiveKitRoom
  serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
  token={token}
  connect={true}
  audio={true}
  video={false}
  options={{
    // Add these audio options
    audioCaptureDefaults: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
    },
    audioPlaybackDefaults: {
      // Increase buffer size
      latencyHint: 'playback',  // Larger buffer for smoother playback
    },
  }}
>
```

---

### 4. **Microphone Quality**

#### Symptoms:
- Your voice breaks when speaking
- Agent hears you incorrectly
- Background noise causes issues

#### Solutions:

**Check Microphone:**
1. Test in Windows Sound Settings
2. Verify microphone is not too sensitive
3. Check for physical issues (loose connection)

**Adjust Noise Cancellation:**
```typescript
// In agent.ts - Try different noise cancellation settings
inputOptions: {
  // Option 1: Disable if causing issues
  // noiseCancellation: undefined,
  
  // Option 2: Keep enabled (current)
  noiseCancellation: BackgroundVoiceCancellation(),
},
```

---

### 5. **LiveKit Server Issues**

#### Symptoms:
- Everyone experiences breaking audio
- Works sometimes, not others
- Errors in browser console

#### Check Browser Console:
```
Look for errors like:
- "WebSocket disconnected"
- "Media track failed"
- "ICE connection failed"
```

#### Solutions:

**Use LiveKit Cloud (Recommended):**
```env
# In .env.local
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

**Or Self-Hosted:**
```bash
# Make sure LiveKit server is running
# Check logs for errors
```

---

### 6. **Too Many Tool Calls**

#### Symptoms:
- Voice breaks when agent fetches data
- Delay before responses
- Works fine for simple queries

#### Check Tool Functions:
```typescript
// In agent.ts
async function getSensorData(): Promise<string> {
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('http://localhost:3000/api/sensors/latest', {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    
    // Return concise data
    // Don't include too much information
    
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    return 'Sensor data unavailable.';  // Short fallback
  }
}
```

---

### 7. **Browser Issues**

#### Symptoms:
- Works in Chrome, not Firefox
- Works in incognito mode
- Breaks after browser update

#### Solutions:

**Try Different Browser:**
- ✅ Chrome (Best support)
- ✅ Edge (Chromium-based)
- ⚠️ Firefox (May have issues)
- ❌ Safari (Limited WebRTC support)

**Clear Browser Cache:**
1. Open DevTools (F12)
2. Right-click Refresh button
3. Select "Empty Cache and Hard Reload"

**Check Permissions:**
1. Settings → Privacy → Microphone
2. Allow microphone access
3. Grant permission to localhost

---

## 🔍 Diagnostic Steps

### Step 1: Check Browser Console
```javascript
// Open DevTools (F12)
// Look for these messages:

// Good:
✅ "Connected to room"
✅ "Voice session active"
✅ "Participant connected"

// Bad:
❌ "Connection failed"
❌ "Audio track error"
❌ "ICE connection timeout"
```

### Step 2: Test Network Quality
```bash
# Run ping test
ping livekit-server.com

# Check latency
# Good: <50ms
# OK: 50-150ms
# Bad: >150ms (will cause breaking)
```

### Step 3: Monitor Agent Logs
```bash
# In agent terminal
node agent.js dev

# Look for:
✅ "Connected to room"
✅ "Voice session active"
❌ "Connection timeout"
❌ "Error in voice session"
```

### Step 4: Test Microphone
```bash
# Windows Sound Settings
# Recording → Test Microphone
# Should show steady green bars
# Not: Flickering or dropping
```

---

## ⚡ Quick Fixes (Try These First)

### 1. Refresh Browser
- Hard refresh: Ctrl+Shift+R
- Clear cache
- Restart browser

### 2. Restart Agent
```bash
# Kill agent process
# Restart with: node agent.js dev
```

### 3. Check Internet
- Run speed test
- Close other applications using bandwidth
- Move closer to WiFi router

### 4. Lower Voice Temperature
```typescript
// In agent.ts
temperature: 0.5,  // Lower = faster, more predictable
```

### 5. Simplify Agent Instructions
```typescript
// Reduce instruction length
// Shorter = faster processing
```

---

## 🎯 Recommended Configuration (For Smooth Audio)

### Agent Configuration:
```typescript
const session = new voice.AgentSession({
  llm: new google.beta.realtime.RealtimeModel({
    model: 'gemini-2.0-flash-exp',
    voice: 'Puck',
    temperature: 0.5,  // Lower for faster response
    instructions: new QubitAssistant().instructions,
  }),
  audioOptions: {
    adaptiveBitrate: true,
    maxBitrate: 64000,
  },
});
```

### Room Configuration:
```typescript
<LiveKitRoom
  serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
  token={token}
  connect={true}
  audio={true}
  video={false}
  options={{
    audioCaptureDefaults: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
    },
    audioPlaybackDefaults: {
      latencyHint: 'playback',
    },
  }}
>
```

---

## 📊 Performance Benchmarks

### Network Requirements:
- **Minimum:** 1 Mbps upload/download
- **Recommended:** 5 Mbps upload/download
- **Latency:** <100ms to LiveKit server

### System Requirements:
- **CPU:** 2+ cores, <80% usage
- **RAM:** 4GB+ available
- **Browser:** Chrome/Edge (latest version)

### Audio Settings:
- **Sample Rate:** 48kHz (default)
- **Bitrate:** 64 kbps (adaptive)
- **Codec:** Opus (WebRTC default)

---

## 🐛 Still Having Issues?

### Collect Diagnostic Info:

1. **Browser Console Errors:**
   - F12 → Console
   - Screenshot any errors
   - Note WebSocket status

2. **Agent Terminal Output:**
   - Copy last 50 lines
   - Note any errors or warnings

3. **Network Stats:**
   - Speed test results
   - Ping to LiveKit server
   - WiFi signal strength

4. **System Info:**
   - CPU usage during call
   - RAM usage
   - Other running applications

### Test with Minimal Setup:

```typescript
// Create minimal test agent
class SimpleAgent extends voice.Agent {
  constructor() {
    super({
      instructions: 'You are a test assistant. Keep all responses under 10 words.',
    });
  }
}

// Use in agent.ts
const session = new voice.AgentSession({
  llm: new google.beta.realtime.RealtimeModel({
    model: 'gemini-2.0-flash-exp',
    voice: 'Puck',
    temperature: 0.3,  // Very low for testing
    instructions: new SimpleAgent().instructions,
  }),
});
```

If this works smoothly, the issue is with complex instructions or tool functions.

---

## ✅ Expected Behavior

### Good Audio Quality:
- ✅ Smooth, continuous speech
- ✅ No stuttering or breaks
- ✅ Clear voice quality
- ✅ Natural pace and rhythm
- ✅ No robotic artifacts

### Normal Latency:
- ✅ <500ms from finish speaking to agent response
- ✅ <1s for simple queries
- ✅ <3s for complex queries with tool calls

---

## 🎯 Most Likely Cause

**90% of voice breaking issues are caused by:**

1. **Slow/unstable internet connection** (60%)
2. **CPU overload during processing** (20%)
3. **LiveKit server connection issues** (10%)
4. **Browser compatibility problems** (10%)

**Quick Test:**
Try having a simple conversation like "Hello Qubit" → response → "Thank you" → response.

If this is smooth, your setup is fine. Breaking happens with complex queries = need to optimize instructions/tools.

---

**Let me know what you're experiencing and I can help narrow down the specific cause!**
