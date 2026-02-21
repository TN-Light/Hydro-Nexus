#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>  // ✅ ADD THIS for HTTPS support
#include <ArduinoJson.h>
#include <DHT.h>
#include <Preferences.h>
#include <WebServer.h>         // ✅ WiFi provisioning captive portal
#include <DNSServer.h>          // ✅ DNS for captive portal redirect

// Forward declarations (helps Arduino IDE compile reliably)
void connectToWiFi();
void testHTTPSConnection();
void testSensorsBeforeWiFi();
void readAllSensors();
void sendSensorData();
void checkForCommands();
void controlNutrientPump(bool state);
void controlPAWPump(bool state);
void updateSystemSettings(JsonObject newSettings);
void checkAndNotify();
void emergencyStop();
void startDosingCycle(int durationSeconds, const char* pumpType);
void checkDosingTimer();
void sendCommandAck(const char* commandId, const char* action, const char* status);
void sendAlert(const char* alertType, const char* message, float currentValue, float threshold);
void startWiFiProvisioning();
bool loadWiFiCredentials(String &savedSSID, String &savedPass);
void saveWiFiCredentials(const String &newSSID, const String &newPass);

// WiFi credentials — loaded from NVS (flash). If none saved, starts provisioning portal.
// To reconfigure, send "WIFI_RESET" via Serial or hold P0 (BOOT) during startup.
String wifiSSID = "";
String wifiPass = "";
const char* AP_SSID = "HydroNexus-Setup";  // Captive portal AP name
const char* AP_PASS = "hydro1234";          // Captive portal password
bool provisioningMode = false;

// Provisioning portal objects
WebServer portalServer(80);
DNSServer dnsServer;

// ===== Hydro-Nexus Server Mode =====
// Local dev uses HTTP (no certificates). Production/Vercel uses HTTPS.
// Set to 1 for local LAN testing, 0 for production.
#define HYDRONEXUS_LOCAL_DEV 1

#if HYDRONEXUS_LOCAL_DEV
const char* serverURL = "http://10.2.24.152:3000";
#else
const char* serverURL = "https://qbm-hydronet.vercel.app";
#endif

const char* apiKey = "esp32_grow_bag_1_key_2024_secure";

// ✅ SSL Certificate for Vercel (Google Trust Services Root CA)
// This certificate is valid until 2036 - no external resistors needed!
const char* root_ca = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIFVzCCAz+gAwIBAgINAgPlk28xsBNJiGuiFzANBgkqhkiG9w0BAQwFADBHMQsw\n" \
"CQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExMQzEU\n" \
"MBIGA1UEAxMLR1RTIFJvb3QgUjEwHhcNMTYwNjIyMDAwMDAwWhcNMzYwNjIyMDAw\n" \
"MDAwWjBHMQswCQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZp\n" \
"Y2VzIExMQzEUMBIGA1UEAxMLR1RTIFJvb3QgUjEwggIiMA0GCSqGSIb3DQEBAQUA\n" \
"A4ICDwAwggIKAoICAQC2EQKLHuOhd5s73L+UPreVp0A8of2C+X0yBoJx9vaMf/vo\n" \
"27xqLpeXo4xL+Sv2sfnOhB2x+cWX3u+58qPpvBKJXqeqUqv4IyfLpLGcY9vXmX7w\n" \
"Cl7raKb0xlpHDU0QM+NOsROjyBhsS+z8CZDfnWQpJSMHobWps2x5B2p5lBNQqT5e\n" \
"Q0dGlOCz2X6xCPD6HT5n6GpEBWvEWGHOUMfJ2m8Y9HIKnNuMQMFALNNWzOpbRNGF\n" \
"4p0Aa8H4fCUhvYV9aVxqpZK0LRG5KPoCbVTdFGHV4gQPCvPz8sYdJCPccE6gCJb5\n" \
"4rHwWFLMAcjCFNPqZhCGDCyLVZqZN6HhHUfZYrI0oRXnIZLKkPv5o6mVXmBjWLBh\n" \
"q3RBEcIkqLw7tMQKwK7n9v3qYZLvgJH+9kCVKdz7OvVTfFEDBqLOyg3k3T2uKAY0\n" \
"CqvxOzCPAFqDZTGJKqcYNQ4Ik+u3bNUWYKh0XYGKMgx9dD5tVlVt0HRAnVLwkDfq\n" \
"f8bCqVSiE9ULmCPkP1Xo36KFBGxYJQG8kKNHQaQhX1ypYMSPGfQPDxCZ0RJhqD5y\n" \
"E3Q4UAuvz8H6c7LFQQ9bLHKPWXLLKhJKZPQpqVQBRnNPXEQrKvV8v0r9bLzEJGNm\n" \
"aVJBmJZwVMTgCXFxLmjDLvJcTFfBJqCT6nC0w3paqVBVQIDAQABo0IwQDAOBgNV\n" \
"HQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQU5K8rJnEaK0gn\n" \
"hS9SqB5H8AoLECMwDQYJKoZIhvcNAQEMBQADggIBAJ+qQibbC5u+/x6Wki4+omVK\n" \
"api6Iz9KfweWVmq9oDPeBsZXe9dDZWDEudgPn2kwSQQU013i1xpj/uj7J6D5YNbC\n" \
"vfvkmv9z+Q6BVDP8MXCY5EQkHEPBOkQPIuHW6E8qJKQ6TmNgH5iQ9E9YLwsGPE7f\n" \
"qPQ/xNTpfZQaDBG4HSJEMJiPdPDNqNqQwIVQiUHoFwUQ0aLLaFUdtfQn2Z4FS7Hx\n" \
"gcJHvXCHaUxD1YT1zRYZnq+mU1cQhEBvM+xp3f9jsBRaqD8UOzCLQhhKH0i3VKhC\n" \
"8TQlELSKGfSZMJP5jGQRMG0U8XxYPq5fJUgEhVj2q3qQMZsXMm1OgVXVBnPzKhN8\n" \
"Y0qC0UgFUr7C0pELQQqU8LVhKGaJPaLbPRYI9LSXJ0VJKPxEQR4nJ4HhOJH1p0Wt\n" \
"DfCKLFLhJP9YQW2b0v9b6yqT0YD3vtcYdQKVpZJ8sLf3f2mPWVTQ0xchJdTaVKfJ\n" \
"wU8d3Rb3pGrZgXQeW3pXQmG9h/4OQxMqvVDJLaAG0t8njWq7hj5RwqYL0xVPg5KP\n" \
"1nFJPLKPPEJzFMqU1R+KLMW1XZNJ7qZJeV8YWgFaYHp/9cKPQQkHJSHHhFKK6z6e\n" \
"pBPMVlmH5nq4bXPXRzYjcPLJXYgWsI4W7uUvR8PCU0GkxFVQqCAJjEKpKELLLw==\n" \
"-----END CERTIFICATE-----\n";

