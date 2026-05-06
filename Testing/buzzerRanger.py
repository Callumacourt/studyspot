import time
import sys
import grovepi

buzzer = 8

grovepi.set_bus("RPI_1")
ultrasonic_ranger = 3

print("Testing ultrasonic ranger...")
distance = grovepi.ultrasonicRead(ultrasonic_ranger)
print(f"Distance: {distance} cm")