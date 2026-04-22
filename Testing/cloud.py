#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import time
import json
import serial
import threading
import paho.mqtt.client as mqtt
import grovepi
import grove_rgb_lcd

# ── ThingsBoard Config ────────────────────────────────────────────
THINGSBOARD_HOST = 'thingsboard.cs.cf.ac.uk'
ACCESS_TOKEN     = 'KV8ua9VXNu9cOQ8Op4DS'

# ── GrovePi Config ────────────────────────────────────────────────
DHT_SENSOR_PORT = 4
DHT_BLUE        = 0

# ── Bluetooth Config ──────────────────────────────────────────────
BT_PORT = '/dev/rfcomm0'
BT_BAUD = 9600

# ── Shared telemetry ──────────────────────────────────────────────
telemetry = {
    'temperature': 0,
    'humidity':    0,
    'sound':       0,
    'light':       0,
    'occupancy':   0,
}
telemetry_lock = threading.Lock()

# ── MQTT Callbacks ────────────────────────────────────────────────
def on_connect(client, userdata, flags, rc, *extra):
    print('ThingsBoard connected, rc=' + str(rc))

def on_publish(client, userdata, result):
    print('✓ Published to ThingsBoard')

# ── MQTT Setup ────────────────────────────────────────────────────
client = mqtt.Client()
client.username_pw_set(ACCESS_TOKEN)
client.on_connect = on_connect
client.on_publish = on_publish
client.connect(THINGSBOARD_HOST, 1883, 60)
client.loop_start()

# ── LCD Display ───────────────────────────────────────────────────
# LCD shows two lines, cycling every 3 seconds:
#   Screen 1: Temp & Humidity
#   Screen 2: Occupancy & Sound
#   Screen 3: Light level
#
# Colour changes based on occupancy:
#   Empty  (0)      → blue
#   Low    (1-5)    → green
#   Medium (6-10)   → orange (255, 165, 0)
#   High   (>10)    → red

def get_lcd_colour(occupancy):
    if occupancy == 0:
        return (0, 0, 255)       # blue  — empty
    elif occupancy <= 5:
        return (0, 255, 0)       # green — low
    elif occupancy <= 10:
        return (255, 165, 0)     # orange — medium
    else:
        return (255, 0, 0)       # red — high

def update_lcd(screen):
    with telemetry_lock:
        t   = telemetry['temperature']
        h   = telemetry['humidity']
        s   = telemetry['sound']
        l   = telemetry['light']
        occ = telemetry['occupancy']

    r, g, b = get_lcd_colour(occ)
    grove_rgb_lcd.setRGB(r, g, b)

    if screen == 0:
        line1 = f"Temp:  {t:.1f}C"
        line2 = f"Humid: {h:.1f}%"
    elif screen == 1:
        line1 = f"Occupancy: {occ}"
        line2 = f"Sound: {s} dB"
    else:
        line1 = f"Light: {l} lux"
        line2 = ""

    grove_rgb_lcd.setText(f"{line1}\n{line2}")

# ── Bluetooth Reader Thread ───────────────────────────────────────
def bluetooth_reader():
    while True:
        try:
            bt = serial.Serial(BT_PORT, BT_BAUD, timeout=5)
            print(f'Bluetooth connected on {BT_PORT}')
            while True:
                raw = bt.readline().decode('utf-8', errors='ignore').strip()
                if not raw:
                    continue
                try:
                    data = json.loads(raw)
                    if data.get('node') == 'environment':
                        with telemetry_lock:
                            telemetry['sound']     = data.get('sound',     telemetry['sound'])
                            telemetry['light']     = data.get('light',     telemetry['light'])
                            telemetry['occupancy'] = data.get('occupancy', telemetry['occupancy'])
                        print(f"BT ← sound:{telemetry['sound']}  light:{telemetry['light']}  occupancy:{telemetry['occupancy']}")
                except json.JSONDecodeError:
                    pass
        except serial.SerialException as e:
            print(f'Bluetooth error: {e} — retrying in 5s...')
            time.sleep(5)

bt_thread = threading.Thread(target=bluetooth_reader, daemon=True)
bt_thread.start()

# ── Main Loop ─────────────────────────────────────────────────────
PUBLISH_INTERVAL = 5      # seconds between ThingsBoard updates
LCD_CYCLE        = 3      # seconds per LCD screen

next_publish = time.time()
next_lcd     = time.time()
lcd_screen   = 0

try:
    while True:
        now = time.time()

        # ── Read GrovePi DHT ──────────────────────────────────────
        try:
            [temp, hum] = grovepi.dht(DHT_SENSOR_PORT, DHT_BLUE)
            if temp == temp and hum == hum:   # NaN guard
                with telemetry_lock:
                    telemetry['temperature'] = temp
                    telemetry['humidity']    = hum
        except Exception as e:
            print('DHT error: ' + str(e))

        # ── Cycle LCD screen ──────────────────────────────────────
        if now >= next_lcd:
            try:
                update_lcd(lcd_screen)
            except Exception as e:
                print('LCD error: ' + str(e))
            lcd_screen = (lcd_screen + 1) % 3
            next_lcd   = now + LCD_CYCLE

        # ── Publish to ThingsBoard ────────────────────────────────
        if now >= next_publish:
            with telemetry_lock:
                payload = dict(telemetry)
            client.publish('v1/devices/me/telemetry', json.dumps(payload), 1)
            print(f'Published: {payload}')
            next_publish = now + PUBLISH_INTERVAL

        time.sleep(0.5)

except KeyboardInterrupt:
    grove_rgb_lcd.setText('')
    grove_rgb_lcd.setRGB(0, 0, 0)
    client.loop_stop()
    client.disconnect()
    print('Terminated.')
    os._exit(0)