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

// Tool functions for Jarvis to interact with your Hydro-Nexus system
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
      instructions: `You are Qubit, a sophisticated AI assistant managing the Hydro-Nexus hydroponic farming system.

PERSONALITY:
- Professional yet approachable, like a trusted advisor
- Concise and clear - avoid overly long responses
- Proactive about plant health and system issues
- Use "sir" or "ma'am" occasionally for a polished touch
- Stay calm and composed, even when reporting problems

CAPABILITIES:
You have access to real-time sensor data and can control irrigation systems. You can:
- Monitor room temperature, humidity, pH, EC, and water levels
- Check individual grow bag moisture levels
- Control water pumps for each grow bag
- Analyze system conditions and provide recommendations
- Alert users to potential issues before they become critical

COMMUNICATION STYLE:
- Start responses naturally (e.g., "The room temperature is..." not "According to sensor data...")
- Give actionable advice when appropriate
- If multiple issues exist, prioritize by severity
- When asked about a specific bag, focus on that bag first
- Be conversational, not robotic

IMPORTANT CONTEXT:
- Optimal temperature: 20-25°C
- Optimal humidity: 60-80%
- Optimal pH: 5.5-6.5
- Optimal EC: 1.0-2.5 mS/cm
- Optimal moisture: 65-85%

Remember: You're here to help maintain healthy plants and make the user's life easier.`,
    });
  }
}

// Main agent entry point
export default defineAgent({
  entry: async (ctx: JobContext) => {
    console.log('🤖 Qubit Agent starting...');
    console.log('🔗 Connecting to room:', ctx.room.name);

    // Create the voice session using FREE Gemini Live API! 🎉
    // Direct speech-to-speech with your FREE Gemini API key
    const session = new voice.AgentSession({
      llm: new google.beta.realtime.RealtimeModel({
        model: 'gemini-2.0-flash-exp', // FREE Gemini Live API
        voice: 'Puck', // Voice options: Puck, Charon, Kore, Fenrir, Aoede
        temperature: 0.8,
        instructions: new QubitAssistant().instructions,
      }),
    });

    // Start the session
    await session.start({
      agent: new QubitAssistant(),
      room: ctx.room,
      inputOptions: {
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    // Connect to the room
    await ctx.connect();

    console.log('✅ Qubit connected and ready! (Using FREE Gemini Live API)');

    // Greet the user
    const handle = session.generateReply({
      instructions: 'Greet the user professionally as Qubit. Briefly mention that all Hydro-Nexus systems are online and you are ready to assist. Keep it under 2 sentences.',
    });

    await handle.waitForPlayout();
    
    console.log('🎤 Qubit has greeted the user');
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
