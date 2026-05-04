from picamera import PiCamera
from time import sleep

class Camera():
    
    def __init__(self, res_x=3280, res_y=2464, save_p='', filename='image.jpg'):
        self.camera = PiCamera(resolution=(res_x,res_y))
        self.save_path = save_p + filename
        
    def test_cap(self):
        self.camera.start_preview()
        sleep(3)
        self.camera.capture(self.save_path)
        self.camera.stop_preview()
        return self.save_path

    def std_cap(self):
        self.camera.capture(self.save_path)
        return self.save_path
