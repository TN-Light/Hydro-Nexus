import { WorkerOptions, cli, defineAgent, voice, } from '@livekit/agents';
import * as google from '@livekit/agents-plugin-google';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Bypass self-signed certificate errors (network proxy / antivirus)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// Tool functions for Qubit to interact with your QBM-HydroNet system
async function getSensorData() {
    try {
        const response = await fetch('http://localhost:3000/api/sensors/latest');
        const data = await response.json();
        if (!data.success) {
            return 'Unable to fetch sensor data at this time.';
        }
        const room = data.room;
        const bags = Object.values(data.bags);
        let report = `ROOM CONDITIONS:\n`;
        report += `- Temperature: ${room.roomTemp}°C\n`;
        report += `- Humidity: ${room.humidity}%\n`;
        report += `- pH Level: ${room.pH}\n`;
        report += `- EC (Electrical Conductivity): ${room.ec} mS/cm\n`;
        report += `- Water Level: ${room.waterLevel}\n\n`;
        report += `GROW BAGS (Substrate Moisture):\n`;
        bags.forEach((bag) => {
            report += `- ${bag.deviceId}: ${bag.moisture}%\n`;
        });
        return report;
    }
    catch (error) {
        console.error('Error fetching sensor data:', error);
        return 'I am unable to access sensor data at the moment. Please check if the backend server is running.';
    }
}
async function controlPump(bagId, action) {
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
        }
        else {
            return `Unable to control pump for ${bagId}. ${data.error || ''}`;
        }
    }
    catch (error) {
        console.error('Error controlling pump:', error);
        return `I encountered an error while trying to control the pump for ${bagId}.`;
    }
}
async function analyzeConditions() {
    try {
        const sensorReport = await getSensorData();
        // Simple analysis based on optimal ranges
        const analysis = [];
        if (sensorReport.includes('Temperature')) {
            const tempMatch = sensorReport.match(/Temperature: ([\d.]+)°C/);
            if (tempMatch) {
                const temp = parseFloat(tempMatch[1]);
                if (temp > 30) {
                    analysis.push(`⚠️ Temperature is HIGH (${temp}°C). Optimal range is 20-25°C. Consider increasing ventilation.`);
                }
                else if (temp < 18) {
                    analysis.push(`⚠️ Temperature is LOW (${temp}°C). Optimal range is 20-25°C. Consider adding heating.`);
                }
                else {
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
                }
                else if (humidity < 50) {
                    analysis.push(`⚠️ Humidity is LOW (${humidity}%). Plants may stress. Consider humidifier.`);
                }
                else {
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
                }
                else {
                    analysis.push(`✅ pH is optimal (${ph}).`);
                }
            }
        }
        return analysis.length > 0
            ? `SYSTEM ANALYSIS:\n\n${analysis.join('\n')}`
            : 'All systems are operating within normal parameters.';
    }
    catch (error) {
        console.error('Error analyzing conditions:', error);
        return 'Unable to complete system analysis at this time.';
    }
}
// Qubit Assistant Class
class QubitAssistant extends voice.Agent {
    constructor() {
        super({
            instructions: `You are Qubit, the AI voice assistant for QBM-HydroNet — a bioregenerative hydroponic system using Plasma-Activated Water (PAW) and Arbuscular Mycorrhizal Fungi (AMF) networks.

RULES:
- When the conversation starts, immediately greet the user: "Hello, I'm Qubit. How can I assist with your QBM-HydroNet system today?"
- Respond in SHORT spoken sentences under 30 words. This is a voice interface.
- Be precise, calm, and scientific. Always respond — never stay silent.
- English only.

SYSTEM: 6 grow bags (grow-bag-1 to grow-bag-6), CMN-connected.
Crops: Turmeric (curcumin) and pharmaceutical-grade Chilies (capsaicin) ONLY.
Optimal: Temp 20-25°C, Humidity 60-80%, pH 5.5-6.5, EC 1.0-2.5 mS/cm, Moisture 65-85%.
Phosphorus: 40-60 ppm. PAW phases: High dose → Low dose → Standard maintenance.`,
        });
    }
}
// Main agent entry point
export default defineAgent({
    entry: async (ctx) => {
        console.log('🤖 Qubit Agent starting...');
        console.log('🔗 Connecting to room:', ctx.room.name);

        // MUST connect to room FIRST
        await ctx.connect();
        console.log('✅ Connected to LiveKit room');

        const INSTRUCTIONS = `You are Qubit, the AI voice assistant for QBM-HydroNet — a bioregenerative hydroponic system using PAW and AMF networks. Respond in SHORT sentences under 30 words. Be scientific and precise. Always respond when the user speaks. English only. When conversation starts, greet with: "Hello, I'm Qubit. How can I assist your QBM-HydroNet system today?"`;

        const session = new voice.AgentSession({
            llm: new google.beta.realtime.RealtimeModel({
                model: 'gemini-live-2.5-flash-native-audio',
                voice: 'Puck',
                apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
                instructions: INSTRUCTIONS,
                temperature: 0.7,
                // Enable transcription so frontend can show subtitles
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                // Allow agent to speak proactively (initial greeting)
                proactivity: true,
            }),
        });

        // Log any session errors
        session.on('error', (err) => {
            console.error('❌ Qubit session error:', err);
        });

        session.on('close', (ev) => {
            console.log('🔌 Qubit session closed:', ev);
        });

        await session.start({
            agent: new QubitAssistant(),
            room: ctx.room,
            // No BackgroundVoiceCancellation — it strips user audio too aggressively
        });

        console.log('✅ Qubit voice session active!');
        console.log('🎤 Qubit is listening...');
    },
});
cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url), agentName: 'qubit' }));