// ✅ PIN DEFINITIONS FOR YOUR BOARD (Using "P" labels)
// DHT11 sensor (no external resistor needed - using internal pullup)
#define DHT_PIN 4              // Connect to P4
#define DHT_TYPE DHT11

// Analog sensors (ADC1 pins — all work reliably with WiFi)
#define TDS_PIN 33             // Connect to P33 (ADC1_CH5)
#define SOIL_MOISTURE_PIN 32   // Connect to P32 (ADC1_CH4)
#define PH_SENSOR_PIN 34       // Connect to P34 (ADC1_CH6)

// pH Sensor calibration (adjust after calibrating with buffer solutions)
#define PH_OFFSET 0.00         // Fine-tune offset
#define PH_SLOPE  -5.70        // Slope: (pH7_voltage - pH4_voltage) mapped

// Pump control pins (2 pumps only)
#define NUTRIENT_PUMP_PIN 19   // Connect to P19 — Nutrition Solution Pump
#define PAW_PUMP_PIN 22        // Connect to P22 — Plasma Activated Water (PAW) Pump

// Relay configuration — most relay modules are ACTIVE-LOW (LOW = ON, HIGH = OFF)
// Set to true if your relay board clicks ON when pin goes LOW
// Set to false if your relay board clicks ON when pin goes HIGH
#define RELAY_ACTIVE_LOW true
#define RELAY_ON  (RELAY_ACTIVE_LOW ? LOW : HIGH)
#define RELAY_OFF (RELAY_ACTIVE_LOW ? HIGH : LOW)

// Sensor objects
DHT dht(DHT_PIN, DHT_TYPE);

// NVS storage for device_id
Preferences prefs;
char deviceId[32] = "grow-bag-1";  // default; configure via Serial: SET_DEVICE_ID:grow-bag-3

// Timing
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
unsigned long lastCommandCheck = 0;
const unsigned long sensorInterval = 5000;
const unsigned long sendInterval = 30000;
const unsigned long commandInterval = 5000;   // Check commands every 5 seconds for fast response

// Non-blocking dosing timer state
bool dosingActive = false;
unsigned long dosingStartTime = 0;
unsigned long dosingDurationMs = 0;
String dosingPumpType = "nutrient"; // "nutrient" or "paw"

// Sensor data
struct SensorData {
  float temperature;
  float humidity;
  float tds_ppm;
  float ph;
  float ec;
  int soil_moisture;
  float water_level;
  bool nutrient_pump_status;
  bool paw_pump_status;
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
  // *** CRITICAL: Set relay pins OFF immediately to prevent pumps activating during boot ***
  // Must happen BEFORE Serial.begin() and delay() — pins float during boot and can trigger relays
  pinMode(NUTRIENT_PUMP_PIN, OUTPUT);
  pinMode(PAW_PUMP_PIN, OUTPUT);
  digitalWrite(NUTRIENT_PUMP_PIN, RELAY_OFF);
  digitalWrite(PAW_PUMP_PIN, RELAY_OFF);

  Serial.begin(115200);
  delay(2000); // Give serial time to start
  
  Serial.println("\n\n╔════════════════════════════════════════╗");
  Serial.println("║  ESP32 Hydroponic System v4.0         ║");
  Serial.println("║  2-Pump + Notify-Only (No Auto-Dose)  ║");

  // Load device_id from NVS
  prefs.begin("qbm", false);
  String savedId = prefs.getString("device_id", "grow-bag-1");
  savedId.toCharArray(deviceId, sizeof(deviceId));
  prefs.end();
  Serial.printf("║  Device: %-30s║\n", deviceId);
  Serial.println("╚════════════════════════════════════════╝\n");
  
  // Confirm GPIO pins already set above
  Serial.println("⚙️  Setting up pins...");
  Serial.printf("   Relay mode: %s (RELAY_ON=%s, RELAY_OFF=%s)\n",
    RELAY_ACTIVE_LOW ? "ACTIVE-LOW" : "ACTIVE-HIGH",
    RELAY_ON == LOW ? "LOW" : "HIGH",
    RELAY_OFF == LOW ? "LOW" : "HIGH");
  Serial.println("   ✓ All pumps OFF");
  
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
    
