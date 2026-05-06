from tflite_runtime.interpreter import Interpreter
import cv2 as cv
import numpy as np

class ObjectDetector:
    """Class that handles object detection with a tflite
    model and a given image
    
    Parameters
    ----------
    model_p : string
        the path to the tflite model to parse
    conf_thres : float
        the confidence that the model should have
        in an object to count it
    """
    
    def __init__(self, model_p='detect.tflite', conf_thres=0.5):
        self.interpreter = Interpreter(model_path=model_p)
        self.conf_thres = conf_thres
        self.curr_image = None
        
        # necessary information from the model
        self.in_details = self.interpreter.get_input_details()
        self.out_details = self.interpreter.get_output_details()
        self.out_classes = []
        self.out_confidence = []
        
        # sets up the interpreter from the model file
        self.interpreter.allocate_tensors()
        
    def _process_image(self, image_p):
        """Read in a given image and resize it in order to
        fit the tensors input and stores it to the object
        
        Parameters
        ----------
        image_p : string
            the path to the image to be processed
        """
        # read in image as numpy array
        image = cv.imread(image_p)
        # resize for model
        image_size = (self.in_details[0]['shape'][1], self.in_details[0]['shape'][2])
        image = cv.resize(image, image_size)
        # convert to rgb color space for model
        image = cv.cvtColor(image, cv.COLOR_BGR2RGB)
        
        self.curr_image = image
        
    def _run_model(self):
        """Runs the currently stored image through the model
        and stores the relevant results
        """
        if not self.curr_image.any():
            return
        # add an extra axis to fit the model input
        input_data = np.expand_dims(self.curr_image, axis=0)
        # give the data to the model
        self.interpreter.set_tensor(self.in_details[0]['index'], input_data)
        # run the model
        self.interpreter.invoke()
        
        # extract the relevant information
        self.out_classes = self.interpreter.get_tensor(self.out_details[1]['index'])[0]
        self.out_confidence = self.interpreter.get_tensor(self.out_details[2]['index'])[0]
        
    def _detect_class(self, obj_class):
        """Counts the number of a given class in the output
        data that passes the confidence threshold
        
        Parameters
        ----------
        obj_class : int
            The class that we are looking for in the output data
            e.g. person is 0
        
        Returns
        -------
        int
            number of given class detected in the image
        """
        count = 0
        for index, confidence in enumerate(self.out_confidence):
            if (confidence > self.conf_thres) and (int(self.out_classes[index]) == obj_class):
                count += 1
        
        return count
    
    def detect_object(self, image_p='image.txt', obj_class=0):
        """Takes in an image and a class to search for and performs all necessary
        procceses
        
        Parameters
        ----------
        image_p : string
            Path of the image to detect from
        obj_class : int
            Class of the object to find
        
        Returns
        -------
        int
            number of given class detected in the image
        """
        self._process_image(image_p)
        self._run_model()
        return self._detect_class(obj_class)
