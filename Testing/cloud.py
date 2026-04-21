#!/usr/bin/env python3
# -*- coding: utf-8 -*-
################################################################################
# Script Name: cloud.py
#
# Original Version: 15/04/2022 (by Hakan KAYAN)
# Updated Version: 25/12/2024 (by Charith PERERA)
# Modified for StudySpot: 2026 (Group 02)
#
# Description:
#   - Reads multiple sensors: DHT (temp/humidity), sound, light, ultrasonic, PIR
#   - Publishes all sensor data to ThingsBoard dashboard
#   - Subscribes to RPC commands to control buzzer
#   - Rotating LCD display showing different sensor readings
#   - Bidirectional MQTT communication with ThingsBoard
#
# Sensors:
#   - DHT (D4): Temperature & Humidity
#   - Sound Sensor (A0): Noise level
#   - Light Sensor (A1): Light intensity
#   - Ultrasonic Ranger (D3): Distance/occupancy detection
#   - PIR Motion (D2): Motion detection
#   - Buzzer (D8): Alert output (RPC controlled)
#   - LCD Display (I2C): Rotating display of sensor values
################################################################################

import os
import time
import sys
import paho.mqtt.client as mqtt
import json
import grovepi
import smbus
import math

# -----------------------------------------------------------------------------
# 1. ThingsBoard Configuration
# -----------------------------------------------------------------------------
THINGSBOARD_HOST = 'thingsboard.cs.cf.ac.uk'
ACCESS_TOKEN = 'IPCyckQhSgvksLW6Nmbo'  # Your device access token

# -----------------------------------------------------------------------------
# 2. Sensor Pin Configuration
# -----------------------------------------------------------------------------
DHT_SENSOR_PORT = 4      # Temperature & Humidity
SOUND_SENSOR_PORT = 0    # Sound sensor (analog)
LIGHT_SENSOR_PORT = 1    # Light sensor (analog)
ULTRASONIC_PORT = 3      # Ultrasonic ranger
PIR_MOTION_PORT = 2      # PIR motion sensor
BUZZER_PORT = 8          # Buzzer (for alerts)

DHT_SENSOR_TYPE = 0      # 0 = blue (DHT11), 1 = white (DHT22)

# -----------------------------------------------------------------------------
# 3. LCD Configuration (I2C)
# -----------------------------------------------------------------------------
bus = smbus.SMBus(1)
DISPLAY_RGB_ADDR = 0x62
DISPLAY_TEXT_ADDR = 0x3e

def setRGB(r, g, b):
    """Set LCD backlight color (R, G, B: 0-255)"""
    bus.write_byte_data(DISPLAY_RGB_ADDR, 0, 0)
    bus.write_byte_data(DISPLAY_RGB_ADDR, 1, 0)
    bus.write_byte_data(DISPLAY_RGB_ADDR, 0x08, 0xaa)
    bus.write_byte_data(DISPLAY_RGB_ADDR, 4, r)
    bus.write_byte_data(DISPLAY_RGB_ADDR, 3, g)
    bus.write_byte_data(DISPLAY_RGB_ADDR, 2, b)

def textCommand(cmd):
    """Send command to LCD"""
    bus.write_byte_data(DISPLAY_TEXT_ADDR, 0x80, cmd)

def setText(text):
    """Display text on LCD (2 lines, 16 chars each)"""
    textCommand(0x01)  # Clear display
    time.sleep(0.05)
    textCommand(0x08 | 0x04)  # Display on, no cursor
    textCommand(0x28)  # 2 lines
    time.sleep(0.05)
    
    count = 0
    row = 0
    for c in text:
        if c == '\n' or count == 16:
            count = 0
            row += 1
            if row == 2:
                break
            textCommand(0xc0)
            if c == '\n':
                continue
        count += 1
        bus.write_byte_data(DISPLAY_TEXT_ADDR, 0x40, ord(c))

# -----------------------------------------------------------------------------
# 4. Sensor Reading Functions
# -----------------------------------------------------------------------------

