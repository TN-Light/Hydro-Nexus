#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server configuration
const char* serverURL = "http://your-domain.com"; // Replace with your server URL
const char* apiKey = "esp32_grow_bag_1_key_2024_secure"; // Your API key from database

// Pin definitions
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define TDS_PIN A0
#define SOIL_MOISTURE_PIN A1
#define WATER_PUMP_PIN 2
#define NUTRIENT_PUMP_PIN 3
#define RELAY_1_PIN 5  // Additional relay for future use
#define RELAY_2_PIN 6  // Additional relay for future use
#define ONE_WIRE_BUS 7 // For DS18B20 temperature sensor (alternative/backup)

// Sensor objects
DHT dht(DHT_PIN, DHT_TYPE);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
unsigned long lastCommandCheck = 0;
const unsigned long sensorInterval = 5000;    // Read sensors every 5 seconds
const unsigned long sendInterval = 30000;     // Send data every 30 seconds
const unsigned long commandInterval = 10000;  // Check for commands every 10 seconds

// Sensor data structure
struct SensorData {
  float temperature;
  float humidity;
  float tds_ppm;
  float ph;
  float ec;
  int soil_moisture;
  float water_level;
  bool water_pump_status;
  bool nutrient_pump_status;
};

// System settings (can be updated remotely)
struct SystemSettings {
  float target_ph_min = 5.5;
  float target_ph_max = 6.5;
  float target_ec_min = 1.2;
  float target_ec_max = 2.0;
  int target_moisture_min = 60;
  int target_moisture_max = 80;
  bool auto_control_enabled = true;
  int pump_duration_ms = 5000; // Default pump run time
};

SensorData currentData;
SystemSettings settings;

