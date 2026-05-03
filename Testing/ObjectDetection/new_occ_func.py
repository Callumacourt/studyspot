def occupancy_thread(self):
    
    doorState        = 'IDLE'
    firstEventTime   = 0
    lastCrossingTime = 0
    lastUs1          = False
    lastUs2          = False
    ss_interval = int(self.info['occupancy']['snapshot_interval'])
    next_snapshot = time.time() + ss_interval

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

            if (now_ms - lastCrossingTime) >= int(self.info['occupancy']['crossing_cooldown']):

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
                elif doorState == 'US2_FIRED':
                    if us1_rising:
                        self.occupancyCount = max(0, self.occupancyCount - 1)
                        lastCrossingTime = now_ms
                        doorState = 'IDLE'
                        print(f"[DOOR] EXIT  → Occupancy: {self.occupancyCount}")
                        with self.telemetry_lock:
                            self.telemetry['occupancy'] = self.occupancyCount
                if (now_ms - firstEventTime) > int(self.info['occupancy']['direction_timeout']):
                    doorState = 'IDLE'
                    print("Timeout — reset")

            # check occ with camera every 60 seconds
            if(time.time() > next_snapshot):
                
                # check people with camera, if the difference is more than 2
                # take another snapshot, if it is the same then
                # use as occupancy
                next_snapshot = time.time() + ss_interval
                
                alt_occupancy = self.camera_occupancy()
                
                if( (abs (alt_occupancy) - self.occupancyCount) >= 2):
                    
                    alt_occupancy = self.camera_occupancy()
                    
                if( (abs (alt_occupancy) - self.occupancyCount) >= 2):
                    
                    self.occupancyCount = alt_occupancy
        except Exception as e:
            print(f"Occupancy error: {e}")