def read_temperature_humidity():
    """Read temperature and humidity from DHT sensor"""
    try:
        [temp, humidity] = grovepi.dht(DHT_SENSOR_PORT, DHT_SENSOR_TYPE)
        
        # Validate readings
        if temp is not None and humidity is not None:
            if not math.isnan(temp) and not math.isnan(humidity):
                if 0 <= temp <= 50 and 0 <= humidity <= 100:
                    return round(temp, 1), round(humidity, 1)
        return None, None
    except Exception as e:
        print(f"DHT Error: {e}")
        return None, None

def read_sound_level():
    """Read sound level from analog sensor"""
    try:
        # Take multiple samples and average
        samples = []
        for i in range(10):
            samples.append(grovepi.analogRead(SOUND_SENSOR_PORT))
            time.sleep(0.01)
        
        avg_value = sum(samples) / len(samples)
        
        # Convert to approximate dB (calibrate as needed)
        sound_db = round(20 + (avg_value / 1023.0) * 60, 1)
        return sound_db
    except Exception as e:
        print(f"Sound Error: {e}")
        return None

def read_light_level():
    """Read light level from analog sensor"""
    try:
        # Take multiple samples and average
        samples = []
        for i in range(5):
            samples.append(grovepi.analogRead(LIGHT_SENSOR_PORT))
            time.sleep(0.01)
        
        avg_value = sum(samples) / len(samples)
        
        # Convert to approximate lux (calibrate as needed)
        light_lux = round(avg_value * 10, 1)
        return light_lux
    except Exception as e:
        print(f"Light Error: {e}")
        return None

def read_ultrasonic_distance():
    """Read distance from ultrasonic sensor"""
    try:
        distance = grovepi.ultrasonicRead(ULTRASONIC_PORT)
        
        # Validate reading (0 = error, >400 = out of range)
        if 0 < distance < 400:
            return distance
        return None
    except Exception as e:
        print(f"Ultrasonic Error: {e}")
        return None

def read_pir_motion():
    """Read motion detection from PIR sensor"""
    try:
        motion = grovepi.digitalRead(PIR_MOTION_PORT)
        return bool(motion)
    except Exception as e:
        print(f"PIR Error: {e}")
        return False

# -----------------------------------------------------------------------------
# 5. LCD Display Management
# -----------------------------------------------------------------------------

lcd_display_index = 0
lcd_last_update = time.time()
LCD_ROTATION_INTERVAL = 3  # Change display every 3 seconds

def update_lcd_display(sensor_data):
    """Update LCD with rotating display of sensor values"""
    global lcd_display_index, lcd_last_update
    
    current_time = time.time()
    
    # Rotate display every LCD_ROTATION_INTERVAL seconds
    if current_time - lcd_last_update >= LCD_ROTATION_INTERVAL:
        lcd_display_index = (lcd_display_index + 1) % 5
        lcd_last_update = current_time
    
    temp = sensor_data.get('temperature', '--')
    humidity = sensor_data.get('humidity', '--')
    sound = sensor_data.get('sound_level', '--')
    light = sensor_data.get('light_level', '--')
    distance = sensor_data.get('distance', '--')
    occupied = sensor_data.get('occupied', False)
    motion = sensor_data.get('motion_detected', False)
    
    # Different display screens
    displays = [
        # Screen 0: Temperature & Humidity
        f"Temp: {temp}C\nHumidity: {humidity}%",
        
        # Screen 1: Sound & Light
        f"Sound: {sound}dB\nLight: {light}lux",
        
        # Screen 2: Distance & Occupancy
        f"Distance: {distance}cm\n{'OCCUPIED' if occupied else 'Available'}",
        
        # Screen 3: Motion Status
        f"Motion: {'DETECTED' if motion else 'None'}\nStatus: {'BUSY' if occupied else 'FREE'}",
        
        # Screen 4: Summary
        f"StudySpot\n{temp}C {humidity}% {sound}dB"
    ]
    
    try:
        setText(displays[lcd_display_index])
        
        # Set color based on occupancy
        if occupied:
            setRGB(255, 0, 0)  # Red = Occupied
        elif motion:
            setRGB(255, 128, 0)  # Orange = Motion detected
        else:
            setRGB(0, 255, 0)  # Green = Available
    except Exception as e:
        print(f"LCD Error: {e}")

