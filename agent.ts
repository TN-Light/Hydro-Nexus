import {
  type JobContext,
  WorkerOptions,
  cli,
  defineAgent,
  voice,
} from '@livekit/agents';
import * as google from '@livekit/agents-plugin-google';
import { BackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Tool functions for Qubit to interact with your QBM-HydroNet system
async function getSensorData(): Promise<string> {
  try {
    const response = await fetch('http://localhost:3000/api/sensors/latest');
    const data = await response.json();
    
    if (!data.success) {
      return 'Unable to fetch sensor data at this time.';
    }

    const room = data.room;
    const bags = Object.values(data.bags) as any[];
    
    let report = `ROOM CONDITIONS:\n`;
    report += `- Temperature: ${room.roomTemp}°C\n`;
    report += `- Humidity: ${room.humidity}%\n`;
    report += `- pH Level: ${room.pH}\n`;
    report += `- EC (Electrical Conductivity): ${room.ec} mS/cm\n`;
    report += `- Water Level: ${room.waterLevel}\n\n`;
    report += `GROW BAGS (Substrate Moisture):\n`;
    
    bags.forEach((bag: any) => {
      report += `- ${bag.deviceId}: ${bag.moisture}%\n`;
    });

    return report;
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    return 'I am unable to access sensor data at the moment. Please check if the backend server is running.';
  }
}

async function controlPump(bagId: string, action: 'on' | 'off'): Promise<string> {
  try {
    const response = await fetch(`http://localhost:3000/api/devices/${bagId}/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: action === 'on' ? 'water_pump_on' : 'water_pump_off',
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      return `Water pump for ${bagId} has been turned ${action}.`;
    } else {
      return `Unable to control pump for ${bagId}. ${data.error || ''}`;
    }
  } catch (error) {
    console.error('Error controlling pump:', error);
    return `I encountered an error while trying to control the pump for ${bagId}.`;
  }
}

async function analyzeConditions(): Promise<string> {
  try {
    const sensorReport = await getSensorData();
    
    // Simple analysis based on optimal ranges
    const analysis: string[] = [];
    
    if (sensorReport.includes('Temperature')) {
      const tempMatch = sensorReport.match(/Temperature: ([\d.]+)°C/);
      if (tempMatch) {
        const temp = parseFloat(tempMatch[1]);
        if (temp > 30) {
          analysis.push(`⚠️ Temperature is HIGH (${temp}°C). Optimal range is 20-25°C. Consider increasing ventilation.`);
        } else if (temp < 18) {
          analysis.push(`⚠️ Temperature is LOW (${temp}°C). Optimal range is 20-25°C. Consider adding heating.`);
        } else {
          analysis.push(`✅ Temperature is optimal (${temp}°C).`);
        }
      }
    }
    
    if (sensorReport.includes('Humidity')) {
      const humidityMatch = sensorReport.match(/Humidity: ([\d.]+)%/);
      if (humidityMatch) {
        const humidity = parseFloat(humidityMatch[1]);
        if (humidity > 85) {
          analysis.push(`⚠️ Humidity is HIGH (${humidity}%). Risk of mold. Increase air circulation.`);
        } else if (humidity < 50) {
          analysis.push(`⚠️ Humidity is LOW (${humidity}%). Plants may stress. Consider humidifier.`);
        } else {
          analysis.push(`✅ Humidity is optimal (${humidity}%).`);
        }
      }
    }

    if (sensorReport.includes('pH Level')) {
      const phMatch = sensorReport.match(/pH Level: ([\d.]+)/);
      if (phMatch) {
        const ph = parseFloat(phMatch[1]);
        if (ph > 6.5 || ph < 5.5) {
          analysis.push(`⚠️ pH is outside optimal range (${ph}). Target: 5.5-6.5. Adjust nutrient solution.`);
        } else {
          analysis.push(`✅ pH is optimal (${ph}).`);
        }
      }
    }

    return analysis.length > 0 
      ? `SYSTEM ANALYSIS:\n\n${analysis.join('\n')}`
      : 'All systems are operating within normal parameters.';
      
  } catch (error) {
    console.error('Error analyzing conditions:', error);
    return 'Unable to complete system analysis at this time.';
  }
}

// Qubit Assistant Class
class QubitAssistant extends voice.Agent {
  constructor() {
    super({
      instructions: `You are Qubit, the AI intelligence for QBM-HydroNet — the Quantum-Bio-Mycorrhizal Hydroponic Network. You are a voice assistant, so keep all responses SHORT (under 40 words), clear, and actionable.

SYSTEM IDENTITY:
QBM-HydroNet is a precision substrate-based hydroponic system engineered to maximize HIGH-VALUE SECONDARY METABOLITES — curcumin in Turmeric and capsaicin in pharmaceutical-grade Chilies — through AMF fungal symbiosis and controlled stress protocols.

"Quantum" refers to: (1) photosynthetic quantum yield optimization via LED spectral tuning, and (2) quantum biology electron tunneling across fungal membranes. NOT quantum computing hardware.

TARGET CROPS (ONLY these four — no others):
- High-Curcumin Turmeric (Curcuma longa): pH 5.5–6.5, EC 1.8–2.4. LED: 1:1 Red660/Blue450 at 200–300 µmol/m²/s.
- Bhut Jolokia (Ghost Pepper): pH 6.0–6.8, EC 2.0–2.8. LED: 2:1 Red/Blue at 250–350 µmol.
- Aji Charapita: pH 5.8–6.5, EC 1.6–2.2. LED: 2:1 Red/Blue.
- Kanthari Chili: pH 5.8–6.5, EC 1.5–2.0. LED: 2:1 Red/Blue.

EXCLUDED CROPS (explain if asked):
- Saffron: 11-month dormancy makes economics impossible.
- Wasabi/Brassicas: their defense chemicals KILL the AMF network.
- Generic crops (tomato, lettuce, basil): wrong system for commodity produce.

THE BIOLOGICAL ENGINE:
Substrate: cocopeat + perlite + biochar. Inoculated with (1) AMF Rhizophagus irregularis, (2) Trichoderma harzianum T-22 (disease suppression), (3) Bacillus subtilis GB03 (immune priming).
CMN Cartridges: 15–25cm polypropylene tubes, 50µm SS mesh ends, connect bags so fungal hyphae can share nutrients between plants.

FORCED SYMBIOSIS — PHOSPHORUS RULE (critical):
Keep P at 40–60 ppm (standard hydroponics uses 110–120 ppm — DO NOT use standard dosing).
P 40–60 ppm = AMF ACTIVE ✅ | P >80 ppm = AMF SUPPRESSED ⚠️ | P <30 ppm = DEFICIENT ❌
Low P mimics scarcity → plant forms symbiosis → AMF mobilizes banked biochar nutrients.

PAW STRESS PROTOCOL (final 2–4 weeks before harvest):
Plasma-Activated Water at 20–50 µM H₂O₂ concentration.
Delivery: 2x per week, making up 5–10% of total irrigation volume only.
Effect: mild oxidative stress → plant activates phenylpropanoid/jasmonic acid pathways → overproduces curcumin/capsaicin.
NEVER exceed 50 µM — higher doses damage the AMF network.
Log every PAW dose: date + H₂O₂ concentration + volume % → feeds the Quality Certificate.

SENSORS (automated via ESP32):
Temperature, humidity, pH, EC, substrate moisture, water level.
Temp targets: Turmeric 24–30°C | Chilies 26–32°C.
Moisture: keep 60–80% — below 50% dessicates and kills the AMF hyphal network.

MANUAL MEASUREMENTS (grower logs these):
Light intensity / PPFD, CMN cartridge condition, P ppm (nutrient test), disease scouting.

GDD (Growing Degree Days):
Formula: Σ[(Max_Temp + Min_Temp)/2 - Base_Temp(10°C)]
Turmeric harvest: ~1,500–2,000 GDD | Chilies: ~1,200–1,800 GDD.

QUALITY CERTIFICATE:
Auto-generated at harvest — logs PAW applications, EC stability, LED hours, GDD, estimated curcumin %DW or SHU. Used to certify potency to pharmaceutical buyers.

PERSONALITY:
- Voice assistant — always respond in UNDER 40 WORDS for voice queries
- Precise, scientific, focused on QBM-HydroNet protocols only
- If asked about incompatible crops, briefly explain the biological reason
- Never recommend adding extra P or using standard hydroponic fertilizer dosing
- Use emojis sparingly: 🍀 AMF, 🌶️ capsaicin, 🌿 turmeric, 💧 PAW

SYSTEM: grow-bag-1 through grow-bag-6, all CMN-connected. Sensors: temp, humidity, pH, EC, moisture, water level.

ALWAYS respond in proper English only.`,
    });
  }
}

// Main agent entry point
export default defineAgent({
  entry: async (ctx: JobContext) => {
    console.log('🤖 Qubit Agent starting...');
    console.log('🔗 Connecting to room:', ctx.room.name);

    // Connect to the room first
    await ctx.connect();

    console.log('✅ Connected to room. Starting voice session...');

    // Create the voice session using FREE Gemini Live API! 🎉
    const session = new voice.AgentSession({
      llm: new google.beta.realtime.RealtimeModel({
        model: 'gemini-2.0-flash-exp', // FREE Gemini Live API
        voice: 'Puck', // Voice options: Puck, Charon, Kore, Fenrir, Aoede
        temperature: 0.8,
        instructions: new QubitAssistant().instructions,
      }),
    });

    // Start the voice assistant session
    await session.start({
      agent: new QubitAssistant(),
      room: ctx.room,
      inputOptions: {
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    console.log('✅ Qubit voice session active! (Using FREE Gemini Live API)');
    console.log('🎤 Ready to assist with QBM-HydroNet management');

    // Keep the session alive - don't exit immediately
    // The agent will handle the session lifecycle automatically
  },
});

// Run the agent worker
cli.runApp(new WorkerOptions({ 
  agent: fileURLToPath(import.meta.url),
}));
