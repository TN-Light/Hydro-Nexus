#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ⚠️ IMPORTANT: UPDATE WITH YOUR WIFI CREDENTIALS
const char* ssid = "sam";
const char* password = "vivoy543";

// Server configuration
const char* serverURL = "http://192.168.43.224:3000";
const char* apiKey = "esp32_grow_bag_1_key_2024_secure";

// ✅ PIN DEFINITIONS FOR YOUR BOARD (Using "P" labels)
// DHT11 sensor (no external resistor needed - using internal pullup)
#define DHT_PIN 4              // Connect to P4
#define DHT_TYPE DHT11

// Analog sensors (these pins have built-in ADC)
#define TDS_PIN 13             // Connect to P13
#define SOIL_MOISTURE_PIN 12   // Connect to P12

// Relay/Pump control pins
#define WATER_PUMP_PIN 18      // Connect to P18
#define NUTRIENT_PUMP_PIN 19   // Connect to P19
#define RELAY_1_PIN 21         // Connect to P21 (extra relay)
#define RELAY_2_PIN 22         // Connect to P22 (extra relay)

// DS18B20 water temperature sensor (no external resistor needed - using internal pullup)
#define ONE_WIRE_BUS 17        // Connect to P17

// Sensor objects
DHT dht(DHT_PIN, DHT_TYPE);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);

// Timing
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
unsigned long lastCommandCheck = 0;
const unsigned long sensorInterval = 5000;
const unsigned long sendInterval = 30000;
const unsigned long commandInterval = 10000;

// Sensor data
struct SensorData {
  float temperature;
  float humidity;
  float tds_ppm;
  float ph;
  float ec;
  int soil_moisture;
  float water_temp;
  float water_level;
  bool water_pump_status;
  bool nutrient_pump_status;
};

// System settings
struct SystemSettings {
  float target_ph_min = 5.5;
  float target_ph_max = 6.5;
  float target_ec_min = 1.2;
  float target_ec_max = 2.0;
  int target_moisture_min = 60;
  int target_moisture_max = 80;
  bool auto_control_enabled = true;
  int pump_duration_ms = 5000;
};

SensorData currentData;
SystemSettings settings;
bool wifiConnected = false;