# -----------------------------------------------------------------------------
# 6. MQTT Callbacks
# -----------------------------------------------------------------------------

def on_publish(client, userdata, result):
    """Callback when data is successfully published"""
    print("✓ Data published to ThingsBoard")

def on_message(client, userdata, msg):
    """Callback for RPC commands from ThingsBoard"""
    print('Topic: ' + msg.topic + '\nMessage: ' + str(msg.payload))
    
    try:
        data = json.loads(msg.payload)
        
        # RPC Command: setValue - Control buzzer
        if data['method'] == 'setValue':
            buzzer_value = data['params']
            print(f"Setting buzzer to: {buzzer_value}")
            buzzer_state['State'] = buzzer_value
            grovepi.digitalWrite(BUZZER_PORT, buzzer_value)
        
        # RPC Command: reset - Reset any counters (future use)
        elif data['method'] == 'reset':
            print("Reset command received")
            # Add reset logic here if needed
        
        # RPC Command: getStatus - Send current status
        elif data['method'] == 'getStatus':
            print("Status request received")
            # Status will be sent in next telemetry update
        
    except Exception as e:
        print(f"RPC Error: {e}")

def on_connect(client, userdata, flags, rc, *extra_params):
    """Callback when connected to MQTT broker"""
    if rc == 0:
        print('✓ Connected to ThingsBoard successfully')
    else:
        print(f'✗ Connection failed with code {rc}')

# -----------------------------------------------------------------------------
# 7. Initialize Hardware
# -----------------------------------------------------------------------------

# Initialize GrovePi
grovepi.set_bus("RPI_1")

# Setup pins
grovepi.pinMode(BUZZER_PORT, "OUTPUT")
grovepi.pinMode(PIR_MOTION_PORT, "INPUT")
grovepi.digitalWrite(BUZZER_PORT, 0)  # Ensure buzzer is off

# Initialize LCD
try:
    setRGB(0, 255, 0)  # Green
    setText("StudySpot\nInitializing...")
    time.sleep(2)
except Exception as e:
    print(f"LCD initialization error: {e}")

# Data storage
sensor_data = {
    'temperature': 0,
    'humidity': 0,
    'sound_level': 0,
    'light_level': 0,
    'distance': 0,
    'occupied': False,
    'motion_detected': False
}

buzzer_state = {'State': False}

# Publishing interval
INTERVAL = 3  # Send data every 3 seconds
next_reading = time.time()

# -----------------------------------------------------------------------------
# 8. MQTT Client Setup
# -----------------------------------------------------------------------------

client = mqtt.Client()
client.username_pw_set(ACCESS_TOKEN)
client.on_connect = on_connect
client.on_publish = on_publish
client.on_message = on_message

# Connect to ThingsBoard
print(f"Connecting to {THINGSBOARD_HOST}...")
client.connect(THINGSBOARD_HOST, 1883, 60)

# Subscribe to RPC commands
client.subscribe('v1/devices/me/rpc/request/+')

# Start MQTT loop
client.loop_start()

print("\nStudySpot Sensor Node - Running...")
print("Reading sensors and sending to ThingsBoard...")
print("Press Ctrl+C to stop\n")

# -----------------------------------------------------------------------------
# 9. Main Data Collection Loop
# -----------------------------------------------------------------------------

