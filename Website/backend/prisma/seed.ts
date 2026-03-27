import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
    await prisma.sensor.deleteMany();
    await prisma.occupancyAverage.deleteMany();
    await prisma.sensorReading.deleteMany();
    await prisma.room.deleteMany();
    await prisma.building.deleteMany();
    await prisma.university.deleteMany();

    const university = await prisma.university.create({
        data: {
            name: "Cardiff University",
        },
    });

    const buildingRecords = await Promise.all([
        prisma.building.create({
            data: { name: "ASSL", universityId: university.id },
        }),
        prisma.building.create({
            data: { name: "Science Library", universityId: university.id },
        }),
        prisma.building.create({
            data: { name: "Queens Building", universityId: university.id },
        }),
        prisma.building.create({
            data: { name: "Sir Martin Evans", universityId: university.id },
        }),
        prisma.building.create({
            data: { name: "Any Building", universityId: university.id },
        }),
    ]);

    const buildingMap = Object.fromEntries(
        buildingRecords.map((building) => [building.name, building.id])
    );

    const rooms = [
        {
            roomName: "Silent Study Room",
            building: "ASSL",
            location: "Floor 3",
            temperature: 22,
            occupied: 33,
            free: 7,
            occupancyPercent: 38,
            noise: "Silent",
            humidity: 41,
            accessibility: [
                "Lift access",
                "Toilet nearby",
                "Close to refreshments",
                "Wheelchair accessible",
                "Adjustable Desks",
            ],
        },
        {
            roomName: "Group Study Room",
            building: "ASSL",
            location: "G.01",
            temperature: 18,
            occupied: 15,
            free: 12,
            occupancyPercent: 28,
            noise: "Quiet",
            humidity: 46,
            accessibility: [
                "Adjustable Desks",
                "Lift access",
                "Wheelchair accessible",
            ],
        },
        {
            roomName: "Room 1.45",
            building: "Science Library",
            location: "1.45",
            temperature: 21,
            occupied: 10,
            free: 4,
            occupancyPercent: 61,
            noise: "Noisy",
            humidity: 49,
            accessibility: ["Close to refreshments"],
        },
        {
            roomName: "Room 0.15",
            building: "Queens Building",
            location: "0.15",
            temperature: 23,
            occupied: 52,
            free: 3,
            occupancyPercent: 84,
            noise: "Quiet",
            humidity: 55,
            accessibility: [
                "Lift access",
                "Toilet nearby",
                "Close to refreshments",
            ],
        },
        {
            roomName: "Room 1.32",
            building: "Sir Martin Evans",
            location: "1.32",
            temperature: 15,
            occupied: 11,
            free: 8,
            occupancyPercent: 24,
            noise: "Silent",
            humidity: 44,
            accessibility: [
                "Adjustable Desks",
                "Lift access",
                "Toilet nearby",
                "Wheelchair accessible",
            ],
        },
        {
            roomName: "Focus Booth",
            building: "Any Building",
            location: "West Wing",
            temperature: 20,
            occupied: 8,
            free: 6,
            occupancyPercent: 33,
            noise: "Quiet",
            humidity: 35,
            accessibility: ["Adjustable Desks"],
        },
    ];

    for (const room of rooms) {
        await prisma.room.create({
            data: {
                roomName: room.roomName,
                buildingId: buildingMap[room.building],
                location: room.location,
                temperature: room.temperature,
                occupied: room.occupied,
                free: room.free,
                occupancyPercent: room.occupancyPercent,
                noise: room.noise,
                humidity: room.humidity,
                accessibility: room.accessibility,
            },
        });
    }

    console.log("Seed completed successfully."); // test
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
