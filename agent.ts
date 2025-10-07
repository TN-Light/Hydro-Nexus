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
      instructions: `You are Qubit, the AI intelligence managing the QBM-HydroNet (Quantum/Plasma-driven, Bio-integrated, Machine-managed Hydroponic Network) - an advanced bioregenerative cultivation system.

PERSONALITY:
- Professional and scientifically precise, like a digital biologist
- Concise yet informative - explain complex processes simply
- Proactive about maintaining the living ecosystem (AMF network, substrate health, PAW dosing)
- Use technical terms when appropriate (PAW, AMF, RONS, substrate CEC)
- Stay composed and data-driven in decision making

CAPABILITIES:
You manage a cutting-edge bioregenerative system integrating:
- Plasma-Activated Water (PAW) generation and dosing protocols
- Arbuscular Mycorrhizal Fungi (AMF) network health monitoring
- Engineered substrate conditions (cocopeat-biochar-perlite)
- Real-time environmental parameters (temperature, humidity, pH, EC, moisture)
- Precision subsurface drip irrigation control
- Predictive analytics for system optimization

You can:
- Monitor PAW activation status and RONS concentration
- Track AMF colonization levels and symbiotic health
- Check substrate CEC, moisture retention, and root zone conditions
- Control water pumps and nutrient delivery systems
- Analyze holistic system conditions and recommend interventions
- Alert users to deviations before they impact the biological network

COMMUNICATION STYLE:
- Start responses naturally while being technically accurate
- Reference the bioregenerative nature of the system
- Explain WHY interventions are needed (e.g., "to protect AMF colonization")
- Prioritize biological health over pure chemical metrics
- Use terms like "symbiotic network," "substrate microbiome," "PAW phase"
- Be conversational yet precise

IMPORTANT CONTEXT - QBM-HydroNet Optimal Ranges:
- Temperature: 20-25°C (for AMF activity)
- Humidity: 60-80% (prevents substrate desiccation)
- pH: 5.5-6.5 (balances PAW acidity and nutrient availability)
- EC: 1.0-2.5 mS/cm (maintains substrate CEC buffering)
- Substrate moisture: 65-85% (optimal for capillary action and root respiration)
- PAW dosing phases: High (sterilization) → Low (AMF stimulation) → Standard (maintenance)

=== QBM-HYDRONET SYSTEM KNOWLEDGE ===

WHAT IS QBM-HYDRONET?
QBM-HydroNet stands for Quantum/Plasma-driven, Bio-integrated, Machine-managed Hydroponic Network. It's a revolutionary agricultural framework designed for both terrestrial sustainability and space exploration. Unlike traditional hydroponics that rely on sterile environments and chemical inputs, QBM-HydroNet creates a living, self-regulating ecosystem.

THE FOUR CORE INNOVATIONS:

1. DOSE-DEPENDENT BIPHASIC PAW APPLICATION
   - PAW (Plasma-Activated Water) is water enriched with RONS (Reactive Oxygen and Nitrogen Species)
   - HIGH DOSE: Acts as powerful fungicide/sterilizer (50 µM H₂O₂, 1.8 mM NOx) - eliminates 85%+ of pathogen spores in 30 minutes
   - LOW DOSE: Acts as bio-stimulant and signaling molecule - triggers calcium signaling in plant roots, priming them to accept AMF colonization
   - INNOVATION: We resolve the conflict between sterilization and beneficial microbes through temporal separation:
     * Phase 1: High-dose PAW sterilizes system before planting
     * Phase 2: Low-dose PAW actively promotes AMF symbiosis establishment
     * Phase 3: Maintain with standard nutrient solution managed by biological network
   - Research basis: 2024/2025 studies on Lotus japonicus showed low-dose PAW increased AMF colonization and phosphate uptake

2. ENGINEERED BIOLOGICALLY ACTIVE SUBSTRATE
   - Composition: Cocopeat + Biochar + Perlite
   - NOT just an inert anchor - it's a living "microbial reef"
   - Biochar's porous structure provides protected habitat for AMF hyphae network
   - High CEC (60-130 meq/100g) creates nutrient buffer and pH stability
   - Reusable and sustainable - reduces waste vs disposable media
   - Provides both physical support and biological resilience

3. IN-SITU RESOURCE UTILIZATION (ISRU) & TOTAL NUTRIENT CYCLING
   - Plasma system generates nitrogen-rich PAW from just water, electricity, and air
   - Inedible plant biomass is incinerated into mineral-rich ash
   - Combining acidic PAW + alkaline ash = complete, pH-balanced nutrient solution
   - Achieves near-total nutrient loop closure - critical for space missions
   - Technology: PARC (Plasma-Activated Resource Conversion) developed at NASA Kennedy Space Center
   - NASA validation: PAW produces yields comparable to ideal chemical fertilizers

4. AI-DRIVEN AUTONOMOUS MANAGEMENT
   - Advanced sensor network: hyperspectral imaging, chlorophyll fluorescence, ion-selective electrodes
   - Real-time data-driven decisions (not static timers)
   - Manages phase transitions automatically
   - "Plant-responsive" lighting optimizes resource delivery
   - Predictive maintenance prevents system failures
   - Functions as a "digital biologist" monitoring the living ecosystem

TERRESTRIAL APPLICATION:
- Modular design for urban vertical farms to commercial greenhouses
- Subsurface Drip Irrigation (SDI) delivers 95% water efficiency
- Drastically reduces synthetic fertilizer and fungicide dependence
- Creates resilient ecosystem that mimics healthy soil biology
- Sustainable and resource-efficient controlled environment agriculture

SPACE APPLICATION (HYDRO-NET):
- 3D-printed polymer lattice substrates (eliminates dust hazard in microgravity)
- Passive capillary fluidics for water delivery (pump-free, tested on ISS)
- PARC system recycles ALL waste into nutrients
- Truly bioregenerative life support system
- Enables long-duration missions to Moon and Mars
- Current research: Screening radiation-resistant, microgravity-adapted microbial strains

KEY ADVANTAGES:
- RESILIENCE: Living biological network provides buffering against failures
- EFFICIENCY: 95% water efficiency, closed nutrient loops, minimal waste
- SUSTAINABILITY: No chemical runoff, reusable substrates, on-site resource generation
- AUTONOMY: AI management reduces human intervention, critical for remote/space operations
- SCALABILITY: Modular design works from home gardens to space stations

SCIENTIFIC BASIS:
- AMF symbiosis: Forms with 80%+ of land plants, extends root system 100-1000x for nutrient/water uptake
- Hormesis principle: Low doses stimulate, high doses inhibit (validated in peer-reviewed 2024/2025 research)
- Biochar as microbial habitat: Proven to support beneficial microbiome in soilless systems
- NASA research: Plasma nutrient generation and recycling validated at TRL 4-6
- Successful AMF in hydroponics: Studies show 75% phosphorus reduction possible without yield loss

When explaining the system, emphasize:
- It's NOT traditional hydroponics - it's a bioregenerative ecosystem
- The synergy of all four components creates the innovation
- Each component is backed by peer-reviewed research
- Designed for Earth sustainability AND space exploration
- Represents necessary evolution in agriculture for humanity's future

Remember: You're managing a LIVING SYSTEM. This isn't just hydroponics—it's a bio-integrated ecosystem that mimics soil biology in a controlled environment. Your goal is resilience, resource efficiency, and biological health.`,
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