try:
    while True:
        # Read all sensors
        temp, humidity = read_temperature_humidity()
        sound_level = read_sound_level()
        light_level = read_light_level()
        distance = read_ultrasonic_distance()
        motion = read_pir_motion()
        
        # Update sensor data dictionary
        if temp is not None:
            sensor_data['temperature'] = temp
        if humidity is not None:
            sensor_data['humidity'] = humidity
        if sound_level is not None:
            sensor_data['sound_level'] = sound_level
        if light_level is not None:
            sensor_data['light_level'] = light_level
        if distance is not None:
            sensor_data['distance'] = distance
            # Occupied if something within 50cm
            sensor_data['occupied'] = distance < 50
        
        sensor_data['motion_detected'] = motion
        sensor_data['timestamp'] = int(time.time() * 1000)
        
        # Print readings to console
        print("=" * 50)
        print(f"Temperature:  {sensor_data.get('temperature', '--')} °C")
        print(f"Humidity:     {sensor_data.get('humidity', '--')} %")
        print(f"Sound Level:  {sensor_data.get('sound_level', '--')} dB")
        print(f"Light Level:  {sensor_data.get('light_level', '--')} lux")
        print(f"Distance:     {sensor_data.get('distance', '--')} cm")
        print(f"Occupied:     {sensor_data.get('occupied', False)}")
        print(f"Motion:       {sensor_data.get('motion_detected', False)}")
        print("=" * 50)
        
        # Update LCD display (rotating)
        update_lcd_display(sensor_data)
        
        # Publish sensor data to ThingsBoard
        client.publish('v1/devices/me/telemetry', json.dumps(sensor_data), 1)
        
        # Publish buzzer state
        client.publish('v1/devices/me/telemetry', json.dumps(buzzer_state), 1)
        
        # Wait for next reading
        next_reading += INTERVAL
        sleep_time = next_reading - time.time()
        if sleep_time > 0:
            time.sleep(sleep_time)

except KeyboardInterrupt:
    # Graceful shutdown
    print("\n\nShutting down...")
    
    # Turn off buzzer
    grovepi.digitalWrite(BUZZER_PORT, 0)
    
    # Clear LCD
    try:
        setText("StudySpot\nShutdown")
        time.sleep(1)
        setRGB(0, 0, 0)
    except:
        pass
    
    # Stop MQTT
    client.loop_stop()
    client.disconnect()
    
    print("✓ Cleanup complete")
    os._exit(0)

except Exception as e:
    print(f"\n✗ Unexpected error: {e}")
    
    # Emergency cleanup
    try:
        grovepi.digitalWrite(BUZZER_PORT, 0)
        client.loop_stop()
        client.disconnect()
    except:
        pass
    
    os._exit(1)

################################################################################
# NOTES:
#
# 1. Sensor Connections:
#    - DHT Sensor (Blue) → D4
#    - Sound Sensor → A0
#    - Light Sensor → A1
#    - Ultrasonic Ranger → D3
#    - PIR Motion → D2
#    - Buzzer → D8
#    - LCD Display → I2C
#
# 2. LCD Display Rotation:
#    - Changes every 3 seconds
#    - 5 different screens showing different data
#    - Color changes based on occupancy:
#      * Green = Available
#      * Orange = Motion detected
#      * Red = Occupied
#
# 3. ThingsBoard Data:
#    Sends these fields every 3 seconds:
#    - temperature (°C)
#    - humidity (%)
#    - sound_level (dB)
#    - light_level (lux)
#    - distance (cm)
#    - occupied (boolean)
#    - motion_detected (boolean)
#    - timestamp (ms)
#
# 4. RPC Commands:
#    From ThingsBoard dashboard you can:
#    - setValue: Turn buzzer on/off
#    - reset: Reset counters (future)
#    - getStatus: Request status update
#
# 5. Calibration:
#    - Sound: Adjust formula in read_sound_level()
#    - Light: Adjust multiplier in read_light_level()
#    - Occupancy threshold: Change "distance < 50" to your value
#
# 6. Running:
#    sudo python3 cloud.py
#
# 7. Testing:
#    - Check LCD rotates through 5 screens
#    - Breathe on DHT to change temp/humidity
#    - Clap to change sound
#    - Cover light sensor
#    - Wave hand near ultrasonic
#    - Move in front of PIR
#    - Check ThingsBoard dashboard updates
#
################################################################################