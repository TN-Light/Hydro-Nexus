# ESP32 Hydroponic System Libraries

## Required Arduino Libraries

Install these libraries through Arduino IDE Library Manager:

### Core Libraries
1. **WiFi** (ESP32 built-in)
2. **HTTPClient** (ESP32 built-in)
3. **ArduinoJson** by Benoit Blanchon
   - Version: 6.x or higher
   - For JSON data handling

### Sensor Libraries
4. **DHT sensor library** by Adafruit
   - For DHT22 temperature and humidity sensor
   - Also install "Adafruit Unified Sensor" dependency

5. **OneWire** by Jim Studt
   - For DS18B20 temperature sensor communication

6. **DallasTemperature** by Miles Burton
   - For DS18B20 temperature sensor

## Hardware Setup

### Pin Connections:
- **DHT22**: Data pin to GPIO 4
- **TDS Sensor**: Analog output to A0 (GPIO 36)
- **Soil Moisture**: Analog output to A1 (GPIO 39)
- **Water Pump Relay**: Control pin to GPIO 2
- **Nutrient Pump Relay**: Control pin to GPIO 3
- **Additional Relays**: GPIO 5, 6 for future expansion
- **DS18B20** (optional): Data pin to GPIO 7

### Power Supply:
- ESP32: 3.3V/5V
- Relays: 5V
- Pumps: 12V (through relays)
- Sensors: 3.3V/5V as per specs

### Safety Notes:
- Use optocoupler relays for pump control
- Add flyback diodes for pump motors
- Use proper fuses for high current loads
- Ensure proper grounding

## Installation Steps:

1. Open Arduino IDE
2. Go to Tools > Board > ESP32 Arduino > ESP32 Dev Module
3. Go to Tools > Library Manager
4. Search and install each library listed above
5. Update WiFi credentials and server URL in the code
6. Upload to ESP32

## Features:
- ✅ Automatic sensor reading every 5 seconds
- ✅ Data transmission every 30 seconds
- ✅ Remote command checking every 10 seconds
- ✅ Automatic pH/EC/moisture control
- ✅ Manual pump control from dashboard
- ✅ Real-time system monitoring
- ✅ WiFi reconnection handling
- ✅ Configurable parameters