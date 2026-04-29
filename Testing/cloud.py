#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import time
import json
import serial
import threading
import smbus
import paho.mqtt.client as mqtt
import grovepi

# ── Camera / Vision imports ───────────────────────────────────────
try:
    from camera import Camera
    from obj_detector import ObjectDetector
    CAMERA_AVAILABLE = True
    print("✓ Camera module loaded")
except ImportError as e:
    CAMERA_AVAILABLE = False
    print(f"WARNING: Camera not available — {e}")

# ── ThingsBoard Config ────────────────────────────────────────────
THINGSBOARD_HOST = 'thingsboard.cs.cf.ac.uk'
ACCESS_TOKEN     = 'oR1ywp7HMZXwD6c6is90'

# ── Bluetooth Config ──────────────────────────────────────────────
BT_PORT = '/dev/rfcomm0'
BT_BAUD = 9600

# ── GrovePi Ultrasonic Pins ───────────────────────────────────────
US1_PIN = 3   # D3 — outside sensor
US2_PIN = 4   # D4 — inside sensor

# ── Occupancy Config ──────────────────────────────────────────────
TRIGGER_CM           = 50
DIRECTION_WINDOW_MS  = 2000
CROSSING_COOLDOWN_MS = 2000

# ── Camera Config ─────────────────────────────────────────────────
CAMERA_INTERVAL = 30   # take a photo every 30 seconds
IMAGE_PATH      = 'images/'
IMAGE_FILE      = 'current.jpg'

# ── LCD Config ────────────────────────────────────────────────────
LCD_RGB_ADDR  = 0x62
LCD_TEXT_ADDR = 0x3e
LCD_CYCLE     = 8

# ── Shared State ──────────────────────────────────────────────────
occupancyCount  = 0
cameraCount     = 0    # last person count from camera
telemetry = {
    'temperature':  0,
    'humidity':     0,
    'sound':        0,
    'light':        0,
    'occupancy':    0,
    'camera_count': 0,   # published separately so ThingsBoard can show both
}
telemetry_lock = threading.Lock()

# ── LCD Setup ─────────────────────────────────────────────────────
try:
    _bus = smbus.SMBus(1)
    LCD_AVAILABLE = True
except Exception as e:
    print(f"SMBus init error: {e}")
    LCD_AVAILABLE = False

def lcd_init():
    if not LCD_AVAILABLE:
        return False
    try:
        _bus.write_byte_data(LCD_RGB_ADDR, 0x00, 0x00)
        time.sleep(0.01)
        _bus.write_byte_data(LCD_RGB_ADDR, 0x01, 0x00)
        time.sleep(0.01)
        _bus.write_byte_data(LCD_RGB_ADDR, 0x08, 0xaa)
        time.sleep(0.01)
        _bus.write_byte_data(LCD_TEXT_ADDR, 0x80, 0x01)
        time.sleep(0.05)
        _bus.write_byte_data(LCD_TEXT_ADDR, 0x80, 0x08 | 0x04)
        time.sleep(0.01)
        _bus.write_byte_data(LCD_TEXT_ADDR, 0x80, 0x28)
        time.sleep(0.01)
        _bus.write_byte_data(LCD_TEXT_ADDR, 0x80, 0x06)
        time.sleep(0.01)
        print("✓ LCD initialised")
        return True
    except Exception as e:
        print(f"LCD init error: {e}")
        return False

def lcd_set_rgb(r, g, b):
    if not LCD_AVAILABLE:
        return
    try:
        _bus.write_byte_data(LCD_RGB_ADDR, 0x04, r)
        time.sleep(0.005)
        _bus.write_byte_data(LCD_RGB_ADDR, 0x03, g)
        time.sleep(0.005)
        _bus.write_byte_data(LCD_RGB_ADDR, 0x02, b)
        time.sleep(0.005)
    except:
        pass

def lcd_write_char(char):
    if not LCD_AVAILABLE:
        return
    try:
        _bus.write_byte_data(LCD_TEXT_ADDR, 0x40, ord(char))
        time.sleep(0.002)
    except:
        pass

