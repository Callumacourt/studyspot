#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import time
import json
import serial
import threading
import paho.mqtt.client as mqtt
import grovepi

try:
    import grove_rgb_lcd
    LCD_AVAILABLE = True
except ImportError:
    LCD_AVAILABLE = False
    print("WARNING: LCD not available")

# ── ThingsBoard Config ────────────────────────────────────────────
THINGSBOARD_HOST = 'thingsboard.cs.cf.ac.uk'
ACCESS_TOKEN     = 'oR1ywp7HMZXwD6c6is90'

# ── GrovePi Pins ──────────────────────────────────────────────────
PIR_PIN        = 3   # D3
ULTRASONIC_PIN = 4   # D4

# ── Bluetooth Config ──────────────────────────────────────────────
BT_PORT = '/dev/rfcomm0'
BT_BAUD = 9600

# ── Occupancy State Machine ───────────────────────────────────────
DOOR_BEAM_CM         = 50
DIRECTION_WINDOW_MS  = 2000
CROSSING_COOLDOWN_MS = 1500

occupancyCount   = 0
doorState        = 'IDLE'
firstEventTime   = 0
lastCrossingTime = 0
lastPirState     = False
occupancy_lock   = threading.Lock()

# ── Telemetry ─────────────────────────────────────────────────────
telemetry = {
    'temperature': 0,
    'humidity':    0,
    'sound':       0,
    'light':       0,
    'occupancy':   0,
}
telemetry_lock = threading.Lock()

# ── LCD Helpers ───────────────────────────────────────────────────
def lcd_set_text(text):
    if not LCD_AVAILABLE: return
    try:
        grove_rgb_lcd.setText(text)
    except Exception as e:
        print(f'LCD error: {e}')

def lcd_set_rgb(r, g, b):
    if not LCD_AVAILABLE: return
    try:
        grove_rgb_lcd.setRGB(r, g, b)
    except Exception as e:
        print(f'LCD error: {e}')

def get_lcd_colour(occupancy):
    if occupancy == 0:     return (0, 0, 255)
    elif occupancy <= 5:   return (0, 255, 0)
    elif occupancy <= 10:  return (255, 165, 0)
    else:                  return (255, 0, 0)

def update_lcd(screen):
    with telemetry_lock:
        t   = telemetry['temperature']
        h   = telemetry['humidity']
        s   = telemetry['sound']
        l   = telemetry['light']
        occ = telemetry['occupancy']
    r, g, b = get_lcd_colour(occ)
    lcd_set_rgb(r, g, b)
    if screen == 0:
        lcd_set_text(f"Temp: {t:.1f}C\nHumid: {h:.1f}%")
    elif screen == 1:
        lcd_set_text(f"Occupancy: {occ}\nSound: {s}dB")
    else:
        lcd_set_text(f"Light: {l}lux\n")

# ── MQTT Setup ────────────────────────────────────────────────────
def on_connect(client, userdata, flags, rc, *extra):
    print('ThingsBoard connected, rc=' + str(rc))

def on_publish(client, userdata, result):
    print('✓ Published to ThingsBoard')

client = mqtt.Client()
client.username_pw_set(ACCESS_TOKEN)
client.on_connect = on_connect
client.on_publish = on_publish
client.connect(THINGSBOARD_HOST, 1883, 60)
client.loop_start()

