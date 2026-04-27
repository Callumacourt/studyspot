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

# ── Bluetooth Config ──────────────────────────────────────────────
BT_PORT = '/dev/rfcomm0'
BT_BAUD = 9600

# ── GrovePi Ultrasonic Pins ───────────────────────────────────────
US1_PIN = 3   # D3 — outside sensor
US2_PIN = 4   # D4 — inside sensor

# Trigger distance — object closer than this = detected
TRIGGER_CM = 50

# How long to wait for second sensor after first triggers (ms)
DIRECTION_WINDOW_MS  = 2000

# Minimum time between crossings (ms)
CROSSING_COOLDOWN_MS = 2000

# ── Shared State ──────────────────────────────────────────────────
occupancyCount = 0
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
    except:
        pass

def lcd_set_rgb(r, g, b):
    if not LCD_AVAILABLE: return
    try:
        grove_rgb_lcd.setRGB(r, g, b)
    except:
        pass

def get_lcd_colour(occ):
    if occ == 0:     return (0, 0, 255)
    elif occ <= 5:   return (0, 255, 0)
    elif occ <= 10:  return (255, 165, 0)
    else:            return (255, 0, 0)

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

# ── Dual Ultrasonic Occupancy Thread ─────────────────────────────
#
#  State machine:
#    IDLE      → waiting for either sensor to trigger
#    US1_FIRED → US1 triggered first (possible entry)
#    US2_FIRED → US2 triggered first (possible exit)
#
#  Entry: US1 triggers → US2 triggers within window → count++
#  Exit:  US2 triggers → US1 triggers within window → count--

def occupancy_thread():
    global occupancyCount

    doorState        = 'IDLE'
    firstEventTime   = 0
    lastCrossingTime = 0
    lastUs1          = False
    lastUs2          = False

    print("Occupancy thread started — US1=D3 (outside) US2=D4 (inside)")

    while True:
        try:
            now_ms = int(time.time() * 1000)

            # Read both sensors
            try:
                d1 = grovepi.ultrasonicRead(US1_PIN)
                us1 = (0 < d1 < TRIGGER_CM)
            except:
                us1 = False

            try:
                d2 = grovepi.ultrasonicRead(US2_PIN)
                us2 = (0 < d2 < TRIGGER_CM)
            except:
                us2 = False

            # Rising edge detection
            us1_rising = (us1 and not lastUs1)
            us2_rising = (us2 and not lastUs2)
            lastUs1 = us1
            lastUs2 = us2

            # Cooldown guard
            if (now_ms - lastCrossingTime) < CROSSING_COOLDOWN_MS:
                time.sleep(0.05)
                continue

            # State machine
            if doorState == 'IDLE':
                if us1_rising and not us2:
                    doorState      = 'US1_FIRED'
                    firstEventTime = now_ms
                    print(f"[US1] Triggered at {d1}cm — waiting for US2...")
                elif us2_rising and not us1:
                    doorState      = 'US2_FIRED'
                    firstEventTime = now_ms
                    print(f"[US2] Triggered at {d2}cm — waiting for US1...")

            elif doorState == 'US1_FIRED':
                if us2_rising:
                    # Entry confirmed
                    occupancyCount += 1
                    lastCrossingTime = now_ms
                    doorState = 'IDLE'
                    print(f"[DOOR] ENTRY → Occupancy: {occupancyCount}")
                    with telemetry_lock:
                        telemetry['occupancy'] = occupancyCount
                elif (now_ms - firstEventTime) > DIRECTION_WINDOW_MS:
                    doorState = 'IDLE'
                    print("[US1] Timeout — reset")

            elif doorState == 'US2_FIRED':
                if us1_rising:
                    # Exit confirmed
                    occupancyCount = max(0, occupancyCount - 1)
                    lastCrossingTime = now_ms
                    doorState = 'IDLE'
                    print(f"[DOOR] EXIT  → Occupancy: {occupancyCount}")
                    with telemetry_lock:
                        telemetry['occupancy'] = occupancyCount
                elif (now_ms - firstEventTime) > DIRECTION_WINDOW_MS:
                    doorState = 'IDLE'
                    print("[US2] Timeout — reset")

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
                try:
                    data = json.loads(raw)
                    if data.get('node') == 'environment':
                        with telemetry_lock:
                            telemetry['temperature'] = data.get('temperature', telemetry['temperature'])
                            telemetry['humidity']    = data.get('humidity',    telemetry['humidity'])
                            telemetry['sound']       = data.get('sound',       telemetry['sound'])
                            telemetry['light']       = data.get('light',       telemetry['light'])
                        print(f"BT ← temp:{telemetry['temperature']} hum:{telemetry['humidity']} sound:{telemetry['sound']} light:{telemetry['light']}")
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
    try:
        lcd_set_text('')
        lcd_set_rgb(0, 0, 0)
    except:
        pass
    client.loop_stop()
    client.disconnect()
    print('Terminated.')
    os._exit(0)