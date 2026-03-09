import grovepi

pir_sensor = 5

print("Testing PIR Sensor")
motion = grovepi.digitalRead(pir_sensor)
print(f'Motion Detected:{bool(motion)}')