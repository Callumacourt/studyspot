#include <Wire.h>
#include <SoftwareSerial.h>
#include "DHT.h"

//pin definitions
#define DHT_PIN 4 
#define SOUND_SENSOR_PIN A0
#define LIGHT_SENSOR_PIN A1
#define BT_RX_PIN 8
#define BT_TX_PIN 9
#define DHT_TYPE DHT11

//init dht sensor and BT serial
DHT dht(DHT_PIN, DHT_TYPE);
SoftwareSerial bluetooth(BT_RX_PIN, BT_TX_PIN);

//noise thresholds in dB - adjust as needed
const int NOISE_QUIET = 40;
const int NOISE_MODERATE = 60;

//light thresholds in lux - set during testing
const int LIGHT_DARK = 200;
const int LIGHT_DIM = 500;

//how often sensor readings are taken + transmitted (ms)
const int UPDATE_INTERVAL = 5000;

//number of ADC samples to average per reading cycle
const int SOUND_SAMPLES = 200;
const int LIGHT_SAMPLES = 200;

float temperature = 0;
float humidity = 0;
int soundLevel = 0;
int lightLevel = 0;
unsigned long lastUpdateTime = 0;

void setup() {
  /**
  Initialises serial monitor, BT module and DHT sensor
  2 second delay after dht.begin() allows a warm up period before producing valid readings
  **/
  Serial.begin(9600);
  bluetooth.begin(9600);
  dht.begin();
  delay(2000);
  Serial.println("StudySpot Monitor Ready");
}

void loop() {
  /**
  Main execution loop
  **/
  unsigned long now = millis();

  //only read and transmit on the update interval
  if (now - lastUpdateTime >= UPDATE_INTERVAL) {
    readTemperatureHumidity();
    readSoundLevel();
    readLightLevel();
    displayReadings();
    sendBluetoothData();
    lastUpdateTime = now;
  }

  //listens for incoming BT commands from Pi
  if (bluetooth.available()) {
    String command = bluetooth.readStringUntil('\n');
    command.trim();
    //triggers immediate reading outside normal cycle
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

  //discard NaN readings
  if (isnan(h) || isnan(t)) return;

  //validation guard - discard implausible values
  if (t < 0 || t > 50 || h < 0 || h > 100) return;
  temperature = t;
  humidity = h;
}

void readSoundLevel() {
  long sum = 0;

  //average 200 samples across 2s window
  // => smooths out transients spikes rather than reacting to a single loud event
  for (int i = 0; i < SOUND_SAMPLES; i++) {
    sum += analogRead(SOUND_SENSOR_PIN);
    delay(10);
  }
  //map ADC range (0-1023) to approx db range (20-80)
  //linear approx
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
  //prints all current readings to serial monitor for debugging
  Serial.print("Temperature: "); Serial.print(temperature, 1); Serial.println(" C");
  Serial.print("Humidity: "); Serial.print(humidity, 1); Serial.println(" %");
  Serial.print("Sound: "); Serial.print(soundLevel);
  Serial.print(" dB ("); Serial.print(getNoiseCategory()); Serial.println(")");
  Serial.print("Light: "); Serial.print(lightLevel);
  Serial.print(" lux ("); Serial.print(getLightCategory()); Serial.println(")");
}

void sendBluetoothData() {
  //serialise all readings as a JSON payload + transmit over BT
  //node:"environment" lets Pi gateway identify and route this payload
  //if a second node is added later, give it a different node value and gateway handles routing without changes
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
  //categorise sound level using determined thresholds
  if (soundLevel < NOISE_QUIET) return "Quiet";
  if (soundLevel < NOISE_MODERATE) return "Moderate";
  return "Loud";
}

String getLightCategory() {
  //categorise light level using determined thresholds
  if (lightLevel < LIGHT_DARK) return "Dark";
  if (lightLevel < LIGHT_DIM) return "Dim";
  return "Bright";
}