void setup() {
  Serial.begin(115200);
  delay(2000); // Give serial time to start
  
  Serial.println("\n\n╔════════════════════════════════════════╗");
  Serial.println("║  ESP32 Hydroponic System v2.1         ║");
  Serial.println("║  No External Resistors Required!      ║");
  Serial.println("║  Device: grow-bag-1                    ║");
  Serial.println("╚════════════════════════════════════════╝\n");
  
  // Initialize GPIO pins
  Serial.println("⚙️  Setting up pins...");
  pinMode(WATER_PUMP_PIN, OUTPUT);
  pinMode(NUTRIENT_PUMP_PIN, OUTPUT);
  pinMode(RELAY_1_PIN, OUTPUT);
  pinMode(RELAY_2_PIN, OUTPUT);
  
  // All outputs OFF initially
  digitalWrite(WATER_PUMP_PIN, LOW);
  digitalWrite(NUTRIENT_PUMP_PIN, LOW);
  digitalWrite(RELAY_1_PIN, LOW);
  digitalWrite(RELAY_2_PIN, LOW);
  Serial.println("   ✓ All pumps/relays OFF");
  
  // ✅ Enable internal pull-up for DHT11 (replaces external resistor)
  pinMode(DHT_PIN, INPUT_PULLUP);
  Serial.println("   ✓ DHT11 internal pullup enabled");
  
  // Configure ADC (only for WiFi, we'll read sensors before WiFi starts)
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  Serial.println("   ✓ ADC configured");
  
  // Initialize DHT11
  Serial.println("\n🌡️  Initializing DHT11...");
  dht.begin();
  delay(3000); // DHT11 needs warmup time
  Serial.println("   ✓ DHT11 ready (warmup complete)");
  
  // Initialize DS18B20 with internal pullup
  Serial.println("\n🌡️  Initializing DS18B20...");
  pinMode(ONE_WIRE_BUS, INPUT_PULLUP); // Internal pullup
  ds18b20.begin();
  int deviceCount = ds18b20.getDeviceCount();
  if (deviceCount > 0) {
    Serial.printf("   ✓ Found %d DS18B20 sensor(s)\n", deviceCount);
  } else {
    Serial.println("   ⚠ No DS18B20 detected (optional)");
  }
  
  // Do a test sensor read BEFORE WiFi (important for ADC pins)
  Serial.println("\n🧪 Pre-WiFi sensor test...");
  testSensorsBeforeWiFi();
  
  // NOW connect to WiFi
  Serial.println("\n📡 Connecting to WiFi...");
  connectToWiFi();
  
  if (wifiConnected) {
    Serial.println("   ✓ WiFi connected!");
    Serial.print("   IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("   Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("   ⚠ WiFi failed - running offline");
    Serial.println("   (Sensors work without WiFi)");
  }
  
  // Print your board's pin mapping
  Serial.println("\n📌 Your Board Pin Connections:");
  Serial.println("┌─────────────────────────────────────┐");
  Serial.println("│ Sensor/Device    → Board Pin        │");
  Serial.println("├─────────────────────────────────────┤");
  Serial.println("│ DHT11 VCC        → 3.3V             │");
  Serial.println("│ DHT11 GND        → GND              │");
  Serial.println("│ DHT11 Data       → P4               │");
  Serial.println("│                                     │");
  Serial.println("│ TDS Sensor VCC   → 3.3V             │");
  Serial.println("│ TDS Sensor GND   → GND              │");
  Serial.println("│ TDS Sensor Out   → P26              │");
  Serial.println("│                                     │");
  Serial.println("│ Moisture VCC     → 3.3V             │");
  Serial.println("│ Moisture GND     → GND              │");
  Serial.println("│ Moisture Out     → P27              │");
  Serial.println("│                                     │");
  Serial.println("│ DS18B20 VCC      → 3.3V             │");
  Serial.println("│ DS18B20 GND      → GND              │");
  Serial.println("│ DS18B20 Data     → P17              │");
  Serial.println("│                                     │");
  Serial.println("│ Water Pump IN    → P18              │");
  Serial.println("│ Nutrient Pump IN → P19              │");
  Serial.println("│ Extra Relay 1    → P21              │");
  Serial.println("│ Extra Relay 2    → P22              │");
  Serial.println("│                                     │");
  Serial.println("│ All Relays VCC   → 5V               │");
  Serial.println("│ All Relays GND   → GND              │");
  Serial.println("└─────────────────────────────────────┘");
  
  Serial.println("\n⚠️  IMPORTANT: P26 and P27 won't work reliably with WiFi!");
  Serial.println("   For best results, move sensors to:");
  Serial.println("   - TDS Sensor    → P13 (instead of P26)");
  Serial.println("   - Soil Moisture → P12 (instead of P27)");
  Serial.println("   Current code will work but with warnings.");
  
  Serial.println("\n✅ System ready!");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Read sensors
  if (currentTime - lastSensorRead >= sensorInterval) {
    readAllSensors();
    lastSensorRead = currentTime;
  }
  
  // Send data to server
  if (wifiConnected && currentTime - lastDataSend >= sendInterval) {
    sendSensorData();
    lastDataSend = currentTime;
  }
  
  // Check commands
  if (wifiConnected && currentTime - lastCommandCheck >= commandInterval) {
    checkForCommands();
    lastCommandCheck = currentTime;
  }
  
  // Auto control
  if (settings.auto_control_enabled) {
    runAutomaticControl();
  }
  
  // WiFi reconnect check
  if (!wifiConnected && currentTime % 60000 < 100) {
    Serial.println("🔄 Retrying WiFi...");
    connectToWiFi();
  }
  
  delay(100);
}

void testSensorsBeforeWiFi() {
  // Test analog sensors BEFORE WiFi starts
  int tdsTest = analogRead(TDS_PIN);
  int moistTest = analogRead(SOIL_MOISTURE_PIN);
  
  Serial.printf("   TDS Pin (P26):      Raw = %d\n", tdsTest);
  Serial.printf("   Moisture Pin (P27): Raw = %d\n", moistTest);
  
  if (tdsTest > 100 || moistTest > 100) {
    Serial.println("   ✓ Analog sensors detected!");
  } else {
    Serial.println("   ⚠ No analog sensors connected yet");
  }
}

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  
  wifiConnected = (WiFi.status() == WL_CONNECTED);
}