    // ✅ Test HTTPS connection (only for production)
#if !HYDRONEXUS_LOCAL_DEV
    Serial.println("\n🔐 Testing HTTPS connection to Vercel...");
    testHTTPSConnection();
#endif
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
  Serial.println("│ TDS Sensor Out   → P33 (ADC1)       │");
  Serial.println("│                                     │");
  Serial.println("│ pH Sensor VCC    → 5V               │");
  Serial.println("│ pH Sensor GND    → GND              │");
  Serial.println("│ pH Sensor Out    → P34              │");
  Serial.println("│                                     │");
  Serial.println("│ Moisture VCC     → 3.3V             │");
  Serial.println("│ Moisture GND     → GND              │");
  Serial.println("│ Moisture Out     → P32 (ADC1)       │");
  Serial.println("│                                     │");
  Serial.println("│ Nutrition Pump   → P19              │");
  Serial.println("│ PAW Pump         → P22              │");
  Serial.println("│                                     │");
  Serial.println("│ All Relays VCC   → 5V               │");
  Serial.println("│ All Relays GND   → GND              │");
  Serial.println("└─────────────────────────────────────┘");
  
  Serial.println("\n✅ All analog sensors on ADC1 — reliable with WiFi!");
  Serial.println("   TDS → P33, Moisture → P32, pH → P34");
  
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
  
  // Check if a timed dosing cycle needs to stop
  checkDosingTimer();

  // Threshold monitoring (notification-only, no auto-dosing)
  if (settings.auto_control_enabled) {
    runAutomaticControl();  // Now only sends alerts, never activates pumps
  }
  
  // WiFi reconnect check
  if (!wifiConnected && currentTime % 60000 < 100) {
    Serial.println("🔄 Retrying WiFi...");
    connectToWiFi();
  }

  // Serial command handler — send "SET_DEVICE_ID:grow-bag-3" to configure this board
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.startsWith("SET_DEVICE_ID:")) {
      String newId = cmd.substring(14);
      newId.trim();
      if (newId.length() > 0 && newId.length() < 32) {
        newId.toCharArray(deviceId, sizeof(deviceId));
        prefs.begin("qbm", false);
        prefs.putString("device_id", newId);
        prefs.end();
        Serial.printf("✅ Device ID set to: %s (saved to NVS)\n", deviceId);
      } else {
        Serial.println("❌ Invalid device ID (must be 1-31 chars)");
      }
    } else if (cmd == "GET_DEVICE_ID") {
      Serial.printf("📟 Current device ID: %s\n", deviceId);
    } else if (cmd == "WIFI_RESET") {
      Serial.println("🔄 Clearing WiFi credentials and restarting...");
      prefs.begin("wifi", false);
      prefs.remove("ssid");
      prefs.remove("pass");
      prefs.end();
      delay(500);
      ESP.restart();
    } else if (cmd == "WIFI_STATUS") {
      Serial.printf("📡 WiFi: %s | SSID: %s | IP: %s | RSSI: %d dBm\n",
                     wifiConnected ? "Connected" : "Disconnected",
                     wifiSSID.c_str(),
                     WiFi.localIP().toString().c_str(),
                     WiFi.RSSI());
    }
  }

  delay(100);
}

void testSensorsBeforeWiFi() {
  // Test analog sensors BEFORE WiFi starts
  int tdsTest = analogRead(TDS_PIN);
  int moistTest = analogRead(SOIL_MOISTURE_PIN);
  
  Serial.printf("   TDS Pin (P33):      Raw = %d\n", tdsTest);
  Serial.printf("   Moisture Pin (P32): Raw = %d\n", moistTest);
  
  if (tdsTest > 100 || moistTest > 100) {
    Serial.println("   ✓ Analog sensors detected!");
  } else {
    Serial.println("   ⚠ No analog sensors connected yet");
  }
}

// ─── WiFi Credential Management (NVS) ───

bool loadWiFiCredentials(String &savedSSID, String &savedPass) {
  prefs.begin("wifi", true);
  savedSSID = prefs.getString("ssid", "");
  savedPass = prefs.getString("pass", "");
  prefs.end();
  return savedSSID.length() > 0;
}

void saveWiFiCredentials(const String &newSSID, const String &newPass) {
  prefs.begin("wifi", false);
  prefs.putString("ssid", newSSID);
  prefs.putString("pass", newPass);
  prefs.end();
  Serial.printf("✅ WiFi credentials saved: %s\n", newSSID.c_str());
}

// ─── WiFi Provisioning Captive Portal ───

