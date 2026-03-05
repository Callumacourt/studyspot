import grovepi

light_sensor = 0

print("Testing light sensor")
value = grovepi.analogRead(light_sensor)
print(f"Light Value = {value}")
# 0 would be dark, 1023 would be bright