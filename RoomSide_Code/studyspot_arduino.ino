#include <Wire.h>
#include <SoftwareSerial.h>
#include "DHT.h"

#define DHT_PIN 4
#define SOUND_SENSOR_PIN A0
#define LIGHT_SENSOR_PIN A1
#define BT_RX_PIN 8
#define BT_TX_PIN 9

#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);
SoftwareSerial bluetooth(BT_RX_PIN, BT_TX_PIN);

const int NOISE_QUIET = 40;
const int NOISE_MODERATE = 60;
const int LIGHT_DARK = 200;
const int LIGHT_DIM = 500;
const int UPDATE_INTERVAL = 5000;
const int SOUND_SAMPLES = 200;
const int LIGHT_SAMPLES = 5;

float temperature = 0;
float humidity = 0;
int soundLevel = 0;
int lightLevel = 0;
unsigned long lastUpdateTime = 0;

void setup() {
  Serial.begin(9600);
  bluetooth.begin(9600);
  dht.begin();
  delay(2000);
  Serial.println("StudySpot Monitor Ready");
}

void loop() {
  unsigned long now = millis();

  if (now - lastUpdateTime >= UPDATE_INTERVAL) {
    readTemperatureHumidity();
    readSoundLevel();
    readLightLevel();
    displayReadings();
    sendBluetoothData();
    lastUpdateTime = now;
  }

  if (bluetooth.available()) {
    String command = bluetooth.readStringUntil('\n');
    command.trim();
    if (command == "STATUS") {
      readTemperatureHumidity();
      readSoundLevel();
      readLightLevel();
      sendBluetoothData();
    }
  }

  delay(30);
}

void readTemperatureHumidity() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (isnan(h) || isnan(t)) return;
  if (t < 0 || t > 50 || h < 0 || h > 100) return;
  temperature = t;
  humidity = h;
}

void readSoundLevel() {
  long sum = 0;
  for (int i = 0; i < SOUND_SAMPLES; i++) {
    sum += analogRead(SOUND_SENSOR_PIN);
    delay(10);
  }
  soundLevel = 20 + ((sum / SOUND_SAMPLES) * 60.0 / 1023.0);
}

void readLightLevel() {
  long sum = 0;
  for (int i = 0; i < LIGHT_SAMPLES; i++) {
    sum += analogRead(LIGHT_SENSOR_PIN);
    delay(10);
  }
  lightLevel = (sum / LIGHT_SAMPLES) * 10;
}

void displayReadings() {
  Serial.print("Temperature: "); Serial.print(temperature, 1); Serial.println(" C");
  Serial.print("Humidity: "); Serial.print(humidity, 1); Serial.println(" %");
  Serial.print("Sound: "); Serial.print(soundLevel);
  Serial.print(" dB ("); Serial.print(getNoiseCategory()); Serial.println(")");
  Serial.print("Light: "); Serial.print(lightLevel);
  Serial.print(" lux ("); Serial.print(getLightCategory()); Serial.println(")");
}

void sendBluetoothData() {
  bluetooth.print("{");
  bluetooth.print("\"node\":\"environment\",");
  bluetooth.print("\"temperature\":"); bluetooth.print(temperature, 1); bluetooth.print(",");
  bluetooth.print("\"humidity\":"); bluetooth.print(humidity, 1); bluetooth.print(",");
  bluetooth.print("\"sound\":"); bluetooth.print(soundLevel); bluetooth.print(",");
  bluetooth.print("\"light\":"); bluetooth.print(lightLevel); bluetooth.print(",");
  bluetooth.print("\"timestamp\":"); bluetooth.print(millis());
  bluetooth.println("}");
}

String getNoiseCategory() {
  if (soundLevel < NOISE_QUIET) return "Quiet";
  if (soundLevel < NOISE_MODERATE) return "Moderate";
  return "Loud";
}

String getLightCategory() {
  if (lightLevel < LIGHT_DARK) return "Dark";
  if (lightLevel < LIGHT_DIM) return "Dim";
  return "Bright";
}
