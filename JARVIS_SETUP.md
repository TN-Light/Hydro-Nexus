# 🤖 Jarvis Voice Assistant - Complete Setup Guide

## 📋 What You Need to Do (30 minutes)

### ✅ Step 1: Create LiveKit Account (5 minutes)

1. Go to: **https://cloud.livekit.io/**
2. Click "Sign Up" (free account)
3. Create a new project called **"hydro-nexus"**
4. After creating project, you'll see:
   - **API Key**: `lk_api_xxxxx`
   - **API Secret**: `lk_secret_xxxxx`
   - **WebSocket URL**: `wss://your-project.livekit.cloud`

**COPY THESE - You'll need them in Step 3!**

---

### ✅ Step 2: Get OpenAI API Key (5 minutes)

1. Go to: **https://platform.openai.com/api-keys**
2. Sign in or create account
3. Click "Create new secret key"
4. Name it "Hydro-Nexus-Jarvis"
5. Copy the key: `sk-proj-xxxxx`

**SAVE THIS - You'll need it in Step 3!**

> **Note**: OpenAI Realtime API costs ~$0.06/minute. For FREE alternative, we can use Gemini + local TTS instead!

---

### ✅ Step 3: Update Environment Variables (2 minutes)

Open your `.env.local` file and add these lines:

```bash
# LiveKit Configuration
LIVEKIT_API_KEY=lk_api_xxxxx          # From Step 1
LIVEKIT_API_SECRET=lk_secret_xxxxx    # From Step 1
LIVEKIT_URL=wss://your-project.livekit.cloud  # From Step 1

# AI Configuration
OPENAI_API_KEY=sk-proj-xxxxx          # From Step 2
# OR use your existing Gemini key (FREE!)
GOOGLE_AI_API_KEY=your_gemini_key     # Already have this
```

---

### ✅ Step 4: Install Dependencies (5 minutes)

Run these commands in your terminal:

```bash
# Install all packages (including LiveKit)
pnpm install

# Download AI model files (for noise cancellation)
pnpm agent:download
```

---

### ✅ Step 5: Authenticate with LiveKit CLI (5 minutes)

```bash
# Install LiveKit CLI (if not already installed)
# For Windows:
winget install LiveKit.LiveKitCLI

# Link your LiveKit Cloud account
lk cloud auth

# This will open a browser to authenticate
```

---

### ✅ Step 6: Start Everything (5 minutes)

Open **TWO** terminal windows:

**Terminal 1 - Next.js Dashboard:**
```bash
pnpm dev
```

**Terminal 2 - Jarvis Agent:**
```bash
pnpm agent:dev
```

---

### ✅ Step 7: Test Jarvis (3 minutes)

1. Open: **http://localhost:3000/dashboard**
2. Look for **"🎙️ Talk to Jarvis"** button (bottom-right)
3. Click it
4. Say: **"Hello Jarvis"**
5. Jarvis should respond!

---

## 🎬 What You'll See:

### **Dashboard with Jarvis Button:**
```
┌─────────────────────────────────────────────────────────┐
│  🌱 Hydro Nexus Dashboard                              │
│  [Room Sensors] [Grow Bags] [Charts]                  │
│                                                         │
│                                            ┌─────────┐ │
│                                            │  🎙️     │ │
│                                            │ Jarvis  │ │← Click here!
│                                            └─────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **Jarvis Dialog:**
```
┌─────────────────────────────────────────────────────────┐
│  🤖 Jarvis - AI Voice Assistant                        │
│                                                         │
│  ┌───────────────────────────────────────────────────┐│
│  │ 🔴 LISTENING...                                    ││
│  │                                                     ││
│  │ 🎤 [████████░░] Audio Level                        ││
│  │                                                     ││
│  │ 💬 Transcript:                                     ││
│  │ You: "What's the room temperature?"                ││
│  │ Jarvis: "The room is 35.2°C, quite high sir..."   ││
│  │                                                     ││
│  │ 🔊 Jarvis is speaking... ████████████              ││
│  └───────────────────────────────────────────────────┘│
│                                                         │
│  [📞 End Call]                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 What Jarvis Can Do:

