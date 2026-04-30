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
from camera import Camera
from obj_detector import ObjectDetector

class RoomManager():
    
    def __init__(self, room_info_p):
        # load room settings
        json_file = open(room_info_p, "r")
        self.info = json.load(json_file)
        json_file.close()
        
        self.LCD_RGB_ADDR = int(self.info['lcd']['rgb_addr'], 16)
        self.LCD_TEXT_ADDR = int(self.info['lcd']['text_addr'], 16)
        self.occupancyCount = 0
        self.telemetry = {
            'temperature': 0,
            'humidity':    0,
            'sound':       0,
            'light':       0,
            'occupancy':   0,
        }
        self.telemetry_lock = threading.Lock()
        self.status = True
        self.camera = Camera(res_x=300, res_y=300, save_p='images/')
        self.obj_detector = ObjectDetector(model_p='detect.tflite', conf_thres=0.5)
        
        self.bus = smbus.SMBus(1)
        
        self.thingsboard_init()
        
    def bluetooth_thread(self):
        while self.status:
            try:
                bt = serial.Serial(self.info['bluetooth']['port'], int(self.info['bluetooth']['baud']), timeout=5)
                print("Bluetooth connected on " + self.info['bluetooth']['port'])
                while self.status:
                    raw = bt.readline().decode('utf-8', errors='ignore').strip()
                    if not raw:
                        continue
                    try:
                        data = json.loads(raw)
                        if data.get('node') == 'environment':
                            with self.telemetry_lock:
                                self.telemetry['temperature'] = data.get('temperature', self.telemetry['temperature'])
                                self.telemetry['humidity']    = data.get('humidity',    self.telemetry['humidity'])
                                self.telemetry['sound']       = data.get('sound',       self.telemetry['sound'])
                                self.telemetry['light']       = data.get('light',       self.telemetry['light'])
                            print(f"BT temp:{self.telemetry['temperature']} hum:{self.telemetry['humidity']} sound:{self.telemetry['sound']} light:{self.telemetry['light']}")
                    except json.JSONDecodeError:
                        pass
            except serial.SerialException as e:
                print(f"Bluetooth error: {e} — retrying in 5s")
                time.sleep(5)
    
    def camera_occupancy(self):
        # take a snapshot
        img_path = self.camera.test_cap()
        # run it through the model
        alt_occupancy = self.obj_detector.detect_object(image_p=img_path, obj_class=0)
        print(alt_occupancy)
        return alt_occupancy
    
    def occupancy_thread(self):
        
        doorState        = 'IDLE'
        firstEventTime   = 0
        lastCrossingTime = 0
        lastUs1          = False
        lastUs2          = False
        interval = int(self.info['occupancy']['snapshot_interval'])
        next_snapshot = time.time() + interval

        print("Occupancy thread started — US1=D3 (outside) US2=D4 (inside)")

        while self.status:
            try:
                now_ms = int(time.time() * 1000)

                try:
                    d1  = grovepi.ultrasonicRead(int(self.info['us_pins']['out']))
                    us1 = (0 < d1 < int(self.info['occupancy']['trigger_dist']))
                except:
                    us1 = False
                    d1  = -1

                try:
                    d2  = grovepi.ultrasonicRead(int(self.info['us_pins']['out']))
                    us2 = (0 < d2 < int(self.info['occupancy']['trigger_dist']))
                except:
                    us2 = False
                    d2  = -1

                us1_rising = (us1 and not lastUs1)
                us2_rising = (us2 and not lastUs2)
                lastUs1 = us1
                lastUs2 = us2

                if (now_ms - lastCrossingTime) < int(self.info['occupancy']['crossing_cooldown']):
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
                        self.occupancyCount += 1
                        lastCrossingTime = now_ms
                        doorState = 'IDLE'
                        print(f"[DOOR] ENTRY → Occupancy: {self.occupancyCount}")
                        with self.telemetry_lock:
                            self.telemetry['occupancy'] = self.occupancyCount
                    elif (now_ms - firstEventTime) > int(self.info['occupancy']['direction_timeout']):
                        doorState = 'IDLE'
                        print("[US1] Timeout — reset")

                elif doorState == 'US2_FIRED':
                    if us1_rising:
                        self.occupancyCount = max(0, self.occupancyCount - 1)
                        lastCrossingTime = now_ms
                        doorState = 'IDLE'
                        print(f"[DOOR] EXIT  → Occupancy: {self.occupancyCount}")
                        with self.telemetry_lock:
                            self.telemetry['occupancy'] = self.occupancyCount
                    elif (now_ms - firstEventTime) > int(self.info['occupancy']['direction_timeout']):
                        doorState = 'IDLE'
                        print("[US2] Timeout — reset")

                # check occ with camera every 60 seconds
                if(time.time() > next_snapshot):
                    
                    # check people with camera, if the difference is more than 2
                    # take another snapshot, if it is the same then
                    # use as occupancy
                    next_snapshot = time.time() + interval
                    
                    alt_occupancy = self.camera_occupancy()
                    
                    if( abs (alt_occupancy - self.occupancyCount) >= 2):
                        
                        alt_occupancy = self.camera_occupancy()
                        
                    if( abs (alt_occupancy - self.occupancyCount) >= 2):
                        
                        self.occupancyCount = alt_occupancy
                    
                    
                        
                    
            except Exception as e:
                print(f"Occupancy error: {e}")

            time.sleep(0.05)
    
    def on_connect(self, client, userdata, flags, rc, *extra):
        print(f"ThingsBoard connected, rc={rc}")
        
    def on_publish(self, client, userdata, result):
        print("Published to ThingsBoard")

    
    def thingsboard_init(self):
        client = mqtt.Client()
        client.username_pw_set(self.info['thingsboard']['token'])
        client.on_connect = self.on_connect
        client.on_publish = self.on_publish
        client.connect(self.info['thingsboard']['host'], 1883, 60)
        client.loop_start()
        self.client = client
        
    def lcd_init(self):
        try:
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x00, 0x00)
            time.sleep(0.01)
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x01, 0x00)
            time.sleep(0.01)
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x08, 0xaa)
            time.sleep(0.01)
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x80, 0x01)
            time.sleep(0.05)
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x80, 0x08 | 0x04)
            time.sleep(0.01)
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x80, 0x28)
            time.sleep(0.01)
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x80, 0x06)
            time.sleep(0.01)
        except Exception as e:
            print(f"LCDInit Error: {e}")
        
    def lcd_set_rgb(self, r, g, b):
        try:
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x04, r)
            time.sleep(0.005)
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x03, g)
            time.sleep(0.005)
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x02, b)
            time.sleep(0.005)
        except Exception as e:
            print(f"SetRGB Error: {e}")
            
    def lcd_write_char(self, char):
        try:
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x40, ord(char))
            time.sleep(0.002)
        except:
            pass
    
    def lcd_set_text(self, line1, line2=''):
        try:
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x80, 0x01)
            time.sleep(0.05)
            line1 = line1[:16].ljust(16)
            for char in line1:
                self.lcd_write_char(char)
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x80, 0xc0)
            time.sleep(0.01)
            line2 = line2[:16].ljust(16)
            for char in line2:
                self.lcd_write_char(char)
        except Exception as e:
            print(f"LCD text error: {e} — reinitialising")
            self.lcd_init()
            
    def get_lcd_colour(self, occ):
        if occ == 0:     return (0, 0, 255)
        elif occ <= 5:   return (0, 255, 0)
        elif occ <= 10:  return (255, 165, 0)
        else:            return (255, 0, 0)
        
    def update_lcd(self, screen):
        with self.telemetry_lock:
            t   = self.telemetry['temperature']
            h   = self.telemetry['humidity']
            s   = self.telemetry['sound']
            l   = self.telemetry['light']
            occ = self.telemetry['occupancy']
        if l < 200:   light_str = "Dark"
        elif l < 500: light_str = "Dim"
        else:         light_str = "Bright"

        if s < 40:    sound_str = "Quiet"
        elif s < 60:  sound_str = "Moderate"
        else:         sound_str = "Loud"

        r, g, b = self.get_lcd_colour(occ)
        self.lcd_set_rgb(r, g, b)

        if screen == 0:
            self.lcd_set_text(f"Temp:{t:.1f}C", f"Humid:{h:.0f}%")
        elif screen == 1:
            self.lcd_set_text(f"Occupancy:{occ}", f"Sound:{sound_str}")
        else:
            self.lcd_set_text(f"Light:{light_str}", f"Occ:{occ}")
            
    def main_process(self):
        
        occ_thread = threading.Thread(target=self.occupancy_thread, daemon=True)
        occ_thread.start()

        bt_thread = threading.Thread(target=self.bluetooth_thread, daemon=True)
        bt_thread.start()
        
        self.lcd_init()
        pub_interval = int(self.info['thingsboard']['publish_interval'])
        next_publish = time.time()
        next_lcd = time.time()
        lcd_screen = 0
        try:
            while True:
                now = time.time()
        
                if now >= next_lcd:
                    self.update_lcd(lcd_screen)
                    lcd_screen = (lcd_screen + 1) % 3
                    next_lcd   = now + int(self.info['lcd']['cycle_period'])

                if now >= next_publish:
                    with self.telemetry_lock:
                        payload = dict(self.telemetry)
                    self.client.publish(self.info['thingsboard']['topic'], json.dumps(payload), 1)
                    print(f"Published > {payload}")
                    next_publish = now + pub_interval

                time.sleep(0.5)

        except KeyboardInterrupt:
            self.status = False
            try:
                self.lcd_set_text('StudySpot', 'Offline')
                time.sleep(1)
                self.lcd_set_rgb(0, 0, 0)
                self.lcd_set_text('', '')
            except:
                pass
            self.client.loop_stop()
            self.client.disconnect()
            print("Terminated.")
            os._exit(0)
                
    
        