#!/usr/bin/env python3
# -*- coding: utf-8 -*-
 
"""
StudySpot - IoT Study Space Monitoring System
 
Reads temperature, humidity, sound, light, and occupancy data
and outputs as JSON to stdout for Node-RED integration
"""
 
import time
import sys
import os
import math
import json
import grovepi

DHT_SENSOR_PORT = 4      # Temperature & Humidity sensor on D4
DHT_SENSOR_TYPE = 0      # 0 = blue (DHT11), 1 = white (DHT22)
SOUND_SENSOR_PORT = 0    # Sound sensor on A0 (analog)
LIGHT_SENSOR_PORT = 1    # Light sensor on A1 (analog)
ULTRASONIC_PORT = 3      # Ultrasonic sensor on D3
 
UPDATE_INTERVAL = 3      # Seconds between readings
OCCUPANCY_THRESHOLD = 50 # Distance in cm to detect occupancy
 
 
def read_temp_humidity():
    """Read temperature and humidity from DHT sensor"""
    try:
        [temp, humidity] = grovepi.dht(DHT_SENSOR_PORT, DHT_SENSOR_TYPE)
        
        #validate readings
        if temp is not None and humidity is not None:
            if not math.isnan(temp) and not math.isnan(humidity):
                if 0 <= temp <= 50 and 0 <= humidity <= 100:
                    return round(temp, 1), round(humidity, 1)
        return None, None
    except Exception as e:
        return None, None
 
def read_sound_level():
    """Read sound level from analog sound sensor"""
    try:
        sound_value = grovepi.analogRead(SOUND_SENSOR_PORT)
        #convert to approximate dB (rough estimation)
        sound_db = round(20 + (sound_value / 1023.0) * 60, 1)
        return sound_db
    except Exception as e:
        return None
 
def read_light_level():
    """
    Read light level from analog light sensor
    Returns light level in lux (approximate)
    """
    try:
        light_value = grovepi.analogRead(LIGHT_SENSOR_PORT)
        
        # convert analog reading to lux (approximate conversion)
        light_lux = round(light_value * 10, 1)
        
        return light_lux
    except Exception as e:
        return None
 
def read_occupancy():
    """Read distance from ultrasonic sensor"""
    try:
        distance = grovepi.ultrasonicRead(ULTRASONIC_PORT)
        
        # validate reading (0 means error, >400 is max range)
        if 0 < distance < 400:
            is_occupied = distance < OCCUPANCY_THRESHOLD
            return distance, is_occupied
        return None, None
    except Exception as e:
        return None, None
 
# Setup GrovePi
try:
    grovepi.set_bus("RPI_1")
except Exception as e:
    print(f"GrovePi setup error: {e}", file=sys.stderr)
 
print("StudySpot monitoring started.", file=sys.stderr)
 
while True:
    try:
        #read all sensors
        temp, humidity = read_temp_humidity()
        sound_db = read_sound_level()
        light_lux = read_light_level()
        distance, is_occupied = read_occupancy()
        
        #build JSON output
        data = {
            'temperature': temp,
            'humidity': humidity,
            'sound_level': sound_db,
            'light_level': light_lux,
            'distance': distance,
            'occupied': is_occupied
        }
        
        #remove None values
        data = {k: v for k, v in data.items() if v is not None}
        
        #print JSON
        if data:
            print(json.dumps(data), flush=True)
        else:
            print(json.dumps({'error': 'No valid sensor data'}), flush=True)
        
        #wait before next reading
        time.sleep(UPDATE_INTERVAL)
        
    except KeyboardInterrupt:
        print("Terminated.", file=sys.stderr)
        os._exit(0)
 