void startWiFiProvisioning() {
  provisioningMode = true;
  Serial.println("\n📡 Starting WiFi Provisioning Portal...");
  Serial.printf("   AP Name: %s\n", AP_SSID);
  Serial.printf("   AP Pass: %s\n", AP_PASS);
  
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  delay(100);
  
  Serial.print("   Portal IP: ");
  Serial.println(WiFi.softAPIP());
  
  // DNS redirect all domains to portal
  dnsServer.start(53, "*", WiFi.softAPIP());
  
  // Serve config page
  portalServer.on("/", HTTP_GET, []() {
    String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>";
    html += "<title>HydroNexus WiFi Setup</title>";
    html += "<style>body{font-family:sans-serif;max-width:400px;margin:40px auto;padding:20px;background:#0a1a0f;color:#22c55e}";
    html += "input,button{width:100%;padding:12px;margin:8px 0;border-radius:8px;border:1px solid #22c55e;font-size:16px;box-sizing:border-box}";
    html += "input{background:#0d2818;color:#fff}button{background:#22c55e;color:#000;cursor:pointer;font-weight:bold}";
    html += "h1{text-align:center}p{color:#86efac;font-size:14px}</style></head><body>";
    html += "<h1>🌱 HydroNexus WiFi</h1>";
    html += "<p>Connect your ESP32 grow controller to your WiFi network.</p>";
    html += "<form action='/save' method='POST'>";
    html += "<label>WiFi SSID:</label><input name='ssid' placeholder='Your WiFi name' required>";
    html += "<label>WiFi Password:</label><input name='pass' type='password' placeholder='WiFi password'>";
    html += "<label>Server URL (optional):</label><input name='server' placeholder='http://192.168.1.100:3000'>";
    html += "<button type='submit'>Save & Connect</button></form></body></html>";
    portalServer.send(200, "text/html", html);
  });
  
  portalServer.on("/save", HTTP_POST, []() {
    String newSSID = portalServer.arg("ssid");
    String newPass = portalServer.arg("pass");
    String newServer = portalServer.arg("server");
    
    if (newSSID.length() == 0) {
      portalServer.send(400, "text/html", "<h1>Error:</h1><p>SSID is required</p><a href='/'>Back</a>");
      return;
    }
    
    saveWiFiCredentials(newSSID, newPass);
    
    // Save server URL if provided
    if (newServer.length() > 0) {
      prefs.begin("wifi", false);
      prefs.putString("server", newServer);
      prefs.end();
    }
    
    String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>";
    html += "<style>body{font-family:sans-serif;max-width:400px;margin:40px auto;padding:20px;background:#0a1a0f;color:#22c55e;text-align:center}</style></head><body>";
    html += "<h1>✅ Saved!</h1><p>ESP32 will now restart and connect to: " + newSSID + "</p>";
    html += "<p>This portal will close.</p></body></html>";
    portalServer.send(200, "text/html", html);
    
    delay(2000);
    ESP.restart();
  });
  
  // Captive portal detection endpoints
  portalServer.onNotFound([]() {
    portalServer.sendHeader("Location", "http://" + WiFi.softAPIP().toString(), true);
    portalServer.send(302, "text/plain", "");
  });
  
  portalServer.begin();
  Serial.println("   ✓ Portal running! Connect to AP and visit 192.168.4.1");
  
  // Block in provisioning mode until credentials saved
  while (provisioningMode) {
    dnsServer.processNextRequest();
    portalServer.handleClient();
    delay(10);
  }
}

void connectToWiFi() {
  // Load credentials from NVS
  if (!loadWiFiCredentials(wifiSSID, wifiPass)) {
    Serial.println("   ⚠ No WiFi credentials saved!");
    startWiFiProvisioning();
    return;
  }
  
  // Check if BOOT button (P0) is held during startup for re-provisioning
  pinMode(0, INPUT_PULLUP);
  if (digitalRead(0) == LOW) {
    Serial.println("   🔄 BOOT button held — entering WiFi setup mode");
    delay(2000);
    if (digitalRead(0) == LOW) {
      startWiFiProvisioning();
      return;
    }
  }
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSSID.c_str(), wifiPass.c_str());
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  
  wifiConnected = (WiFi.status() == WL_CONNECTED);
  
  // If connection failed, offer provisioning
  if (!wifiConnected) {
    Serial.println("   ⚠ WiFi connection failed with saved credentials");
    Serial.println("   Send 'WIFI_RESET' via Serial to reconfigure");
  }
}

