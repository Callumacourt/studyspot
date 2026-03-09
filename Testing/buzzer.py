import time
import grovepi

buzzer = 8
grovepi.pinMode(buzzer, "OUTPUT")

print("Testing buzzer...")
grovepi.digitalWrite(buzzer, 1)
time.sleep(1)
grovepi.digitalWrite(buzzer, 0)
print("Buzzer OK" if True else "Buzzer FAIL")