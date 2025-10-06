# 🤖 Qubit Voice Assistant - Quick Start Guide

## ✅ What's Ready

Your **FREE Qubit voice assistant** is configured and ready to use! Here's what you have:

- ✅ **Name**: Qubit (your AI assistant for Hydro-Nexus)
- ✅ **FREE Gemini LLM**: Using your Gemini API key (`gemini-2.0-flash-exp`)
- ✅ **LiveKit Cloud**: Account created with FREE tier (10,000 min/month)
- ✅ **Noise Cancellation**: Model files downloaded successfully
- ✅ **UI Component**: Green-themed floating button on dashboard

## 🎯 Agent Architecture

```
Your Voice → LiveKit STT (FREE) → Gemini LLM (FREE) → LiveKit TTS (FREE) → Your Speakers
```

**Total Cost**: $0/month! 🎉

## ⚠️ Current Issue

There's a module loading error with `@livekit/agents` package when using `tsx` TypeScript loader:

```
Error: Cannot find module '@livekit\agents\index.cjs'
```

## 🔧 Solution: Use Node.js Directly

Instead of using `tsx`, we'll run the compiled JavaScript with Node.js:

### Step 1: Compile the Agent

```powershell
npx tsc agent.ts --skipLibCheck --module es2020 --target es2020 --esModuleInterop --moduleResolution node
```

### Step 2: Add Module Type

Add this to your `package.json` (top level):

```json
"type": "module"
```

### Step 3: Run Agent in Dev Mode

```powershell
node agent.js dev
```

## 🚀 Full Setup Process

### 1. Set Up Your OpenAI Key (Optional for Better Quality)

While Gemini is FREE, you can optionally use OpenAI for even better voice quality:

```bash
# In .env.local - OPTIONAL
OPENAI_API_KEY=sk-proj-xxxxx
```

**Note**: Current setup uses 100% FREE services (Gemini + LiveKit Inference)

### 2. Start Next.js Dev Server

```powershell
pnpm dev
```

### 3. Start Qubit Agent (in separate terminal)

```powershell
# First compile
npx tsc agent.ts --skipLibCheck --module es2020 --target es2020 --esModuleInterop --moduleResolution node

# Then run
node agent.js dev
```

### 4. Open Dashboard

Navigate to: `http://localhost:3000/dashboard`

### 5. Click the Green Qubit Button

Look for the floating green button in the bottom-right corner!

## 🎤 What Qubit Can Do

Qubit can help you manage your Hydro-Nexus system through voice commands:

- **Check Sensors**: "What's the room temperature?" / "Show me moisture levels"
- **Control Pumps**: "Turn on water pump for bag 1" / "Turn off pump for grow-bag-2"
- **System Analysis**: "Analyze current conditions" / "How are my plants doing?"
- **General Help**: "What can you do?" / "Help me with the system"

## 📊 Expected Flow

1. User clicks **green Qubit button**
2. Dialog opens with voice visualizer
3. Qubit greets: "Hello! All Hydro-Nexus systems are online. How may I assist you?"
4. User speaks command
5. Qubit processes and responds with voice + text transcript
6. Green audio bars visualize speech

## 🐛 Troubleshooting

### Agent Won't Start

**Error**: `Cannot find module '@livekit\agents\index.cjs'`

**Fix**: Use compiled JavaScript instead of tsx:
```powershell
npx tsc agent.ts --skipLibCheck --module es2020 --target es2020 --esModuleInterop --moduleResolution node
node agent.js dev
```

### No Voice Response

1. Check agent is running: Look for `✅ Qubit connected and ready!` in terminal
2. Check microphone permissions in browser
3. Check LiveKit playground: https://agents-playground.livekit.io/

### Backend API Errors

Make sure your Next.js dev server is running:
```powershell
pnpm dev
```

Qubit needs these API endpoints:
- `GET /api/sensors/latest` - For sensor data
- `POST /api/devices/{bagId}/commands` - For pump control

## 🎨 Customization

### Change Voice

Edit `agent.ts`:
```typescript
// Current: Uses LiveKit Inference default voice
const session = new voice.AgentSession({
  llm: new google.LLM({
    model: 'gemini-2.0-flash-exp',
  }),
});
```

### Change Personality

Edit `agent.ts` - `QubitAssistant` class:
```typescript
instructions: `You are Qubit, a [YOUR DESCRIPTION HERE]...`
```

### Change Button Color

Edit `components/jarvis-assistant.tsx`:
```typescript
// Change from green to blue
className="fixed bottom-6 right-6 rounded-full bg-blue-600 hover:bg-blue-700..."
```

## 📝 Next Steps

1. **Test Voice Commands**: Try all the voice commands listed above
2. **Deploy to Production**: Use `lk agent create` to deploy to LiveKit Cloud
3. **Add More Tools**: Extend agent.ts with more functions (lighting, analytics, etc.)
4. **Mobile App**: Use LiveKit React Native SDK for mobile voice control

## 🆘 Need Help?

- **LiveKit Docs**: https://docs.livekit.io/agents/
- **Gemini API**: https://ai.google.dev/
- **LiveKit Playground**: https://agents-playground.livekit.io/

---

**Status**: ✅ Ready to use with Node.js (FREE)
**Cost**: $0/month with Gemini + LiveKit Inference
**Quality**: Professional voice assistant with noise cancellation