void testHTTPSConnection() {
  WiFiClientSecure *client = new WiFiClientSecure;
  if(client) {
    client->setCACert(root_ca);
    
    HTTPClient https;
    
    if (https.begin(*client, String(serverURL) + "/api/sensors/ingest")) {
      https.addHeader("Content-Type", "application/json");
      https.addHeader("x-api-key", apiKey);
      
      // Send test GET request
      int httpCode = https.GET();
      
      if (httpCode > 0) {
        Serial.printf("   ✓ HTTPS connection OK (code: %d)\n", httpCode);
        if (httpCode == 200) {
          String response = https.getString();
          Serial.println("   Response: " + response.substring(0, 100));
        }
      } else {
        Serial.printf("   ✗ HTTPS failed: %s\n", https.errorToString(httpCode).c_str());
      }
      
      https.end();
    } else {
      Serial.println("   ✗ Unable to connect to server");
    }
    
    delete client;
  } else {
    Serial.println("   ✗ Unable to create secure client");
  }
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
  
  // 2. TDS Sensor (P33 — ADC1, reliable with WiFi)
  Serial.print("💧 TDS (P33):      ");
  int tdsRaw = 0;
  
  // Average multiple readings for stability
  long tdsSum = 0;
  for (int i = 0; i < 5; i++) {
    tdsSum += analogRead(TDS_PIN);
    delay(10);
  }
  tdsRaw = tdsSum / 5;
  
  if (tdsRaw > 100) {
    float tdsVoltage = tdsRaw * (3.3 / 4095.0);
    float tempCoef = 1.0 + 0.02 * (currentData.temperature - 25.0);
    currentData.tds_ppm = ((133.42 * tdsVoltage * tdsVoltage * tdsVoltage 
                          - 255.86 * tdsVoltage * tdsVoltage 
                          + 857.39 * tdsVoltage) * 0.5) / tempCoef;
    currentData.ec = currentData.tds_ppm / 500.0;
    Serial.printf("✓ %.0f ppm, %.2f mS/cm (raw=%d)\n", currentData.tds_ppm, currentData.ec, tdsRaw);
  } else {
    currentData.tds_ppm = 150.0;
    currentData.ec = 1.2;
    Serial.printf("⚠ No signal (raw=%d) — check wiring\n", tdsRaw);
  }
  
  // 4. Soil Moisture (P32 — ADC1, reliable with WiFi)
  Serial.print("🌱 Moisture (P32): ");
  
  // Average multiple readings for stability
  long moistSum = 0;
  for (int i = 0; i < 5; i++) {
    moistSum += analogRead(SOIL_MOISTURE_PIN);
    delay(10);
  }
  int moistRaw = moistSum / 5;
  
  if (moistRaw > 100) {
    currentData.soil_moisture = map(constrain(moistRaw, 1500, 4095), 4095, 1500, 0, 100);
    Serial.printf("✓ %d%% (raw: %d)\n", currentData.soil_moisture, moistRaw);
  } else {
    currentData.soil_moisture = 70;
    Serial.printf("⚠ No signal (raw=%d) — check wiring\n", moistRaw);
  }
  
  // 5. pH Sensor (real analog reading from P34)
  Serial.print("🧪 pH (P34):        ");
  int phRaw = 0;
  bool phSensorPresent = false;
  
  // Average multiple readings for stability
  long phSum = 0;
  for (int i = 0; i < 10; i++) {
    phSum += analogRead(PH_SENSOR_PIN);
    delay(10);
  }
  phRaw = phSum / 10;
  
  if (phRaw > 500 && phRaw < 3500) {
    // Real pH sensor detected — convert voltage to pH
    float phVoltage = phRaw * (3.3 / 4095.0);
    // Standard pH probe: pH = 7.0 + ((2.5 - voltage) / 0.18)
    // Adjust PH_OFFSET and PH_SLOPE after calibration with pH 4.0 and 7.0 buffers
    currentData.ph = 7.0 + ((2.5 - phVoltage) * PH_SLOPE) + PH_OFFSET;
    currentData.ph = constrain(currentData.ph, 0.0, 14.0);
    phSensorPresent = true;
    Serial.printf("✓ %.2f (V=%.3f, raw=%d)\n", currentData.ph, phVoltage, phRaw);
  } else {
    // No pH sensor connected — estimate from EC
    // (raw < 500 is just pin noise, not a real sensor)
    if (currentData.ec < 1.0) {
      currentData.ph = 6.8;
    } else if (currentData.ec > 2.0) {
      currentData.ph = 5.8;
    } else {
      currentData.ph = 6.2;
    }
    Serial.printf("⚠ %.1f (estimated from EC — no pH sensor)\n", currentData.ph);
    Serial.printf("                    (raw=%d is noise, need >500 for real sensor)\n", phRaw);
  }
  
  // 6. Water Level
  currentData.water_level = 75.0;
  Serial.println("💦 Water Level:    ⚠ 75% (placeholder)");
  
  // 7. Pump Status — use RELAY_ON to determine if pump is actually running
  currentData.nutrient_pump_status = (digitalRead(NUTRIENT_PUMP_PIN) == RELAY_ON);
  currentData.paw_pump_status = (digitalRead(PAW_PUMP_PIN) == RELAY_ON);
  Serial.printf("⚙  Pumps:          Nutrition=%s | PAW=%s\n",
                currentData.nutrient_pump_status ? "ON " : "OFF",
                currentData.paw_pump_status ? "ON " : "OFF");
  
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi down - reconnecting...");
    connectToWiFi();
    if (!wifiConnected) return;
  }

  DynamicJsonDocument doc(1024);
  doc["device_id"] = deviceId;
  doc["room_temp"] = currentData.temperature;
  doc["humidity"] = currentData.humidity;
  doc["ph"] = currentData.ph;
  doc["ec"] = currentData.ec;
  doc["tds_ppm"] = currentData.tds_ppm;
  doc["substrate_moisture"] = currentData.soil_moisture;
  doc["water_level_status"] = currentData.water_level > 20 ? "Adequate" : "Low";
  doc["nutrient_pump_status"] = currentData.nutrient_pump_status;
  doc["paw_pump_status"] = currentData.paw_pump_status;
  doc["wifi_signal"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["uptime_ms"] = millis();
  
  // Sensor position: bags are interconnected, sensors placed at first & last bag
  // Configure device_id as "grow-bag-1" (first) or "grow-bag-6" (last) via Serial
  doc["sensor_position"] = String(deviceId).indexOf("1") >= 0 ? "first_bag" : "last_bag";

  String jsonString;
  serializeJson(doc, jsonString);

#if HYDRONEXUS_LOCAL_DEV
  WiFiClient client;
  HTTPClient http;
  http.setTimeout(15000);

  Serial.println("📤 Sending to Hydro-Nexus (LOCAL HTTP)...");
  Serial.println("   URL: " + String(serverURL) + "/api/sensors/ingest");
  Serial.println("   Data: " + jsonString.substring(0, 100) + "...");

  if (http.begin(client, String(serverURL) + "/api/sensors/ingest")) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", apiKey);
    int httpCode = http.POST(jsonString);

    if (httpCode == 200) {
      String response = http.getString();
      Serial.println("   ✓ Success! Response:");
      Serial.println("   " + response.substring(0, 150));
    } else if (httpCode > 0) {
      Serial.printf("   ⚠ HTTP %d\n", httpCode);
      Serial.println("   Response: " + http.getString());
    } else {
      Serial.printf("   ✗ Failed: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
  } else {
    Serial.println("   ✗ Unable to connect to server");
  }
#else
  // Create secure client with certificate
  WiFiClientSecure *client = new WiFiClientSecure;
  if(!client) {
    Serial.println("❌ Failed to create secure client");
    return;
  }

  client->setCACert(root_ca);

  HTTPClient https;
  https.setTimeout(15000); // Increase timeout for HTTPS

  if (https.begin(*client, String(serverURL) + "/api/sensors/ingest")) {
    https.addHeader("Content-Type", "application/json");
    https.addHeader("x-api-key", apiKey);

    Serial.println("📤 Sending to Vercel (HTTPS)...");
    Serial.println("   Data: " + jsonString.substring(0, 100) + "...");

    int httpCode = https.POST(jsonString);

    if (httpCode == 200) {
      String response = https.getString();
      Serial.println("   ✓ Success! Response:");
      Serial.println("   " + response.substring(0, 150));
    } else if (httpCode > 0) {
      Serial.printf("   ⚠ HTTP %d\n", httpCode);
      Serial.println("   Response: " + https.getString());
    } else {
      Serial.printf("   ✗ Failed: %s\n", https.errorToString(httpCode).c_str());
    }

    https.end();
  } else {
    Serial.println("   ✗ Unable to connect to server");
  }

  delete client;
#endif
}

void checkForCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

#if HYDRONEXUS_LOCAL_DEV
  WiFiClient client;
  HTTPClient http;
  http.setTimeout(10000);

  if (http.begin(client, String(serverURL) + "/api/devices/grow-bag-1/commands")) {
    http.addHeader("x-api-key", apiKey);

    int httpCode = http.GET();
    
    if (httpCode == 200) {
      String response = http.getString();
      DynamicJsonDocument doc(2048);
      DeserializationError error = deserializeJson(doc, response);
      
      if (error) {
        Serial.printf("⚠ JSON parse error: %s\n", error.c_str());
        Serial.printf("   Response: %.100s\n", response.c_str());
      } else if (!doc.containsKey("commands")) {
        Serial.println("⚠ Response has no 'commands' key");
      } else {
        JsonArray commands = doc["commands"];
        Serial.printf("📋 Received %d command(s)\n", commands.size());
        
        for (JsonObject cmd : commands) {
          String action = cmd["action"].as<String>();
          const char* cmdId = cmd["command_id"] | cmd["id"] | "unknown";
          Serial.println("═══════════════════════════════════");
          Serial.println("🔧 EXECUTING Command: " + action);
          Serial.printf("   Command ID: %s\n", cmdId);
          
          // Read parameters object (dashboard sends {parameters: {duration: X, pump_type: "nutrient"|"paw"}})
          JsonObject params = cmd["parameters"];
          int duration = params["duration"] | cmd["duration"] | 10;
          const char* pumpType = params["pump_type"] | "nutrient";

          if (action == "nutrient_pump_on") { controlNutrientPump(true); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "nutrient_pump_off") { controlNutrientPump(false); if (dosingActive && dosingPumpType == "nutrient") { dosingActive = false; Serial.println("   Dosing timer cancelled by OFF command"); } sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "relay2_on" || action == "paw_pump_on") { controlPAWPump(true); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "relay2_off" || action == "paw_pump_off") { controlPAWPump(false); if (dosingActive && dosingPumpType == "paw") { dosingActive = false; Serial.println("   Dosing timer cancelled by OFF command"); } sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "emergency_stop") { emergencyStop(); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "manual_dosing_cycle") { startDosingCycle(duration, pumpType); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "update_settings") { updateSystemSettings(cmd["settings"]); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "check_ec") { autoAdjustEC(); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "check_ph") { autoAdjustPH(); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "restart") {
            sendCommandAck(cmdId, action.c_str(), "executed");
            Serial.println("🔄 Restarting...");
            delay(1000);
            ESP.restart();
          }
          else {
            Serial.printf("   ⚠ UNKNOWN action: '%s' — skipped\n", action.c_str());
          }
          Serial.println("═══════════════════════════════════");
        }
      }
    } else if (httpCode > 0) {
      Serial.printf("⚠ Command check failed: HTTP %d\n", httpCode);
    } else {
      Serial.printf("⚠ Command check: connection error (%d)\n", httpCode);
    }

    http.end();
  }
#else
  WiFiClientSecure *client = new WiFiClientSecure;
  if(!client) return;

  client->setCACert(root_ca);

  HTTPClient https;
  https.setTimeout(10000);

  if (https.begin(*client, String(serverURL) + "/api/devices/" + String(deviceId) + "/commands")) {
    https.addHeader("x-api-key", apiKey);

    int httpCode = https.GET();

    if (httpCode == 200) {
      String response = https.getString();
      DynamicJsonDocument doc(2048);
      DeserializationError error = deserializeJson(doc, response);

      if (error) {
        Serial.printf("⚠ JSON parse error: %s\n", error.c_str());
        Serial.printf("   Response: %.100s\n", response.c_str());
      } else if (!doc.containsKey("commands")) {
        Serial.println("⚠ Response has no 'commands' key");
      } else {
        JsonArray commands = doc["commands"];
        Serial.printf("📋 Received %d command(s)\n", commands.size());

        for (JsonObject cmd : commands) {
          String action = cmd["action"].as<String>();
          const char* cmdId = cmd["command_id"] | cmd["id"] | "unknown";
          Serial.println("═══════════════════════════════════");
          Serial.println("🔧 EXECUTING Command: " + action);
          Serial.printf("   Command ID: %s\n", cmdId);

          // Read parameters object (dashboard sends {parameters: {duration: X, pump_type: "nutrient"|"paw"}})
          JsonObject params = cmd["parameters"];
          int duration = params["duration"] | cmd["duration"] | 10;
          const char* pumpType = params["pump_type"] | "nutrient";

          if (action == "nutrient_pump_on") { controlNutrientPump(true); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "nutrient_pump_off") { controlNutrientPump(false); if (dosingActive && dosingPumpType == "nutrient") { dosingActive = false; Serial.println("   Dosing timer cancelled by OFF command"); } sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "relay2_on" || action == "paw_pump_on") { controlPAWPump(true); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "relay2_off" || action == "paw_pump_off") { controlPAWPump(false); if (dosingActive && dosingPumpType == "paw") { dosingActive = false; Serial.println("   Dosing timer cancelled by OFF command"); } sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "emergency_stop") { emergencyStop(); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "manual_dosing_cycle") { startDosingCycle(duration, pumpType); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "update_settings") { updateSystemSettings(cmd["settings"]); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "check_ec") { autoAdjustEC(); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "check_ph") { autoAdjustPH(); sendCommandAck(cmdId, action.c_str(), "executed"); }
          else if (action == "restart") {
            sendCommandAck(cmdId, action.c_str(), "executed");
            Serial.println("🔄 Restarting...");
            delay(1000);
            ESP.restart();
          }
          else {
            Serial.printf("   ⚠ UNKNOWN action: '%s' — skipped\n", action.c_str());
          }
          Serial.println("═══════════════════════════════════");
        }
      }
    } else if (httpCode > 0) {
      Serial.printf("⚠ Command check failed: HTTP %d\n", httpCode);
    } else {
      Serial.printf("⚠ Command check: connection error (%d)\n", httpCode);
    }

    https.end();
  }

  delete client;
#endif

}

