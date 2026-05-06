#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from os import _exit
from time import sleep,time
import json
from serial import Serial, SerialException
from threading import Thread
from smbus import SMBus
from paho.mqtt.client import Client
from grovepi import ultrasonicRead
from camera import Camera
from obj_detector import ObjectDetector

class RoomManager():
    """Object that handles the main running of a studyspot room
    Is an object so that multiple rooms can be run from one script
    
    Parameters
    ----------
    room_info_p : `string`
        String containing a path to the rooms info file
    """
    
    def __init__(self, room_info_p):
        
        # load room settings
        json_file = open(room_info_p, "r")
        self.info = json.load(json_file)
        json_file.close()
        
        self.status = True
        
        # set up lcd and telemetry parameters
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
        if(bool(self.info['camera'])):
            # create the object responsible for the pi camera
            self.camera = Camera(res_x=300, res_y=300, save_p='images/')
            # create the object responsible for object detection
            self.obj_detector = ObjectDetector(model_p='detect.tflite', conf_thres=0.5)
        else:
            self.camera = None
        # create a bus for writing to the LCD
        self.bus = SMBus(1)
        
        self.thingsboard_init()
    
    def camera_occupancy(self):
        """Counts the occupancy with the camera and an object detection model
        """
        img_path = self.camera.std_cap()
        alt_occupancy = self.obj_detector.detect_object(image_p=img_path, obj_class=0)
        return alt_occupancy
    
    def occupancy_thread(self):
        """Handles the tracking of occupancy for the room
        Ultrasonic sensor readings are the primary way of tracking
        Camera is used to account for large groups entering that the sensors
        may not pick up
        """
        doorState        = 'IDLE'
        firstEventTime   = 0
        lastCrossingTime = 0
        lastUs1          = False
        lastUs2          = False
        interval = int(self.info['occupancy']['snapshot_interval'])
        next_snapshot = time()

        print("Occupancy thread started")

        while self.status:
            try:
                now_ms = int(time() * 1000)
                # Read from the ultrasonic sensors, set to true if they detect
                # something in range
                try:
                    d1  = ultrasonicRead(int(self.info['us_pins']['out']))
                    us1 = (0 < d1 < int(self.info['occupancy']['trigger_dist']))
                except:
                    us1 = False
                    d1  = -1

                try:
                    d2  = ultrasonicRead(int(self.info['us_pins']['in']))
                    us2 = (0 < d2 < int(self.info['occupancy']['trigger_dist']))
                except:
                    us2 = False
                    d2  = -1
                # stops same sensor firing multiple times for same object passing
                us1_rising = (us1 and not lastUs1)
                us2_rising = (us2 and not lastUs2)
                lastUs1 = us1
                lastUs2 = us2
                # cooldown for crossings so that there isnt false positives or double counts
                if (now_ms - lastCrossingTime) > int(self.info['occupancy']['crossing_cooldown']):
                    
                    # state based checks to see if crossings are exits or entries
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
                            
                        elif (now_ms - firstEventTime) > int(self.info['occupancy']['direction_timeout']):
                            doorState = 'IDLE'
                            print("[US1] Timeout — reset")

                    elif doorState == 'US2_FIRED':
                        if us1_rising:
                            self.occupancyCount = max(0, self.occupancyCount - 1)
                            lastCrossingTime = now_ms
                            doorState = 'IDLE'
                            print(f"[DOOR] EXIT  → Occupancy: {self.occupancyCount}")
                        elif (now_ms - firstEventTime) > int(self.info['occupancy']['direction_timeout']):
                            doorState = 'IDLE'
                            print("[US2] Timeout — reset")
                else:
                    sleep(0.5)
                
                # check occ with camera periodically seconds
                if( (time() > next_snapshot) and self.camera):
                    # check people with camera, if the difference is more than 2
                    # take another snapshot, if it is the same then
                    # use as occupancy
                    next_snapshot = time() + interval
                    alt_occupancy = self.camera_occupancy()
                    
                    print("Camera Trigger")
                    if( abs(alt_occupancy - self.occupancyCount) >= 2):
                        
                        alt_occupancy = self.camera_occupancy()
                        
                    if( abs(alt_occupancy - self.occupancyCount) >= 2):
                        print("Saw difference of " + str(abs(alt_occupancy-self.occupancyCount)) + " people from camera, updating count..")
                        self.occupancyCount = alt_occupancy
                        
                    else:
                        print("Camera output aligned, no change needed")
                # set the occupancy for posting
                self.telemetry['occupancy'] = self.occupancyCount
                
            except Exception as e:
                print(f"Occupancy error: {e}")
            sleep(0.05)
    
    def on_connect(self, client, userdata, flags, rc, *extra):
        print(f"ThingsBoard connected, rc={rc}")
        
    def on_publish(self, client, userdata, result):
        print("Published to ThingsBoard")

    def lcd_init(self):
        """Resets the LCD screen to blank
        """
        try:
            #reset rgb
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x00, 0x00)
            sleep(0.01)
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x01, 0x00)
            sleep(0.01)
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x08, 0xaa)
            sleep(0.01)
            # send commands to clear
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x80, 0x01)
            sleep(0.05)
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x80, 0x08 | 0x04)
            sleep(0.01)
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x80, 0x28)
            sleep(0.01)
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x80, 0x06)
            sleep(0.01)
        except Exception as e:
            print(f"LCDInit Error: {e}")
        
    def lcd_set_rgb(self, r, g, b):
        """Sets the rgb value for the lcd screen
        
        Parameters
        ----------
        r : int
            the red value for the screen colour
        g : int
            the green value for the screen colour
        b : int
            the blue value for the screen colour
        """
        try:
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x00, 0)
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x01, 0)
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x08, 0xaa)
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x04, r)
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x03, g)
            self.bus.write_byte_data(self.LCD_RGB_ADDR, 0x02, b)
        except Exception as e:
            print(f"SetRGB Error: {e}")
            
    def lcd_write_char(self, char):
        """Write a character to the lcd screen
        
        Parameters
        ----------
        char : string
            Character to write to screen
        """
        try:
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x40, ord(char))
            sleep(0.002)
        except:
            pass
    
    def lcd_set_text(self, line1, line2=''):
        """Sets the text on the lcd screen
        
        Parameters
        ----------
        line1 : string
            first line of text to display
        line2 : string
            second line of text to display
        """
        try:
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x80, 0x01)
            sleep(0.05)
            line1 = line1[:16].ljust(16)
            for char in line1:
                self.lcd_write_char(char)
            self.bus.write_byte_data(self.LCD_TEXT_ADDR, 0x80, 0xc0)
            sleep(0.01)
            line2 = line2[:16].ljust(16)
            for char in line2:
                self.lcd_write_char(char)
        except Exception as e:
            print(f"LCD text error: {e} — reinitialising")
            self.lcd_init()
                
    def get_lcd_colour(self, occ):
        """Returns rgb values based on the occupancy of the room
        
        Parameters
        ----------
        occ : int
            Occupancy of the room
        """
        if occ == 0:     return 0, 0, 255
        elif occ <= 5:   return 0, 255, 0
        elif occ <= 10:  return 255, 165, 0
        else:            return 255, 0, 0
        
    def update_lcd(self, screen):
        """ Updates the lcd screen with telemetry data
        
        Parameters
        ----------
        screen : int
            Current screen cycle to display
        """
        t   = self.telemetry['temperature']
        h   = self.telemetry['humidity']
        s   = self.telemetry['sound']
        l   = self.telemetry['light']
        occ = self.telemetry['occupancy']
        # Thresholds for light level to make them more digestable
        if l < 200:   light_str = "Dark"
        elif l < 500: light_str = "Dim"
        else:         light_str = "Bright"
        # Thresholds for sound level
        if s <= 33:    sound_str = "Quiet"
        elif s == 34:  sound_str = "Moderate"
        else:         sound_str = "Loud"
        
        r, g, b = self.get_lcd_colour(occ)
        self.lcd_set_rgb(r, g, b)
        
        # change what is diplayed based on screen cycle
        if screen == 0:
            self.lcd_set_text(f"Temp:{t:.1f}C", f"Humid:{h:.0f}%")
        elif screen == 1:
            self.lcd_set_text(f"Occupancy:{occ}", f"Sound:{sound_str}")
        else:
            self.lcd_set_text(f"Light:{light_str}", f"Occ:{occ}")
    
    def bluetooth_thread(self):
        """Handles the fetching of telemetry data from the arduino via bluetooth
        """
        # loop for bluetooth to reconnect if an error occurs
        while self.status:
            try:
                # establish bluetooth connection
                bt = Serial(self.info['bluetooth']['port'], int(self.info['bluetooth']['baud']), timeout=5)
                print("Bluetooth connected on " + self.info['bluetooth']['port'])
                while self.status:
                    raw = bt.readline().decode('utf-8', errors='ignore').strip()
                    if not raw:
                        continue
                    try:
                        data = json.loads(raw)
                        if data.get('node') == 'environment':
                            self.telemetry['temperature'] = data.get('temperature', self.telemetry['temperature'])
                            self.telemetry['humidity']    = data.get('humidity',    self.telemetry['humidity'])
                            self.telemetry['sound']       = data.get('sound',       self.telemetry['sound'])
                            self.telemetry['light']       = data.get('light',       self.telemetry['light'])
                    except json.JSONDecodeError:
                        pass
            except SerialException as e:
                print(f"Bluetooth error: {e} — retrying in 5s")
                sleep(5)
    
    def thingsboard_init(self):
        """Establishes conection with thingsboard in order to post room data
        """
        client = Client()
        client.username_pw_set(self.info['thingsboard']['token'])
        client.on_connect = self.on_connect
        client.on_publish = self.on_publish
        client.connect(self.info['thingsboard']['host'], 1883, 60)
        client.loop_start()
        self.client = client
        
    
    def main_process(self):
        # Run the occupancy code and bluetooth code on separate threads 
        occ_thread = Thread(target=self.occupancy_thread, daemon=True)
        occ_thread.start()

        bt_thread = Thread(target=self.bluetooth_thread, daemon=True)
        bt_thread.start()
        
        self.lcd_init()
        pub_interval = int(self.info['thingsboard']['publish_interval'])
        cycle_interval = int(self.info['lcd']['cycle_period'])
        # timer vars for publishing to thingsboard and lcd
        next_publish = time()
        next_lcd = time()
        lcd_screen = 0
        try:
            while self.status:
                now = time()
                # cycle screen on lcd if enough time has elapsed
                if now >= next_lcd:
                    self.update_lcd(lcd_screen)
                    lcd_screen = (lcd_screen + 1) % 3
                    next_lcd   = now + cycle_interval
                # publish telemetry data to thingsboard if enough time has elapsed
                if now >= next_publish:
                    payload = dict(self.telemetry)
                    self.client.publish(self.info['thingsboard']['topic'], json.dumps(payload), 1)
                    print(f"Published > {payload}")
                    next_publish = now + pub_interval
                sleep(0.5)

        except KeyboardInterrupt:
            # if program is terminated attempt to stop all processes
            self.status = False
            try:
                self.lcd_set_text('StudySpot', 'Offline')
                sleep(1)
                self.lcd_set_rgb(0, 0, 0)
                self.lcd_set_text('', '')
            except:
                pass
            self.client.loop_stop()
            self.client.disconnect()
            print("Terminated.")
            _exit(0)
        