# ── Occupancy Thread (runs on GrovePi) ───────────────────────────
def occupancy_thread():
    global occupancyCount, doorState, firstEventTime, lastCrossingTime, lastPirState

    print("Occupancy thread started")
    while True:
        try:
            now_ms = int(time.time() * 1000)

            # Read PIR
            pirState  = grovepi.digitalRead(PIR_PIN)
            pirRising = (pirState and not lastPirState)
            lastPirState = pirState

            # Read Ultrasonic
            distCm  = grovepi.ultrasonicRead(ULTRASONIC_PIN)
            usBroken = (0 < distCm < DOOR_BEAM_CM)

            if (now_ms - lastCrossingTime) < CROSSING_COOLDOWN_MS:
                time.sleep(0.05)
                continue

            if doorState == 'IDLE':
                if usBroken and not pirRising:
                    doorState      = 'US_FIRED'
                    firstEventTime = now_ms
                    print(f"[US ] Beam broken at {distCm}cm")
                elif pirRising and not usBroken:
                    doorState      = 'PIR_FIRED'
                    firstEventTime = now_ms
                    print("[PIR] Motion detected")

            elif doorState == 'US_FIRED':
                if pirRising:
                    occupancyCount += 1
                    lastCrossingTime = now_ms
                    doorState = 'IDLE'
                    print(f"[DOOR] ENTRY → Occupancy: {occupancyCount}")
                    with telemetry_lock:
                        telemetry['occupancy'] = occupancyCount
                elif (now_ms - firstEventTime) > DIRECTION_WINDOW_MS:
                    doorState = 'IDLE'
                    print("[US ] Timeout — reset")

            elif doorState == 'PIR_FIRED':
                if usBroken:
                    occupancyCount = max(0, occupancyCount - 1)
                    lastCrossingTime = now_ms
                    doorState = 'IDLE'
                    print(f"[DOOR] EXIT → Occupancy: {occupancyCount}")
                    with telemetry_lock:
                        telemetry['occupancy'] = occupancyCount
                elif (now_ms - firstEventTime) > DIRECTION_WINDOW_MS:
                    doorState = 'IDLE'
                    print("[PIR] Timeout — reset")

        except Exception as e:
            print(f'Occupancy error: {e}')

        time.sleep(0.05)

occ_thread = threading.Thread(target=occupancy_thread, daemon=True)
occ_thread.start()

# ── Bluetooth Reader Thread ───────────────────────────────────────
def bluetooth_reader():
    while True:
        try:
            bt = serial.Serial(BT_PORT, BT_BAUD, timeout=5)
            print(f'✓ Bluetooth connected on {BT_PORT}')
            while True:
                raw = bt.readline().decode('utf-8', errors='ignore').strip()
                if not raw:
                    continue
                print(f'BT raw: {raw}')
                try:
                    data = json.loads(raw)
                    if data.get('node') == 'environment':
                        with telemetry_lock:
                            telemetry['temperature'] = data.get('temperature', telemetry['temperature'])
                            telemetry['humidity']    = data.get('humidity',    telemetry['humidity'])
                            telemetry['sound']       = data.get('sound',       telemetry['sound'])
                            telemetry['light']       = data.get('light',       telemetry['light'])
                        print(f'BT parsed ← temp:{telemetry["temperature"]} hum:{telemetry["humidity"]} sound:{telemetry["sound"]} light:{telemetry["light"]}')
                except json.JSONDecodeError:
                    pass
        except serial.SerialException as e:
            print(f'Bluetooth error: {e} — retrying in 5s')
            time.sleep(5)

bt_thread = threading.Thread(target=bluetooth_reader, daemon=True)
bt_thread.start()

# ── Main Loop ─────────────────────────────────────────────────────
PUBLISH_INTERVAL = 5
LCD_CYCLE        = 3
next_publish     = time.time()
next_lcd         = time.time()
lcd_screen       = 0

print("Starting main loop...")

try:
    while True:
        now = time.time()

        if now >= next_lcd:
            update_lcd(lcd_screen)
            lcd_screen = (lcd_screen + 1) % 3
            next_lcd   = now + LCD_CYCLE

        if now >= next_publish:
            with telemetry_lock:
                payload = dict(telemetry)
            client.publish('v1/devices/me/telemetry', json.dumps(payload), 1)
            print(f'Published → {payload}')
            next_publish = now + PUBLISH_INTERVAL

        time.sleep(0.1)

except KeyboardInterrupt:
    lcd_set_text('')
    lcd_set_rgb(0, 0, 0)
    client.loop_stop()
    client.disconnect()
    print('Terminated.')
    os._exit(0)