void controlWaterPump(bool state) {
  // DEPRECATED: Water pump removed in v4.0 (only Nutrition + PAW pumps)
  Serial.println("⚠ controlWaterPump() is deprecated — use controlNutrientPump()");
  controlNutrientPump(state);
}

void controlNutrientPump(bool state) {
  int pinVal = state ? RELAY_ON : RELAY_OFF;
  digitalWrite(NUTRIENT_PUMP_PIN, pinVal);
  currentData.nutrient_pump_status = state;
  Serial.printf("🧪 Nutrient pump (P19): %s  [pin=%s]\n", 
    state ? "ON" : "OFF", pinVal == LOW ? "LOW" : "HIGH");
  
  // Verify the pin state was actually set
  int readBack = digitalRead(NUTRIENT_PUMP_PIN);
  Serial.printf("   Pin readback: %s\n", readBack == LOW ? "LOW" : "HIGH");
  
  // NOTE: No auto-stop. Pump stays ON until explicit OFF command.
  // For timed dosing, use 'manual_dosing_cycle' command instead.
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
  // v4.0: Notification-only — no auto-dosing.
  // Instead of activating pumps, send alerts to the server when values are out of range.
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck < 60000) return;
  lastCheck = millis();
  
  Serial.println("📡 Checking thresholds (notification-only)...");
  
  if (currentData.ec < settings.target_ec_min) {
    Serial.printf("   ⚠ EC low (%.2f < %.2f) — sending notification\n", currentData.ec, settings.target_ec_min);
    sendAlert("ec_low", "EC/PPM below target — add nutrient solution", currentData.ec, settings.target_ec_min);
  }
  
  if (currentData.ec > settings.target_ec_max) {
    Serial.printf("   ⚠ EC high (%.2f > %.2f) — sending notification\n", currentData.ec, settings.target_ec_max);
    sendAlert("ec_high", "EC/PPM above target — dilute solution", currentData.ec, settings.target_ec_max);
  }
  
  if (currentData.soil_moisture < settings.target_moisture_min) {
    Serial.printf("   ⚠ Moisture low (%d%% < %d%%) — sending notification\n", currentData.soil_moisture, settings.target_moisture_min);
    sendAlert("moisture_low", "Substrate moisture below target", (float)currentData.soil_moisture, (float)settings.target_moisture_min);
  }
  
  if (currentData.ph < settings.target_ph_min) {
    Serial.printf("   ⚠ pH low (%.2f < %.2f) — sending notification\n", currentData.ph, settings.target_ph_min);
    sendAlert("ph_low", "pH below target range", currentData.ph, settings.target_ph_min);
  }
  
  if (currentData.ph > settings.target_ph_max) {
    Serial.printf("   ⚠ pH high (%.2f > %.2f) — sending notification\n", currentData.ph, settings.target_ph_max);
    sendAlert("ph_high", "pH above target range", currentData.ph, settings.target_ph_max);
  }
}

