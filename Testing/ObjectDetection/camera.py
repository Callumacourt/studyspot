"""
Camera Module - Picamera wrapper for Raspberry Pi camera capture.

Provides simplified interface to capture photos from Raspberry Pi camera module.
Used by object-detection and room-manager scripts to take snapshots for
occupancy analysis via TensorFlow Lite model.

Dependencies:
- picamera: Raspberry Pi camera library (requires `python3-picamera` package)

Usage:
    camera = Camera(res_x=300, res_y=300, save_p='images/', filename='photo.jpg')
    path = camera.std_cap()  # Capture and save
"""

from picamera import PiCamera
from time import sleep

class Camera():
    """
    Simple Raspberry Pi camera capture wrapper.
    
    Attributes:
        camera (PiCamera): Initialized camera object.
        save_path (str): Full file path where captures are saved.
    """
    
    def __init__(self, res_x=3280, res_y=2464, save_p='', filename='image.jpg'):
        """
        Initialize camera with specified resolution.
        
        Args:
            res_x (int): Image width in pixels (default 3280 = full PiCamera resolution).
            res_y (int): Image height in pixels (default 2464 = full PiCamera resolution).
            save_p (str): Directory path to save captures (default '').
            filename (str): Filename to save as (default 'image.jpg').
        """
        self.camera = PiCamera(resolution=(res_x,res_y))
        self.save_path = save_p + filename
        
    def test_cap(self):
        """
        Capture photo with preview delay.
        
        Displays live preview for 5 seconds before capturing to allow
        auto-exposure adjustment. Useful for manual testing.
        
        Returns:
            str: Full path to saved image file.
        """
        self.camera.start_preview()
        sleep(5)
        self.camera.capture(self.save_path)
        self.camera.stop_preview()
        return self.save_path

    def std_cap(self):
        """
        Capture photo without preview (standard capture).
        
        Performs immediate capture without preview. Faster than test_cap()
        and suitable for periodic occupancy snapshots in production.
        
        Returns:
            str: Full path to saved image file.
        """
        self.camera.capture(self.save_path)
        return self.save_path
