/**
 * SalineWatch — ESP8266 Firmware #2
 * Colour Sensor (Saline Pipe) — TCS34725
 * 
 * WIRING (TCS34725):
 *   SDA → D2 (GPIO4)
 *   SCL → D1 (GPIO5)
 *   VCC → 3.3V
 *   GND → GND
 *   LED → 3.3V (keep LED on for consistent readings)
 * 
 * LIBRARY:
 *   Install "Adafruit TCS34725" from Arduino Library Manager
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Wire.h>
#include "Adafruit_TCS34725.h"

// ── CONFIGURE THESE ────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "http://YOUR_SERVER_IP:3001/api/sensor";
const char* BED_ID        = "B-101";
// ──────────────────────────────────────────────────────────────────────────

// TCS34725 — integration time & gain (tune if needed)
Adafruit_TCS34725 tcs = Adafruit_TCS34725(
  TCS34725_INTEGRATIONTIME_50MS,
  TCS34725_GAIN_4X
);

const int   CHECK_INTERVAL = 1000; // ms between readings
const int   CONFIRM_COUNT  = 3;    // consecutive reads before alert

String        lastSentValue = "";
int           redCount      = 0;
int           clearCount    = 0;
unsigned long lastCheck     = 0;

void setup() {
  Serial.begin(115200);
  Wire.begin(D2, D1); // SDA, SCL

  Serial.println("\n[SalineWatch] Colour Sensor (TCS34725) starting...");
  Serial.print("[SalineWatch] Bed ID: ");
  Serial.println(BED_ID);

  if (!tcs.begin()) {
    Serial.println("[SalineWatch] ERROR: TCS34725 not found! Check wiring.");
    while (1); // halt
  }
  Serial.println("[SalineWatch] TCS34725 found!");

  connectWiFi();

  Serial.println("[SalineWatch] Calibrating... hold sensor over clear saline for 3 seconds.");
  delay(3000);
  Serial.println("[SalineWatch] Ready!");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[SalineWatch] WiFi lost. Reconnecting...");
    connectWiFi();
  }

  if (millis() - lastCheck < CHECK_INTERVAL) return;
  lastCheck = millis();

  uint16_t r, g, b, c;
  tcs.getRawData(&r, &g, &b, &c);

  // Avoid divide by zero
  if (c == 0) {
    Serial.println("[SalineWatch] Clear channel = 0, skipping.");
    return;
  }

  // Normalise to 0.0–1.0
  float rNorm = (float)r / c;
  float gNorm = (float)g / c;
  float bNorm = (float)b / c;

  Serial.print("[SalineWatch] R:");
  Serial.print(rNorm, 3);
  Serial.print(" G:");
  Serial.print(gNorm, 3);
  Serial.print(" B:");
  Serial.print(bNorm, 3);
  Serial.print(" | Raw C:");
  Serial.println(c);

  // Blood backflow detection:
  // Red channel dominates when blood enters the saline line
  bool redDetected = (rNorm > 0.45) && (rNorm > gNorm * 1.4) && (rNorm > bNorm * 1.4);

  if (redDetected) {
    redCount++;
    clearCount = 0;
    Serial.println("[SalineWatch] Red dominant reading!");
  } else {
    clearCount++;
    redCount = 0;
  }

  if (redCount >= CONFIRM_COUNT && lastSentValue != "crit") {
    Serial.println("[SalineWatch] CRITICAL: Blood backflow confirmed!");
    sendSensorData("crit");
    lastSentValue = "crit";
    redCount = 0;
  }

  if (clearCount >= CONFIRM_COUNT && lastSentValue != "normal") {
    Serial.println("[SalineWatch] OK: Saline flow clear.");
    sendSensorData("normal");
    lastSentValue = "normal";
    clearCount = 0;
  }
}

void sendSensorData(String value) {
  WiFiClient client;
  HTTPClient http;

  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"bedId\":\"" + String(BED_ID) + "\","
                + "\"sensor\":\"color\","
                + "\"value\":\"" + value + "\"}";

  Serial.print("[SalineWatch] Sending: ");
  Serial.println(body);

  int responseCode = http.POST(body);

  if (responseCode > 0) {
    Serial.print("[SalineWatch] Server response: ");
    Serial.println(responseCode);
  } else {
    Serial.print("[SalineWatch] POST error: ");
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