// v4.0: Notification-only — no auto-adjust. Just send alerts.
void autoAdjustEC() {
  Serial.println("🔔 EC check (notification-only)...");
  if (currentData.ec < settings.target_ec_min) {
    sendAlert("ec_low", "EC/PPM below target — add nutrient solution manually", currentData.ec, settings.target_ec_min);
  } else if (currentData.ec > settings.target_ec_max) {
    sendAlert("ec_high", "EC/PPM above target — dilute solution manually", currentData.ec, settings.target_ec_max);
  } else {
    Serial.println("   ✓ EC already optimal");
  }
}

void autoAdjustPH() {
  Serial.println("🔔 pH check (notification-only)...");
  if (currentData.ph >= settings.target_ph_min && currentData.ph <= settings.target_ph_max) {
    Serial.println("   ✓ pH already optimal");
  } else if (currentData.ph < settings.target_ph_min) {
    sendAlert("ph_low", "pH below target — adjust manually", currentData.ph, settings.target_ph_min);
  } else {
    sendAlert("ph_high", "pH above target — adjust manually", currentData.ph, settings.target_ph_max);
  }
}

void controlPAWPump(bool state) {
  int pinVal = state ? RELAY_ON : RELAY_OFF;
  digitalWrite(PAW_PUMP_PIN, pinVal);
  currentData.paw_pump_status = state;
  Serial.printf("⚡ PAW Pump (P22): %s  [pin=%s]\n", 
    state ? "ON" : "OFF", pinVal == LOW ? "LOW" : "HIGH");
  
  // Verify the pin state was actually set
  int readBack = digitalRead(PAW_PUMP_PIN);
  Serial.printf("   Pin readback: %s\n", readBack == LOW ? "LOW" : "HIGH");
}

