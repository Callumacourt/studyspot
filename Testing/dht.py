import time
import sys
import os
import math
import json
import grovepi

sensor = 4
blue = 0

print("Testing DHT sensor...")
[temp, humidity] = grovepi.dht(sensor, blue)
print(f"Temperature: {temp}°C, Humidity: {humidity}%")
        