def lcd_set_text(line1, line2=''):
    if not LCD_AVAILABLE:
        return
    try:
        _bus.write_byte_data(LCD_TEXT_ADDR, 0x80, 0x01)
        time.sleep(0.05)
        line1 = line1[:16].ljust(16)
        for char in line1:
            lcd_write_char(char)
        _bus.write_byte_data(LCD_TEXT_ADDR, 0x80, 0xc0)
        time.sleep(0.01)
        line2 = line2[:16].ljust(16)
        for char in line2:
            lcd_write_char(char)
    except Exception as e:
        print(f"LCD text error: {e} — reinitialising")
        lcd_init()

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
        cam = telemetry['camera_count']

    if l < 200:   light_str = "Dark"
    elif l < 500: light_str = "Dim"
    else:         light_str = "Bright"

    if s < 40:    sound_str = "Quiet"
    elif s < 60:  sound_str = "Moderate"
    else:         sound_str = "Loud"

    r, g, b = get_lcd_colour(occ)
    lcd_set_rgb(r, g, b)

    if screen == 0:
        lcd_set_text(f"Temp:{t:.1f}C", f"Humid:{h:.0f}%")
    elif screen == 1:
        lcd_set_text(f"Occ:{occ} Cam:{cam}", f"Sound:{sound_str}")
    else:
        lcd_set_text(f"Light:{light_str}", f"Occ:{occ}")

# ── MQTT Setup ────────────────────────────────────────────────────
def on_connect(client, userdata, flags, rc, *extra):
    print(f"ThingsBoard connected, rc={rc}")

def on_publish(client, userdata, result):
    print("✓ Published to ThingsBoard")

client = mqtt.Client()
client.username_pw_set(ACCESS_TOKEN)
client.on_connect = on_connect
client.on_publish = on_publish
client.connect(THINGSBOARD_HOST, 1883, 60)
client.loop_start()

# ── Camera Vision Thread ──────────────────────────────────────────
# Runs every CAMERA_INTERVAL seconds, takes a photo and counts
# people using TFLite object detection model (class 0 = person).
# Result is published to ThingsBoard as camera_count alongside
# the ultrasonic occupancy count for comparison/validation.

def camera_thread():
    global cameraCount

    if not CAMERA_AVAILABLE:
        print("Camera thread not started — module unavailable")
        return

    try:
        picamera       = Camera(res_x=300, res_y=300, save_p=IMAGE_PATH, filename=IMAGE_FILE)
        person_detector = ObjectDetector(conf_thres=0.5)
        print("✓ Camera and detector initialised")
    except Exception as e:
        print(f"Camera init error: {e}")
        return

    while True:
        try:
            print("[CAM] Taking photo...")
            image_path = picamera.std_cap()
            people     = person_detector.detect_object(image_p=image_path, obj_class=0)
            cameraCount = people
            print(f"[CAM] Detected {people} people in frame")

            with telemetry_lock:
                telemetry['camera_count'] = cameraCount

        except Exception as e:
            print(f"Camera error: {e}")

        time.sleep(CAMERA_INTERVAL)

cam_thread = threading.Thread(target=camera_thread, daemon=True)
cam_thread.start()

# ── Occupancy Thread ──────────────────────────────────────────────
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

            try:
                d1  = grovepi.ultrasonicRead(US1_PIN)
                us1 = (0 < d1 < TRIGGER_CM)
            except:
                us1 = False
                d1  = -1

            try:
                d2  = grovepi.ultrasonicRead(US2_PIN)
                us2 = (0 < d2 < TRIGGER_CM)
            except:
                us2 = False
                d2  = -1

            us1_rising = (us1 and not lastUs1)
            us2_rising = (us2 and not lastUs2)
            lastUs1 = us1
            lastUs2 = us2

            if (now_ms - lastCrossingTime) < CROSSING_COOLDOWN_MS:
                time.sleep(0.05)
                continue

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
            print(f"Occupancy error: {e}")

        time.sleep(0.05)

occ_thread = threading.Thread(target=occupancy_thread, daemon=True)
occ_thread.start()

# ── Bluetooth Reader Thread ───────────────────────────────────────
def bluetooth_reader():
    while True:
        try:
            bt = serial.Serial(BT_PORT, BT_BAUD, timeout=5)
            print(f"✓ Bluetooth connected on {BT_PORT}")
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
            print(f"Bluetooth error: {e} — retrying in 5s")
            time.sleep(5)

bt_thread = threading.Thread(target=bluetooth_reader, daemon=True)
bt_thread.start()

# ── Main Loop ─────────────────────────────────────────────────────
PUBLISH_INTERVAL = 5
next_publish     = time.time()
next_lcd         = time.time()
lcd_screen       = 0

lcd_init()
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
            print(f"Published → {payload}")
            next_publish = now + PUBLISH_INTERVAL

        time.sleep(0.5)

except KeyboardInterrupt:
    try:
        lcd_set_text('StudySpot', 'Offline')
        time.sleep(1)
        lcd_set_rgb(0, 0, 0)
        lcd_set_text('', '')
    except:
        pass
    client.loop_stop()
    client.disconnect()
    print("Terminated.")
    os._exit(0)