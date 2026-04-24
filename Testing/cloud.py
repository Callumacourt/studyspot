#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import time
import json
import serial
import threading
import smbus
import paho.mqtt.client as mqtt

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

# ── PAJ7620 Gesture Sensor ────────────────────────────────────────
GESTURE_ADDR = 0x73
bus          = smbus.SMBus(1)

GESTURE_NONE  = 0x00
GESTURE_RIGHT = 0x01   # person entering  → count++
GESTURE_LEFT  = 0x02   # person leaving   → count--
GESTURE_UP    = 0x04
GESTURE_DOWN  = 0x08

PAJ7620_INIT_REG = [
    (0xEF, 0x00), (0x37, 0x07), (0x38, 0x17), (0x39, 0x06),
    (0x42, 0x01), (0x46, 0x2D), (0x47, 0x0F), (0x48, 0x3C),
    (0x49, 0x00), (0x4A, 0x1E), (0x4B, 0x1E), (0x4C, 0x20),
    (0x4D, 0x00), (0x4E, 0x1A), (0x4F, 0x14), (0x50, 0x00),
    (0x51, 0x10), (0x52, 0x00), (0x5C, 0x02), (0x5D, 0x00),
    (0x5E, 0x10), (0x5F, 0x3F), (0x60, 0x27), (0x61, 0x28),
    (0x62, 0x00), (0x63, 0x03), (0x64, 0xF7), (0x65, 0x03),
    (0x66, 0xD9), (0x67, 0x03), (0x68, 0x01), (0x69, 0xC8),
    (0x6A, 0x40), (0x6D, 0x04), (0x6E, 0x00), (0x6F, 0x00),
    (0x70, 0x80), (0x71, 0x00), (0x72, 0x00), (0x73, 0x00),
    (0x74, 0xF0), (0x75, 0x00), (0x80, 0x42), (0x81, 0x44),
    (0x82, 0x04), (0x83, 0x20), (0x84, 0x20), (0x85, 0x00),
    (0x86, 0x10), (0x87, 0x00), (0x88, 0x05), (0x89, 0x18),
    (0x8A, 0x10), (0x8B, 0x01), (0x8C, 0x37), (0x8D, 0x00),
    (0x8E, 0xF0), (0x8F, 0x81), (0x90, 0x06), (0x91, 0x06),
    (0x92, 0x1E), (0x93, 0x0D), (0x94, 0x0A), (0x95, 0x0A),
    (0x96, 0x0C), (0x97, 0x05), (0x98, 0x0A), (0x99, 0x41),
    (0x9A, 0x14), (0x9B, 0x0A), (0x9C, 0x3F), (0x9D, 0x33),
    (0x9E, 0xAE), (0x9F, 0xF9), (0xA0, 0x48), (0xA1, 0x13),
    (0xA2, 0x10), (0xA3, 0x08), (0xA4, 0x30), (0xA5, 0x19),
    (0xA6, 0x10), (0xA7, 0x08), (0xA8, 0x24), (0xA9, 0x04),
    (0xAA, 0x1E), (0xAB, 0x1E), (0xCC, 0x19), (0xCD, 0x0B),
    (0xCE, 0x13), (0xCF, 0x64), (0xD0, 0x21), (0xEF, 0x01),
    (0x02, 0x0F), (0x03, 0x10), (0x04, 0x02), (0x25, 0x01),
    (0x27, 0x39), (0x28, 0x7F), (0x29, 0x08), (0x3E, 0xFF),
    (0x5E, 0x3D), (0x65, 0x96), (0x67, 0x97), (0x69, 0xCD),
    (0x6A, 0x01), (0x6D, 0x2C), (0x6E, 0x01), (0x72, 0x01),
    (0x73, 0x35), (0x74, 0x00), (0x77, 0x01), (0xEF, 0x00),
    (0x41, 0xFF), (0x42, 0x01),
]

def gesture_init():
    try:
        # Wake up sensor
        bus.write_byte_data(GESTURE_ADDR, 0xEF, 0x00)
        time.sleep(0.005)
        for reg, val in PAJ7620_INIT_REG:
            bus.write_byte_data(GESTURE_ADDR, reg, val)
            time.sleep(0.001)
        print("✓ Gesture sensor initialised")
        return True
    except Exception as e:
        print(f"Gesture init error: {e}")
        return False

def read_gesture():
    try:
        bus.write_byte_data(GESTURE_ADDR, 0xEF, 0x00)
        data0 = bus.read_byte_data(GESTURE_ADDR, 0x43)
        data1 = bus.read_byte_data(GESTURE_ADDR, 0x44)
        # Clear interrupt flags
        bus.write_byte_data(GESTURE_ADDR, 0x43, 0x00)
        bus.write_byte_data(GESTURE_ADDR, 0x44, 0x00)
        return data0 | (data1 << 8)
    except:
        return GESTURE_NONE

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
    except Exception as e:
        print(f'LCD error: {e}')

def lcd_set_rgb(r, g, b):
    if not LCD_AVAILABLE: return
    try:
        grove_rgb_lcd.setRGB(r, g, b)
    except Exception as e:
        print(f'LCD error: {e}')

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

# ── Gesture Thread ────────────────────────────────────────────────
def gesture_thread():
    global occupancyCount
    if not gesture_init():
        print("Gesture sensor failed to init — occupancy disabled")
        return

    print("Gesture thread running — swipe RIGHT=entry, LEFT=exit")
    while True:
        try:
            g = read_gesture()

            if g & GESTURE_RIGHT:
                occupancyCount += 1
                print(f"[GESTURE] → Entry  | Occupancy: {occupancyCount}")
                with telemetry_lock:
                    telemetry['occupancy'] = occupancyCount

            elif g & GESTURE_LEFT:
                occupancyCount = max(0, occupancyCount - 1)
                print(f"[GESTURE] ← Exit   | Occupancy: {occupancyCount}")
                with telemetry_lock:
                    telemetry['occupancy'] = occupancyCount

            elif g & GESTURE_UP:
                print("[GESTURE] ↑ Up detected (ignored)")

            elif g & GESTURE_DOWN:
                print("[GESTURE] ↓ Down detected (ignored)")

        except Exception as e:
            print(f'Gesture error: {e}')

        time.sleep(0.1)

g_thread = threading.Thread(target=gesture_thread, daemon=True)
g_thread.start()

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
                        print(f"BT parsed ← temp:{telemetry['temperature']} hum:{telemetry['humidity']} sound:{telemetry['sound']} light:{telemetry['light']}")
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