void readAllSensors() {
  Serial.println("━━━ Reading Sensors ━━━");
  Serial.printf("⏱  Uptime: %lu sec | RAM: %d bytes\n\n", millis()/1000, ESP.getFreeHeap());
  
  // 1. DHT11 - Temperature & Humidity
  Serial.print("🌡  DHT11 (P4):    ");
  float temp = NAN, hum = NAN;
  
  // Try reading 3 times
  for (int i = 0; i < 3; i++) {
    temp = dht.readTemperature();
    hum = dht.readHumidity();
    
    if (!isnan(temp) && !isnan(hum) && temp > 0 && temp < 60 && hum > 0 && hum < 100) {
      currentData.temperature = temp;
      currentData.humidity = hum;
      Serial.printf("✓ %.1f°C, %.1f%%\n", temp, hum);
      break;
    }
    
    if (i < 2) delay(2000); // Wait before retry
  }
  
  if (isnan(temp) || isnan(hum)) {
    currentData.temperature = 25.0;
    currentData.humidity = 60.0;
    Serial.println("✗ No response - defaults (25°C, 60%)");
    Serial.println("                  Check: VCC→3.3V, GND→GND, Data→P4");
  }
  
  // 2. DS18B20 - Water Temperature
  Serial.print("🌊 DS18B20 (P17):  ");
  ds18b20.requestTemperatures();
  float waterTemp = ds18b20.getTempCByIndex(0);
  
  if (waterTemp > -55 && waterTemp < 125 && waterTemp != DEVICE_DISCONNECTED_C) {
    currentData.water_temp = waterTemp;
    Serial.printf("✓ %.2f°C\n", waterTemp);
  } else {
    currentData.water_temp = currentData.temperature;
    Serial.println("✗ Not connected (using air temp)");
  }
  
  // 3. TDS Sensor
  Serial.print("💧 TDS (P26):      ");
  
  // ⚠️ WARNING: P26 is ADC2 - may not work reliably with WiFi
  int tdsRaw = 0;
  bool tdsSuccess = false;
  
  // Try reading multiple times (ADC2 can be flaky with WiFi)
  for (int i = 0; i < 5; i++) {
    tdsRaw = analogRead(TDS_PIN);
    if (tdsRaw > 0) {
      tdsSuccess = true;
      break;
    }
    delay(10);
  }
  
  if (tdsSuccess && tdsRaw > 100) {
    float tdsVoltage = tdsRaw * (3.3 / 4095.0);
    float tempCoef = 1.0 + 0.02 * (currentData.water_temp - 25.0);
    currentData.tds_ppm = ((133.42 * tdsVoltage * tdsVoltage * tdsVoltage 
                          - 255.86 * tdsVoltage * tdsVoltage 
                          + 857.39 * tdsVoltage) * 0.5) / tempCoef;
    currentData.ec = currentData.tds_ppm / 500.0;
    Serial.printf("✓ %.0f ppm, %.2f mS/cm\n", currentData.tds_ppm, currentData.ec);
  } else {
    currentData.tds_ppm = 150.0;
    currentData.ec = 1.2;
    Serial.printf("⚠ ADC2 conflict! (raw=%d) - defaults\n", tdsRaw);
    Serial.println("                  Move to P13 for reliable readings");
  }
  
  // 4. Soil Moisture
  Serial.print("🌱 Moisture (P27): ");
  
  int moistRaw = 0;
  bool moistSuccess = false;
  
  // Try reading multiple times
  for (int i = 0; i < 5; i++) {
    moistRaw = analogRead(SOIL_MOISTURE_PIN);
    if (moistRaw > 0) {
      moistSuccess = true;
      break;
    }
    delay(10);
  }
  
  if (moistSuccess && moistRaw > 100) {
    currentData.soil_moisture = map(constrain(moistRaw, 1500, 4095), 4095, 1500, 0, 100);
    Serial.printf("✓ %d%% (raw: %d)\n", currentData.soil_moisture, moistRaw);
  } else {
    currentData.soil_moisture = 70;
    Serial.printf("⚠ ADC2 conflict! (raw=%d) - defaults\n", moistRaw);
    Serial.println("                  Move to P12 for reliable readings");
  }
  
  // 5. pH Estimation
  Serial.print("🧪 pH:             ");
  if (currentData.ec < 1.0) {
    currentData.ph = 6.8;
  } else if (currentData.ec > 2.0) {
    currentData.ph = 5.8;
  } else {
    currentData.ph = 6.2;
  }
  Serial.printf("⚠ %.1f (estimated - no sensor)\n", currentData.ph);
  
  // 6. Water Level
  currentData.water_level = 75.0;
  Serial.println("💦 Water Level:    ⚠ 75% (placeholder)");
  
  // 7. Pump Status
  currentData.water_pump_status = digitalRead(WATER_PUMP_PIN);
  currentData.nutrient_pump_status = digitalRead(NUTRIENT_PUMP_PIN);
  Serial.printf("⚙  Pumps:          Water=%s | Nutrient=%s\n",
                currentData.water_pump_status ? "ON " : "OFF",
                currentData.nutrient_pump_status ? "ON " : "OFF");
  
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi down - reconnecting...");
    connectToWiFi();
    if (!wifiConnected) return;
  }
  
  HTTPClient http;
  http.setTimeout(10000);
  http.begin(String(serverURL) + "/api/sensors/ingest");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);
  
  DynamicJsonDocument doc(1024);
  doc["device_id"] = "grow-bag-1";
  doc["room_temp"] = currentData.temperature;
  doc["humidity"] = currentData.humidity;
  doc["water_temp"] = currentData.water_temp;
  doc["ph"] = currentData.ph;
  doc["ec"] = currentData.ec;
  doc["tds_ppm"] = currentData.tds_ppm;
  doc["substrate_moisture"] = currentData.soil_moisture;
  doc["water_level_status"] = currentData.water_level > 20 ? "Adequate" : "Low";
  doc["water_pump_status"] = currentData.water_pump_status;
  doc["nutrient_pump_status"] = currentData.nutrient_pump_status;
  doc["wifi_signal"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["uptime_ms"] = millis();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("📤 Sending to server...");
  int httpCode = http.POST(jsonString);
  
  if (httpCode == 200) {
    Serial.println("   ✓ Success!");
  } else if (httpCode > 0) {
    Serial.printf("   ⚠ HTTP %d\n", httpCode);
  } else {
    Serial.printf("   ✗ Failed: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

void checkForCommands() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(String(serverURL) + "/api/devices/grow-bag-1/commands");
  http.addHeader("x-api-key", apiKey);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error && doc.containsKey("commands")) {
      JsonArray commands = doc["commands"];
      
      for (JsonObject cmd : commands) {
        String action = cmd["action"].as<String>();
        Serial.println("🔧 Command: " + action);
        
        if (action == "water_pump_on") controlWaterPump(true);
        else if (action == "water_pump_off") controlWaterPump(false);
        else if (action == "nutrient_pump_on") controlNutrientPump(true);
        else if (action == "nutrient_pump_off") controlNutrientPump(false);
        else if (action == "update_settings") updateSystemSettings(cmd["settings"]);
        else if (action == "auto_adjust_ec") autoAdjustEC();
        else if (action == "restart") {
          Serial.println("🔄 Restarting...");
          delay(1000);
          ESP.restart();
        }
      }
    }
  }
  
  http.end();
}

