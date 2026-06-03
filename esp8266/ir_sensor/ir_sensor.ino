/**
 * SalineWatch — ESP8266 Firmware #1
 * IR Sensor (Drip Chamber)
 *
 * WIRING:
 *   IR sensor OUT pin  → D2 (GPIO4)
 *   IR sensor VCC      → 3.3V
 *   IR sensor GND      → GND
 *
 * SETUP:
 *   1. Install Arduino IDE
 *   2. Add ESP8266 board: https://arduino.esp8266.com/stable/package_esp8266com_index.json
 *   3. Install library: ESP8266WiFi (built-in), ESP8266HTTPClient (built-in)
 *   4. Set your WiFi credentials and server URL below
 *   5. Set the BED_ID to match the bed this ESP is installed in
 *   6. Flash and done
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

// ── CONFIGURE THESE ────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "http://YOUR_RENDER_URL.onrender.com/api/sensor";
// For local testing use: "http://192.168.1.XXX:3001/api/sensor"
const char* BED_ID        = "B-102";  // Change to the bed this ESP is in
// ──────────────────────────────────────────────────────────────────────────

const int IR_PIN         = D2;       // IR sensor output pin
const int SEND_INTERVAL  = 500;      // Check every 500ms
const int DEBOUNCE_COUNT = 3;        // Trigger after 3 consecutive same readings

String  lastSentValue    = "";
int     irregularCount   = 0;
int     normalCount      = 0;
unsigned long lastCheck  = 0;

void setup() {
  Serial.begin(115200);
  pinMode(IR_PIN, INPUT);

  Serial.println("\n[SalineWatch] IR Sensor Node starting...");
  Serial.print("[SalineWatch] Bed ID: ");
  Serial.println(BED_ID);

  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[SalineWatch] WiFi lost. Reconnecting...");
    connectWiFi();
  }

  if (millis() - lastCheck < SEND_INTERVAL) return;
  lastCheck = millis();

  // Read IR sensor
  // HIGH = object/drip detected (beam broken)
  // LOW  = no detection (beam clear — drip chamber empty or blocked)
  bool irDetected = digitalRead(IR_PIN) == HIGH;

  if (!irDetected) {
    irregularCount++;
    normalCount = 0;
  } else {
    normalCount++;
    irregularCount = 0;
  }

  // Send "warn" after 3 consecutive no-detection reads
  if (irregularCount >= DEBOUNCE_COUNT && lastSentValue != "warn") {
    Serial.println("[SalineWatch] ALERT: Irregular drip detected!");
    sendSensorData("warn");
    lastSentValue = "warn";
    irregularCount = 0;
  }

  // Send "normal" after 3 consecutive detection reads
  if (normalCount >= DEBOUNCE_COUNT && lastSentValue != "normal") {
    Serial.println("[SalineWatch] OK: Drip back to normal.");
    sendSensorData("normal");
    lastSentValue = "normal";
    normalCount = 0;
  }
}

void sendSensorData(String value) {
  WiFiClient client;
  HTTPClient http;

  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"bedId\":\"" + String(BED_ID) + "\","
                + "\"sensor\":\"ir\","
                + "\"value\":\"" + value + "\"}";

  Serial.print("[SalineWatch] Sending: ");
  Serial.println(body);

  int responseCode = http.POST(body);

  if (responseCode > 0) {
    Serial.print("[SalineWatch] Server response: ");
    Serial.println(responseCode);
  } else {
    Serial.print("[SalineWatch] Error sending: ");
    Serial.println(http.errorToString(responseCode));
  }

  http.end();
}

void connectWiFi() {
  Serial.print("[SalineWatch] Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[SalineWatch] WiFi connected!");
    Serial.print("[SalineWatch] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[SalineWatch] WiFi failed. Retrying in 5s...");
    delay(5000);
  }
}