### **1. Check Sensors:**
```
You: "What's the room temperature?"
Jarvis: "The room temperature is currently 35.2 degrees Celsius. 
         That's above the optimal range of 20 to 25 degrees."

You: "Check humidity"
Jarvis: "Room humidity is 77 percent, which is in the optimal range."

You: "What about bag 4?"
Jarvis: "Bag 4 has 88 percent substrate moisture. That's at the 
         upper limit. Last watered 3 hours ago."
```

### **2. Control Devices:**
```
You: "Turn on water pump for bag 1"
Jarvis: "Activating water pump for grow bag 1 now."

You: "Turn it off"
Jarvis: "Water pump for grow bag 1 is now off."
```

### **3. Get Analysis:**
```
You: "Are there any problems?"
Jarvis: "I've detected two issues: Room temperature is 10 degrees 
         above optimal, and bags 4 and 6 have high moisture levels."

You: "Give me an overview"
Jarvis: "All 6 grow bags are active. Room conditions: 35.2 degrees, 
         77% humidity, pH 6.2. Moisture levels range from 70 to 88 
         percent. Temperature requires attention."
```

### **4. Proactive Alerts:**
```
Jarvis: "Excuse me sir, temperature has risen to 36 degrees. 
         Shall I increase ventilation?"

You: "Yes"

Jarvis: "Ventilation increased. I'll monitor and update you."
```

---

## 🎨 Customization Options:

### **Change Jarvis Voice:**

Edit `agent.ts` line 15:
```typescript
voice: 'coral',  // Options: alloy, coral, echo, sage, shimmer, verse
```

### **Change Personality:**

Edit `agent.ts` line 12:
```typescript
instructions: 'You are Jarvis, a sophisticated AI butler...'
```

**Examples:**
- **Formal**: "You are Jarvis, a sophisticated British AI butler..."
- **Casual**: "You are a friendly AI assistant who loves plants..."
- **Technical**: "You are a precise technical assistant focused on data..."

---

## 🔧 Troubleshooting:

### **Issue: "Cannot find LiveKit credentials"**
**Solution**: Make sure `.env.local` has all three LiveKit variables

### **Issue: "Agent won't start"**
**Solution**: 
```bash
# Make sure you downloaded model files:
pnpm agent:download

# Check if port 3000 is available
# Kill any process using port 3000
```

### **Issue: "No audio/can't hear Jarvis"**
**Solution**: Check browser permissions (allow microphone)

### **Issue: "OpenAI API error"**
**Solution**: 
- Check OPENAI_API_KEY is correct
- Or switch to FREE Gemini (I'll show you how)

---

## 💰 Cost Breakdown:

| Service | Cost | Usage |
|---------|------|-------|
| **LiveKit Cloud** | FREE | 10,000 min/month |
| **OpenAI Realtime** | $0.06/min | ~$3.60 for 1hr/day |
| **Alternative: Gemini** | FREE | Unlimited (with key) |

**Recommended: Use Gemini for FREE operation!**

---

## 📂 Files Created:

```
Hydro-Nexus/
├── agent.ts                    # Jarvis brain (Node.js)
├── components/
│   └── jarvis-assistant.tsx    # UI component
├── app/
│   └── api/
│       └── livekit/
│           └── token/
│               └── route.ts    # Token generation
├── lib/
│   └── jarvis-config.ts        # Configuration
└── .env.local                  # Your credentials
```

---

## 🚀 Next Steps After Setup:

1. **Test basic commands** - Try asking about sensors
2. **Customize personality** - Edit agent.ts instructions
3. **Add custom commands** - Add tool functions
4. **Train on your data** - Feed historical sensor data
5. **Deploy to production** - `lk agent create`

---

## 📞 Need Help?

If anything doesn't work:
1. Check all environment variables are set
2. Make sure both terminals are running
3. Check browser console for errors (F12)
4. Verify microphone permissions

---

**Created**: October 6, 2025  
**Status**: Ready to Install  
**Time Required**: 30 minutes  
**Cost**: $0-5/month