void emergencyStop() {
  Serial.println("🛑 EMERGENCY STOP — all outputs OFF");
  // Cancel any active dosing timer
  if (dosingActive) {
    dosingActive = false;
    Serial.println("   Dosing timer cancelled");
  }
  controlNutrientPump(false);
  controlPAWPump(false);
  Serial.println("   ✓ All pumps OFF");
}

// Non-blocking timed dosing: starts the pump and sets a timer.
// checkDosingTimer() in loop() will auto-stop when time expires.
void startDosingCycle(int durationSeconds, const char* pumpType) {
  dosingDurationMs = (unsigned long)durationSeconds * 1000;
  dosingStartTime = millis();
  dosingPumpType = String(pumpType);
  dosingActive = true;

  Serial.printf("🧪 Timed dosing: %d s on %s pump\n", durationSeconds, pumpType);

  if (dosingPumpType == "paw") {
    controlPAWPump(true);
  } else {
    controlNutrientPump(true);
  }
}

// Called every loop() iteration — checks if dosing timer has expired
void checkDosingTimer() {
  if (!dosingActive) return;

  unsigned long elapsed = millis() - dosingStartTime;
  if (elapsed >= dosingDurationMs) {
    Serial.printf("⏱ Dosing timer expired (%lu ms). Stopping %s pump.\n", dosingDurationMs, dosingPumpType.c_str());
    if (dosingPumpType == "paw") {
      controlPAWPump(false);
    } else {
      controlNutrientPump(false);
    }
    dosingActive = false;
    Serial.println("   ✓ Timed dosing cycle complete");
  }
}

// ─── Command Acknowledgment ───
// After executing a command, POST back to the server to confirm execution.

void sendCommandAck(const char* commandId, const char* action, const char* status) {
  if (WiFi.status() != WL_CONNECTED) return;

  DynamicJsonDocument ackDoc(256);
  ackDoc["commandId"] = commandId;
  ackDoc["action"] = action;
  ackDoc["status"] = status;     // "executed" | "failed"
  ackDoc["device_id"] = deviceId;
  ackDoc["timestamp"] = millis();
  
  String ackJson;
  serializeJson(ackDoc, ackJson);

#if HYDRONEXUS_LOCAL_DEV
  WiFiClient client;
  HTTPClient http;
  http.setTimeout(5000);
  
  String url = String(serverURL) + "/api/devices/" + String(deviceId) + "/commands/ack";
  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", apiKey);
    int code = http.POST(ackJson);
    if (code == 200) {
      Serial.printf("   ✓ ACK sent for: %s\n", action);
    } else {
      Serial.printf("   ⚠ ACK failed (HTTP %d)\n", code);
    }
    http.end();
  }
#else
  WiFiClientSecure *secClient = new WiFiClientSecure;
  if (!secClient) return;
  secClient->setCACert(root_ca);
  HTTPClient https;
  https.setTimeout(5000);
  
  String url = String(serverURL) + "/api/devices/" + String(deviceId) + "/commands/ack";
  if (https.begin(*secClient, url)) {
    https.addHeader("Content-Type", "application/json");
    https.addHeader("x-api-key", apiKey);
    int code = https.POST(ackJson);
    if (code == 200) {
      Serial.printf("   ✓ ACK sent for: %s\n", action);
    } else {
      Serial.printf("   ⚠ ACK failed (HTTP %d)\n", code);
    }
    https.end();
  }
  delete secClient;
#endif
}

// ─── Alert Notification ───
// Send an alert to the server when sensor values are out of range.
// The server can then trigger email/push notifications.

void sendAlert(const char* alertType, const char* message, float currentValue, float threshold) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf("   ⚠ WiFi down — alert not sent: %s\n", alertType);
    return;
  }

  DynamicJsonDocument alertDoc(512);
  alertDoc["device_id"] = deviceId;
  alertDoc["alert_type"] = alertType;
  alertDoc["message"] = message;
  alertDoc["current_value"] = currentValue;
  alertDoc["threshold"] = threshold;
  alertDoc["timestamp"] = millis();
  
  String alertJson;
  serializeJson(alertDoc, alertJson);

#if HYDRONEXUS_LOCAL_DEV
  WiFiClient client;
  HTTPClient http;
  http.setTimeout(5000);
  
  String url = String(serverURL) + "/api/notifications/alert";
  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", apiKey);
    int code = http.POST(alertJson);
    if (code == 200) {
      Serial.printf("   ✓ Alert sent: %s\n", alertType);
    } else {
      Serial.printf("   ⚠ Alert failed (HTTP %d)\n", code);
    }
    http.end();
  }
#else
  WiFiClientSecure *secClient = new WiFiClientSecure;
  if (!secClient) return;
  secClient->setCACert(root_ca);
  HTTPClient https;
  https.setTimeout(5000);
  
  String url = String(serverURL) + "/api/notifications/alert";
  if (https.begin(*secClient, url)) {
    https.addHeader("Content-Type", "application/json");
    https.addHeader("x-api-key", apiKey);
    int code = https.POST(alertJson);
    if (code == 200) {
      Serial.printf("   ✓ Alert sent: %s\n", alertType);
    } else {
      Serial.printf("   ⚠ Alert failed (HTTP %d)\n", code);
    }
    https.end();
  }
  delete secClient;
#endif
}