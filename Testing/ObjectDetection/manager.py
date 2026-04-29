from camera import Camera
from obj_detector import ObjectDetector
from time import sleep

picamera = Camera(res_x=300,res_y=300, save_p='images/')
person_detector = ObjectDetector(conf_thres=0.5)

cycles = 3
iterator = 0
while iterator < cycles:
    image_p = picamera.test_cap()
    
    people = person_detector.detect_object(image_p=image_p, obj_class=0)
    print(str(people) + " people found in photo")
    sleep(10)