void setup() {
  Serial.begin(115200);
  
  // Initialize sensors
  dht.begin();
  ds18b20.begin();
  
  // Initialize pins
  pinMode(WATER_PUMP_PIN, OUTPUT);
  pinMode(NUTRIENT_PUMP_PIN, OUTPUT);
  pinMode(RELAY_1_PIN, OUTPUT);
  pinMode(RELAY_2_PIN, OUTPUT);
  
  // Ensure pumps are off initially
  digitalWrite(WATER_PUMP_PIN, LOW);
  digitalWrite(NUTRIENT_PUMP_PIN, LOW);
  digitalWrite(RELAY_1_PIN, LOW);
  digitalWrite(RELAY_2_PIN, LOW);
  
  // Connect to WiFi
  connectToWiFi();
  
  Serial.println("ESP32 Hydroponic System Initialized");
  Serial.println("Device ID: grow-bag-1");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Read sensors periodically
  if (currentTime - lastSensorRead >= sensorInterval) {
    readAllSensors();
    lastSensorRead = currentTime;
  }
  
  // Send data to server
  if (currentTime - lastDataSend >= sendInterval) {
    sendSensorData();
    lastDataSend = currentTime;
  }
  
  // Check for remote commands
  if (currentTime - lastCommandCheck >= commandInterval) {
    checkForCommands();
    lastCommandCheck = currentTime;
  }
  
  // Run automatic control if enabled
  if (settings.auto_control_enabled) {
    runAutomaticControl();
  }
  
  delay(100); // Small delay to prevent overwhelming the system
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void readAllSensors() {
  // Read DHT22 sensor
  currentData.temperature = dht.readTemperature();
  currentData.humidity = dht.readHumidity();
  
  // Read TDS sensor (PPM calculation)
  int tdsValue = analogRead(TDS_PIN);
  float voltage = tdsValue * (3.3 / 4095.0); // Convert to voltage
  currentData.tds_ppm = (133.42 * voltage * voltage * voltage 
                        - 255.86 * voltage * voltage 
                        + 857.39 * voltage) * 0.5; // TDS formula
  
  // Convert TDS to approximate EC (EC = TDS / 500)
  currentData.ec = currentData.tds_ppm / 500.0;
  
  // Approximate pH calculation (you might need a proper pH sensor)
  currentData.ph = 7.0 + (voltage - 1.65) * 2.0; // Basic approximation
  
  // Read soil moisture sensor
  int moistureValue = analogRead(SOIL_MOISTURE_PIN);
  currentData.soil_moisture = map(moistureValue, 0, 4095, 0, 100);
  
  // Read water level (placeholder - implement based on your sensor)
  currentData.water_level = 75.0; // Placeholder
  
  // Read pump statuses
  currentData.water_pump_status = digitalRead(WATER_PUMP_PIN);
  currentData.nutrient_pump_status = digitalRead(NUTRIENT_PUMP_PIN);
  
  // Print sensor data to serial for debugging
  Serial.println("=== Sensor Readings ===");
  Serial.printf("Temperature: %.1f°C\n", currentData.temperature);
  Serial.printf("Humidity: %.1f%%\n", currentData.humidity);
  Serial.printf("TDS: %.1f ppm\n", currentData.tds_ppm);
  Serial.printf("EC: %.2f mS/cm\n", currentData.ec);
  Serial.printf("pH: %.2f\n", currentData.ph);
  Serial.printf("Soil Moisture: %d%%\n", currentData.soil_moisture);
  Serial.printf("Water Pump: %s\n", currentData.water_pump_status ? "ON" : "OFF");
  Serial.printf("Nutrient Pump: %s\n", currentData.nutrient_pump_status ? "ON" : "OFF");
  Serial.println();
}

void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, attempting to reconnect...");
    connectToWiFi();
    return;
  }
  
  HTTPClient http;
  http.begin(String(serverURL) + "/api/sensors/ingest");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);
  
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["room_temp"] = currentData.temperature;
  doc["humidity"] = currentData.humidity;
  doc["ph"] = currentData.ph;
  doc["ec"] = currentData.ec;
  doc["substrate_moisture"] = currentData.soil_moisture;
  doc["water_level_status"] = currentData.water_level > 20 ? "Adequate" : "Below Required Level";
  
  // Additional data for ESP32 monitoring
  doc["tds_ppm"] = currentData.tds_ppm;
  doc["water_pump_status"] = currentData.water_pump_status;
  doc["nutrient_pump_status"] = currentData.nutrient_pump_status;
  doc["wifi_signal"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("Sending sensor data:");
  Serial.println(jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("HTTP Response: %d\n", httpResponseCode);
    Serial.println("Response: " + response);
    
    if (httpResponseCode == 200) {
      Serial.println("✅ Data sent successfully!");
    }
  } else {
    Serial.printf("❌ Error sending data: %d\n", httpResponseCode);
  }
  
  http.end();
}

void checkForCommands() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  http.begin(String(serverURL) + "/api/devices/grow-bag-1/commands");
  http.addHeader("x-api-key", apiKey);
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, response);
    
    // Process commands
    if (doc.containsKey("commands")) {
      JsonArray commands = doc["commands"];
      
      for (JsonObject command : commands) {
        String action = command["action"];
        
        Serial.println("Received command: " + action);
        
        if (action == "water_pump_on") {
          controlWaterPump(true);
        } else if (action == "water_pump_off") {
          controlWaterPump(false);
        } else if (action == "nutrient_pump_on") {
          controlNutrientPump(true);
        } else if (action == "nutrient_pump_off") {
          controlNutrientPump(false);
        } else if (action == "update_settings") {
          updateSystemSettings(command["settings"]);
        } else if (action == "auto_adjust_ph") {
          autoAdjustPH();
        } else if (action == "auto_adjust_ec") {
          autoAdjustEC();
        }
      }
    }
  }
  
  http.end();
}

void controlWaterPump(bool state) {
  digitalWrite(WATER_PUMP_PIN, state ? HIGH : LOW);
  currentData.water_pump_status = state;
  
  Serial.printf("💧 Water pump %s\n", state ? "ON" : "OFF");
  
  if (state && settings.pump_duration_ms > 0) {
    // Auto turn off after specified duration
    delay(settings.pump_duration_ms);
    digitalWrite(WATER_PUMP_PIN, LOW);
    currentData.water_pump_status = false;
    Serial.println("💧 Water pump auto-stopped");
  }
}

