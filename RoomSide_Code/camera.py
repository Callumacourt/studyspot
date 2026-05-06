from picamera import PiCamera
from time import sleep

class Camera():
    """Simple Camera class to capture and save photos using the PiCamera
    module with some test functionality
    
    Parameters
    ----------
    res_x : int
        x component of the desired output resolution
    res_y : int
        y component of the desired output resolution
    save_p : string
        path to the folder that the image should be stored
    filename : string
        desired file name of the image
    """
    
    def __init__(self, res_x=3280, res_y=2464, save_p='', filename='image.jpg'):
        # create a pi camera object that outputs images at a given resolution
        self.camera = PiCamera(resolution=(res_x,res_y))
        self.save_path = save_p + filename
        
    def test_cap(self):
        """Takes a snapshot with a 3 second preview
        window for test purposes
        
        Returns
        -------
        string
            full path to the saved image
        """
        self.camera.start_preview()
        sleep(3)
        self.camera.capture(self.save_path)
        self.camera.stop_preview()
        return self.save_path

    def std_cap(self):
        """Takes a snapshot
        
        Returns
        -------
        string
            full path to the saved image
        """
        self.camera.capture(self.save_path)
        return self.save_path
