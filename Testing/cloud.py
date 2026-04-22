#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import time
import json
import serial
import paho.mqtt.client as mqtt

try:
    import grove_rgb_lcd
    LCD_AVAILABLE = True
except ImportError:
    LCD_AVAILABLE = False
    print("WARNING: grove_rgb_lcd not found — LCD disabled")

# ── ThingsBoard Config ────────────────────────────────────────────
THINGSBOARD_HOST = 'thingsboard.cs.cf.ac.uk'
ACCESS_TOKEN = 'oR1ywp7HMZXwD6c6is90'

# ── Bluetooth Config ──────────────────────────────────────────────
BT_PORT = '/dev/rfcomm0'
BT_BAUD = 9600

# ── Telemetry ─────────────────────────────────────────────────────
telemetry = {
    'temperature': 0,
    'humidity': 0,
    'sound': 0,
    'light': 0,
    'occupancy': 0,
}

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
    if occupancy == 0: return (0, 0, 255)
    elif occupancy <= 5: return (0, 255, 0)
    elif occupancy <= 10: return (255, 165, 0)
    else: return (255, 0, 0)

def update_lcd(screen):
    r, g, b = get_lcd_colour(telemetry['occupancy'])
    lcd_set_rgb(r, g, b)
    if screen == 0:
        lcd_set_text(f"Temp: {telemetry['temperature']:.1f}C\nHumid: {telemetry['humidity']:.1f}%")
    elif screen == 1:
        lcd_set_text(f"Occupancy: {telemetry['occupancy']}\nSound: {telemetry['sound']}dB")
    else:
        lcd_set_text(f"Light: {telemetry['light']}lux\n")

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

# ── Main Loop ─────────────────────────────────────────────────────
PUBLISH_INTERVAL = 5
LCD_CYCLE = 3
next_publish = time.time()
next_lcd = time.time()
lcd_screen = 0

print(f'Opening Bluetooth on {BT_PORT}...')

try:
    bt = serial.Serial(BT_PORT, BT_BAUD, timeout=5)
    print('✓ Bluetooth connected')

    while True:
        now = time.time()

        # ── Read one line from Arduino ────────────────────────────
        raw = bt.readline().decode('utf-8', errors='ignore').strip()
        if raw:
            print(f'BT raw: {raw}')
            try:
                data = json.loads(raw)
                if data.get('node') == 'environment':
                    telemetry['temperature'] = data.get('temperature', telemetry['temperature'])
                    telemetry['humidity'] = data.get('humidity', telemetry['humidity'])
                    telemetry['sound'] = data.get('sound', telemetry['sound'])
                    telemetry['light'] = data.get('light', telemetry['light'])
                    telemetry['occupancy'] = data.get('occupancy', telemetry['occupancy'])
                    print(f'Parsed ← {telemetry}')
            except json.JSONDecodeError:
                print(f'Not JSON, skipped: {raw}')

        # ── Cycle LCD ─────────────────────────────────────────────
        if now >= next_lcd:
            update_lcd(lcd_screen)
            lcd_screen = (lcd_screen + 1) % 3
            next_lcd = now + LCD_CYCLE

        # ── Publish to ThingsBoard ────────────────────────────────
        if now >= next_publish:
            client.publish('v1/devices/me/telemetry', json.dumps(telemetry), 1)
            print(f'Published → {telemetry}')
            next_publish = now + PUBLISH_INTERVAL

except serial.SerialException as e:
    print(f'Bluetooth error: {e}')
except KeyboardInterrupt:
    lcd_set_text('')
    lcd_set_rgb(0, 0, 0)
    client.loop_stop()
    client.disconnect()
    print('Terminated.')
    os._exit(0)