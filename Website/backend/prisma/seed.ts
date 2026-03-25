import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

// Some initial data to test the database with

async function main () {
    const uni = await prisma.university.create({
        data: { name: "Cardiff University"}
    })

    const building = await prisma.building.create({
        data: { name: "Abacws", universityId: uni.id }
    });

    const room = await prisma.room.create({
        data: { roomName: "3.02", buildingId: building.id }
    })

    await prisma.sensor.create({
    data: { sensorId: 101, roomId: room.id }
  });

    await prisma.user.create({
        data: { email: "testuser@gmai.com", password: "password", favouritedRooms: [room]}
    })
}