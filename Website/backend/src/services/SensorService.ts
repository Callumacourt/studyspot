import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg"; 


// Connect to our database
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});


/**
 * Responsible for querying thingsboard for our sensor data
 */
export const SensorService = {

    /**
     * Fetches data for a single sensor from ThingsBoard. (TODO)
     * @param sensorId - The ID of the sensor to query.
     */
    async getSensorData(sensorId : number) {
        
    },

    /**
     * Fetches data for all sensors in a room. (TODO)
     * @param roomId - ID of the room to query
     */
    async getSensorDataByRoom (roomId : number) { 
        // Fetch all sensor IDS belonging to the roomID
        const sensors = await prisma.sensor.findMany({
            where: { roomId: roomId },
        });

        // Call getSensorData for each of these and return
    }
};


