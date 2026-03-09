import time
import grovepi
import grove_rgb_lcd

#pin config
buzzer = 8 #D8
ultrasonic = 3 #D3
dht = 4 #D4
pir = 5 #D5
light = 0 #A0
sound = 2 #A2
dht_type = 0 

#setup
grovepi.set_bus("RPI_1")
grovepi.pinMode(buzzer,"OUTPUT")

results = {}

#buzzer
print("\n[1/6] Testing buzzer")
try:
    grovepi.digitalWrite(buzzer, 1)
    time.sleep(1)
    grovepi.digitalWrite(buzzer, 0)
    results['buzzer'] = "OK"
    print("Buzzer OK")
except Exception as e:
    results['buzzer'] = "FAIL"
    print(f"Buzzer FAIL: {e}")

#ultrasonic
print("\n[2/6] Testing ultrasonic sensor")
try:
    distance = grovepi.ultrasonicRead(ultrasonic)
    results['ultrasonic'] = "OK"
    print(f"Ultrasonic OK: Distance = {distance} cm")
except Exception as e:
    results['ultrasonic'] = "FAIL"
    print(f"Ultrasonic FAIL: {e}")

#dht
print("\n[3/6] Testing DHT sensor")
try:
    [temp, humidity] = grovepi.dht(dht, dht_type)
    results['dht'] = "OK"
    print(f"DHT OK: Temp = {temp}°C, Humidity = {humidity}%")
except Exception as e:
    results['dht'] = "FAIL"
    print(f"DHT FAIL: {e}")

#pir
print("\n[4/6] Testing PIR sensor")
try:
    motion = grovepi.digitalRead(pir)
    results['pir'] = "OK"
    print(f"PIR OK: Motion Detected = {bool(motion)}") 
except Exception as e:
    results['pir'] = "FAIL"
    print(f"PIR FAIL: {e}")

#light
print("\n[5/6] Testing light sensor")
try:
    light_value = grovepi.analogRead(light)
    results['light'] = "OK"
    print(f"Light OK: Sensor Value = {light_value}")
except Exception as e:
    results['light'] = "FAIL"
    print(f"Light FAIL: {e}")

#sound
print("\n[6/6] Testing sound sensor")
try:
    sound_value = grovepi.analogRead(sound)
    results['sound'] = "OK"
    print(f"Sound OK: Sensor Value = {sound_value}")
except Exception as e:
    results['sound'] = "FAIL"
    print(f"Sound FAIL: {e}")

#lcd summary
print("\n[LCD] Displaying summary on LCD")
try:
    passed = sum(1 for v in results.values() if v == "OK")
    total = len(results)
    grove_rgb_lcd.setRGB(0, 200, 0) if passed == total else grove_rgb_lcd.setRGB(200, 50, 0)
    grove_rgb_lcd.setText(f"Tests: {passed}/{total} OK")
    print(f"LCD OK: {passed}/{total} passed")
except Exception as e:
    print(f"LCD FAIL: {e}")

#summary
print("\n" + "="*40)
print("        SENSOR TEST SUMMARY")
print("="*40)
for sensor, result in results.items():
    status = "OK" if not result.startswith("FAIL") else "FAIL"
    print(f"  {status} {sensor:<12} {result}")
print("="*40)