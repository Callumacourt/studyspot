import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ROOM_NAMES = [
    "Abacws 1.01",
    "Abacws 1.12",
    "Abacws 2.03",
    "Abacws 2.15",
    "Abacws 3.02",
    "Abacws 3.09",
    "Abacws 4.01",
    "Abacws 4.18",
];

// Some initial data to test the database with

async function main() {
    const uni = await prisma.university.create({
        data: { name: "Cardiff University" },
    });

    const building = await prisma.building.create({
        data: { name: "Abacws", universityId: uni.id },
    });

    const createdRooms = [];

    for (let i = 0; i < ROOM_NAMES.length; i++) {
        const room = await prisma.room.create({
            data: {
                name: ROOM_NAMES[i],
                buildingId: building.id,
                sensors: {
                    create: {
                        name: `${ROOM_NAMES[i].toLowerCase().replace(/\s+/g, "-")}-main`,
                        // Replace with REAL ThingsBoard device UUID later
                        thingsboardDeviceId: `TB_DEVICE_UUID_${i + 1}`,
                    },
                },
            },
        });

        createdRooms.push(room);
    }

    const hashedPassword = await bcrypt.hash("password", 10);

    await prisma.user.upsert({
        where: { email: "testuser@gmail.com" },
        update: {},
        create: {
            email: "testuser@gmail.com",
            password: hashedPassword,
            favouritedRooms: {
                connect: createdRooms.slice(0, 3).map((r) => ({ id: r.id })),
            },
        },
    });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });