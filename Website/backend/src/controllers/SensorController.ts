const SensorService = require("../services/SensorService")
import { Request, Response, NextFunction } from 'express';

// This just handles the thingsboard sensor data API call
// Data here is then passed to middleware/thingsboardParser

export const SensorController = {

    async getSensorData(roomId: number, req: Request, res: Response) {
        try {
            // Validate roomID presence and correct format
            if (!roomId) {
                return res.status(400).json({success: false, error: "No roomID recieved"})
            }

            if (!Number.isInteger(roomId)) {
                return res.status(400).json({success: false, error: "Invalid roomID - must be an Integer"})
            }
            
            // fetch sensor data for that roomID
            const readings = await SensorService.getSensorData(roomId);

            res.status(200).json({ success: true, data: readings});

        } catch (error) {
            console.log(error)
            res.status(500).json({ success: false, error: 'Internal Server Error,'})
        }
    }

};