void controlNutrientPump(bool state) {
  digitalWrite(NUTRIENT_PUMP_PIN, state ? HIGH : LOW);
  currentData.nutrient_pump_status = state;
  
  Serial.printf("🧪 Nutrient pump %s\n", state ? "ON" : "OFF");
  
  if (state && settings.pump_duration_ms > 0) {
    // Auto turn off after specified duration
    delay(settings.pump_duration_ms);
    digitalWrite(NUTRIENT_PUMP_PIN, LOW);
    currentData.nutrient_pump_status = false;
    Serial.println("🧪 Nutrient pump auto-stopped");
  }
}

void updateSystemSettings(JsonObject newSettings) {
  if (newSettings.containsKey("target_ph_min")) {
    settings.target_ph_min = newSettings["target_ph_min"];
  }
  if (newSettings.containsKey("target_ph_max")) {
    settings.target_ph_max = newSettings["target_ph_max"];
  }
  if (newSettings.containsKey("target_ec_min")) {
    settings.target_ec_min = newSettings["target_ec_min"];
  }
  if (newSettings.containsKey("target_ec_max")) {
    settings.target_ec_max = newSettings["target_ec_max"];
  }
  if (newSettings.containsKey("auto_control_enabled")) {
    settings.auto_control_enabled = newSettings["auto_control_enabled"];
  }
  if (newSettings.containsKey("pump_duration_ms")) {
    settings.pump_duration_ms = newSettings["pump_duration_ms"];
  }
  
  Serial.println("⚙️ System settings updated");
  printCurrentSettings();
}

void runAutomaticControl() {
  static unsigned long lastAutoControl = 0;
  if (millis() - lastAutoControl < 60000) return; // Run every minute
  lastAutoControl = millis();
  
  // Check EC levels and adjust if needed
  if (currentData.ec < settings.target_ec_min) {
    Serial.println("🧪 EC too low, adding nutrients...");
    controlNutrientPump(true);
  }
  
  // Check moisture levels
  if (currentData.soil_moisture < settings.target_moisture_min) {
    Serial.println("💧 Moisture too low, watering...");
    controlWaterPump(true);
  }
  
  // pH adjustment (placeholder - requires pH adjustment solution pumps)
  if (currentData.ph < settings.target_ph_min) {
    Serial.println("📈 pH too low, needs pH up solution");
    // Add pH up pump control here
  } else if (currentData.ph > settings.target_ph_max) {
    Serial.println("📉 pH too high, needs pH down solution");
    // Add pH down pump control here
  }
}

void autoAdjustPH() {
  Serial.println("🔧 Manual pH adjustment triggered");
  // Implement pH adjustment logic based on current reading
  if (currentData.ph < settings.target_ph_min) {
    Serial.println("Adding pH up solution...");
    // Control pH up pump
  } else if (currentData.ph > settings.target_ph_max) {
    Serial.println("Adding pH down solution...");
    // Control pH down pump
  }
}

void autoAdjustEC() {
  Serial.println("🔧 Manual EC adjustment triggered");
  if (currentData.ec < settings.target_ec_min) {
    Serial.println("Adding nutrient solution...");
    controlNutrientPump(true);
  } else if (currentData.ec > settings.target_ec_max) {
    Serial.println("Adding water to dilute...");
    controlWaterPump(true);
  }
}

void printCurrentSettings() {
  Serial.println("=== Current Settings ===");
  Serial.printf("pH Range: %.1f - %.1f\n", settings.target_ph_min, settings.target_ph_max);
  Serial.printf("EC Range: %.1f - %.1f mS/cm\n", settings.target_ec_min, settings.target_ec_max);
  Serial.printf("Moisture Range: %d - %d%%\n", settings.target_moisture_min, settings.target_moisture_max);
  Serial.printf("Auto Control: %s\n", settings.auto_control_enabled ? "Enabled" : "Disabled");
  Serial.printf("Pump Duration: %d ms\n", settings.pump_duration_ms);
  Serial.println();
}