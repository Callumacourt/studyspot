import grovepi

loudness_sensor = 2

print("Testing sound sensor")
sensor_value = grovepi.analogRead(loudness_sensor)
print(f"Sensor Value = {sensor_value}")
