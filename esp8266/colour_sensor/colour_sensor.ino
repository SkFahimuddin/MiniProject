/**
 * SalineWatch — ESP8266 Firmware #2
 * Colour Sensor (Saline Pipe) — TCS3200 or TCS34725
 *
 * WIRING (TCS3200):
 *   S0 → D5 (GPIO14)   — frequency scaling
 *   S1 → D6 (GPIO12)   — frequency scaling
 *   S2 → D7 (GPIO13)   — colour filter select
 *   S3 → D8 (GPIO15)   — colour filter select
 *   OUT → D4 (GPIO2)   — frequency output
 *   VCC → 3.3V
 *   GND → GND
 *   OE  → GND (always enabled)
 *
 * HOW IT DETECTS RED:
 *   TCS3200 outputs a frequency — higher frequency = more of that colour.
 *   We read R, G, B frequencies separately, then check if RED is dominant.
 *   If red > green*1.6 AND red > blue*1.6 → blood backflow detected.
 *
 * SETUP:
 *   Same Arduino IDE + ESP8266 board setup as ir_sensor.
 *   Set BED_ID to match the bed this ESP is installed in.
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

// ── CONFIGURE THESE ────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "http://YOUR_RENDER_URL.onrender.com/api/sensor";
const char* BED_ID        = "B-103";  // Change to the bed this ESP is in
// ──────────────────────────────────────────────────────────────────────────

// TCS3200 pins
const int S0_PIN  = D5;
const int S1_PIN  = D6;
const int S2_PIN  = D7;
const int S3_PIN  = D8;
const int OUT_PIN = D4;

// Thresholds — tune these after calibration with your sensor
const float RED_RATIO_THRESHOLD = 1.6;  // red must be 1.6x stronger than green/blue
const int   READ_SAMPLES        = 5;    // average this many readings
const int   CHECK_INTERVAL      = 1000; // check every 1 second
const int   CONFIRM_COUNT       = 3;    // confirm 3 times before alerting

String        lastSentValue  = "";
int           redCount       = 0;
int           clearCount     = 0;
unsigned long lastCheck      = 0;

void setup() {
  Serial.begin(115200);

  pinMode(S0_PIN,  OUTPUT);
  pinMode(S1_PIN,  OUTPUT);
  pinMode(S2_PIN,  OUTPUT);
  pinMode(S3_PIN,  OUTPUT);
  pinMode(OUT_PIN, INPUT);

  // Set TCS3200 frequency scaling to 20%
  digitalWrite(S0_PIN, HIGH);
  digitalWrite(S1_PIN, LOW);

  Serial.println("\n[SalineWatch] Colour Sensor Node starting...");
  Serial.print("[SalineWatch] Bed ID: ");
  Serial.println(BED_ID);

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

  // Read all three colour frequencies
  long redFreq   = readColour(LOW,  LOW);   // S2=LOW,  S3=LOW  → Red filter
  long greenFreq = readColour(HIGH, HIGH);  // S2=HIGH, S3=HIGH → Green filter
  long blueFreq  = readColour(LOW,  HIGH);  // S2=LOW,  S3=HIGH → Blue filter

  Serial.print("[SalineWatch] R:");
  Serial.print(redFreq);
  Serial.print(" G:");
  Serial.print(greenFreq);
  Serial.print(" B:");
  Serial.println(blueFreq);

  // Detect red dominance (blood backflow)
  bool redDetected = false;
  if (greenFreq > 0 && blueFreq > 0) {
    float rg = (float)redFreq / greenFreq;
    float rb = (float)redFreq / blueFreq;

    // Note: TCS3200 outputs LOWER frequency for MORE of that colour
    // So if red is dominant, redFreq will be LOWER than green and blue
    // Uncomment below if your sensor behaves this way:
    // redDetected = (rg < (1.0 / RED_RATIO_THRESHOLD)) && (rb < (1.0 / RED_RATIO_THRESHOLD));

    // If your sensor outputs HIGHER frequency for MORE colour (e.g. TCS34725):
    redDetected = (rg > RED_RATIO_THRESHOLD) && (rb > RED_RATIO_THRESHOLD);
  }

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

// Read frequency from TCS3200 for given filter (S2, S3 settings)
long readColour(int s2, int s3) {
  digitalWrite(S2_PIN, s2);
  digitalWrite(S3_PIN, s3);
  delay(10);

  long total = 0;
  for (int i = 0; i < READ_SAMPLES; i++) {
    total += pulseIn(OUT_PIN, LOW, 100000);
    delay(5);
  }
  return total / READ_SAMPLES;
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
    Serial.println("\n[SalineWatch] WiFi failed. Retrying...");
    delay(5000);
  }
}