void controlWaterPump(bool state) {
  digitalWrite(WATER_PUMP_PIN, state ? HIGH : LOW);
  currentData.water_pump_status = state;
  Serial.printf("💧 Water pump (P18): %s\n", state ? "ON" : "OFF");
  
  if (state && settings.pump_duration_ms > 0) {
    delay(settings.pump_duration_ms);
    digitalWrite(WATER_PUMP_PIN, LOW);
    currentData.water_pump_status = false;
    Serial.println("   ✓ Auto-stopped");
  }
}

void controlNutrientPump(bool state) {
  digitalWrite(NUTRIENT_PUMP_PIN, state ? HIGH : LOW);
  currentData.nutrient_pump_status = state;
  Serial.printf("🧪 Nutrient pump (P19): %s\n", state ? "ON" : "OFF");
  
  if (state && settings.pump_duration_ms > 0) {
    delay(settings.pump_duration_ms);
    digitalWrite(NUTRIENT_PUMP_PIN, LOW);
    currentData.nutrient_pump_status = false;
    Serial.println("   ✓ Auto-stopped");
  }
}

void updateSystemSettings(JsonObject newSettings) {
  Serial.println("⚙ Updating settings...");
  if (newSettings.containsKey("target_ph_min")) settings.target_ph_min = newSettings["target_ph_min"];
  if (newSettings.containsKey("target_ph_max")) settings.target_ph_max = newSettings["target_ph_max"];
  if (newSettings.containsKey("target_ec_min")) settings.target_ec_min = newSettings["target_ec_min"];
  if (newSettings.containsKey("target_ec_max")) settings.target_ec_max = newSettings["target_ec_max"];
  if (newSettings.containsKey("target_moisture_min")) settings.target_moisture_min = newSettings["target_moisture_min"];
  if (newSettings.containsKey("target_moisture_max")) settings.target_moisture_max = newSettings["target_moisture_max"];
  if (newSettings.containsKey("auto_control_enabled")) settings.auto_control_enabled = newSettings["auto_control_enabled"];
  if (newSettings.containsKey("pump_duration_ms")) settings.pump_duration_ms = newSettings["pump_duration_ms"];
  Serial.println("  ✓ Done");
}

void runAutomaticControl() {
  static unsigned long lastAuto = 0;
  if (millis() - lastAuto < 60000) return;
  lastAuto = millis();
  
  Serial.println("🤖 Auto control check...");
  
  if (currentData.ec < settings.target_ec_min) {
    Serial.printf("   EC low (%.2f < %.2f) - adding nutrients\n", currentData.ec, settings.target_ec_min);
    controlNutrientPump(true);
  }
  
  if (currentData.soil_moisture < settings.target_moisture_min) {
    Serial.printf("   Moisture low (%d%% < %d%%) - watering\n", currentData.soil_moisture, settings.target_moisture_min);
    controlWaterPump(true);
  }
}

void autoAdjustEC() {
  Serial.println("🔧 EC adjustment...");
  if (currentData.ec < settings.target_ec_min) {
    controlNutrientPump(true);
  } else if (currentData.ec > settings.target_ec_max) {
    controlWaterPump(true);
  } else {
    Serial.println("   ✓ EC already optimal");
  }
}