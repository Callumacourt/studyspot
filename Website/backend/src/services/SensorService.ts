import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg"; 


const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

export const SensorService = {

    // Get an individual sensors data
    async getSensorData(sensorId : number) {
        
    },

    // Get all sensor data from a room
    async getSensorDataByRoom (roomId : number) { 
        // Fetch all sensor IDS belonging to the roomID
        const sensors = await prisma.sensor.findMany({
            where: { roomId: roomId },
        });

        // Query thingsboard for all of their data

    }
};


