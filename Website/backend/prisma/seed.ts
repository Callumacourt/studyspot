import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, MetricType } from "../src/generated/prisma/client";

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

// Realistic busy pattern per hour (0-23), values = avg people
const HOURLY_PATTERN = [
  0, 0, 0, 0, 0, 0,   // 0-5am  empty
  0, 2, 5, 12, 18, 22, // 6-11am building up
  25, 28, 24, 20, 18, 15, // 12-5pm busy
  10, 6, 3, 1, 0, 0,  // 6-11pm dying down
];

const REAL_ROOM_NAME = "Real Room";
const REAL_ROOM_DEVICE_ID = process.env.REAL_ROOM_DEVICE_ID;

// writes occupancy readings for each hour across 2 weeks to every fake room
// these are then used to calculate average occupancy for the dashboard
async function seedMockOccupancyReadings(rooms: { id: number; name: string }[]) {
  const DAYS = 14;
  const now = Date.now();

  for (const room of rooms) {
    // wipe old mock occupancy so re-seeding is safe
    await prisma.sensorReading.deleteMany({
      where: { roomId: room.id, metricType: MetricType.OCCUPANCY },
    });

    const entries = [];

    for (let day = 0; day < DAYS; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const base = HOURLY_PATTERN[hour];
        const jitter = Math.floor(Math.random() * 5) - 2; // ±2 natural variation
        const value = Math.max(0, base + jitter);

        const time = new Date(now - day * 86_400_000);
        time.setUTCHours(hour, 0, 0, 0);

        entries.push({
          roomId: room.id,
          metricType: MetricType.OCCUPANCY,
          value,
          time,
        });
      }
    }

    await prisma.sensorReading.createMany({ data: entries });
    console.log(`[seed] ${entries.length} occupancy readings → ${room.name}`);
  }
}

// Some initial data to test the database with
async function main() {
  const uni = await prisma.university.upsert({
    where: { name: "Cardiff University" },
    update: {},
    create: { name: "Cardiff University" },
  });

  const building = await prisma.building.upsert({
    where: { universityId_name: { universityId: uni.id, name: "Abacws" } },
    update: {},
    create: { name: "Abacws", universityId: uni.id },
  });

  const createdRooms = [];

  const rand = (min: number, max: number) =>
    Number((Math.random() * (max - min) + min).toFixed(1));
  const now = Date.now();

  for (let i = 0; i < ROOM_NAMES.length; i++) {
    const temp = rand(16, 28);       // °C
    const humidity = rand(30, 75);   // %
    const noise = rand(35, 85);      // dB
    const occupancy = rand(5, 95);   // %

    const room = await prisma.room.upsert({
      where: {
        buildingId_name: {
          buildingId: building.id,
          name: ROOM_NAMES[i],
        },
      },
      update: {
        readings: {
          deleteMany: {},
          create: [
            { metricType: MetricType.TEMP, value: temp, time: new Date(now - i * 60_000) },
            { metricType: MetricType.HUMIDITY, value: humidity, time: new Date(now - i * 60_000 - 1_000) },
            { metricType: MetricType.NOISE, value: noise, time: new Date(now - i * 60_000 - 2_000) },
            { metricType: MetricType.OCCUPANCY, value: occupancy, time: new Date(now - i * 60_000 - 3_000) },
          ],
        },
      },
      create: {
        name: ROOM_NAMES[i],
        buildingId: building.id,

        sensors: {
          create: {
            name: `${ROOM_NAMES[i].toLowerCase().replace(/\s+/g, "-")}-main`,
            deviceId: `TB_DEVICE_UUID_${i + 1}`,
          },
        },

        // seed latest readings with variation across rooms
        readings: {
          create: [
            { metricType: MetricType.TEMP, value: temp, time: new Date(now - i * 60_000) },
            { metricType: MetricType.HUMIDITY, value: humidity, time: new Date(now - i * 60_000 - 1_000) },
            { metricType: MetricType.NOISE, value: noise, time: new Date(now - i * 60_000 - 2_000) },
            { metricType: MetricType.OCCUPANCY, value: occupancy, time: new Date(now - i * 60_000 - 3_000) },
          ],
        },
      },
    });

    createdRooms.push(room);
  }

  const realRoom = await prisma.room.upsert({
    where: {
      buildingId_name: {
        buildingId: building.id,
        name: REAL_ROOM_NAME,
      },
    },
    update: {},
    create: {
      name: REAL_ROOM_NAME,
      buildingId: building.id,
    },
  });

  if (REAL_ROOM_DEVICE_ID) {
    await prisma.sensor.deleteMany({
      where: { roomId: realRoom.id },
    });

    await prisma.sensor.create({
      data: {
        roomId: realRoom.id,
        name: "real-room-main",
        deviceId: REAL_ROOM_DEVICE_ID,
      },
    });

    console.log(`[seed] Linked "${REAL_ROOM_NAME}" to device ${REAL_ROOM_DEVICE_ID}`);
  } else {
    console.warn(`[seed] Created "${REAL_ROOM_NAME}" with no linked ThingsBoard device`);
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

  await seedMockOccupancyReadings([...createdRooms, realRoom]);
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