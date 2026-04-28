import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, MetricType } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ── Building / room definitions ───────────────────────────────────────────────
// Add new buildings here — seedBuilding() handles the rest automatically.
const BUILDINGS: { name: string; devicePrefix: string; rooms: string[] }[] = [
  {
    name: "Abacws",
    devicePrefix: "ABACWS",
    rooms: [
      "Abacws 1.01", "Abacws 1.12",
      "Abacws 2.03", "Abacws 2.15",
      "Abacws 3.02", "Abacws 3.09",
      "Abacws 4.01", "Abacws 4.18",
    ],
  },
  {
    name: "Bute Building",
    devicePrefix: "BUTE",
    rooms: [
      "Bute 1.01", "Bute 1.02",
      "Bute 2.01", "Bute 2.02",
      "Bute 3.01", "Bute 3.02",
    ],
  },
  {
    name: "Queen's Buildings",
    devicePrefix: "QUEENS",
    rooms: [
      "Queens S.01", "Queens S.02",
      "Queens 1.01", "Queens 1.03", "Queens 1.07",
      "Queens 2.01", "Queens 2.04",
      "Queens 3.02",
    ],
  },
  {
    name: "Redwood Building",
    devicePrefix: "REDWOOD",
    rooms: [
      "Redwood G.01", "Redwood G.02",
      "Redwood 1.01", "Redwood 1.02", "Redwood 1.03",
      "Redwood 2.01", "Redwood 2.02",
    ],
  },
];

// The single real (ThingsBoard-linked) room lives in Abacws
const REAL_ROOM_NAME = "Real Room";
const REAL_ROOM_DEVICE_ID = process.env.REAL_ROOM_DEVICE_ID;

// ── Occupancy pattern ─────────────────────────────────────────────────────────
// Per-hour average occupancy (0-23). Used to seed 2 weeks of realistic history.
const HOURLY_PATTERN = [
  0, 0, 0, 0, 0, 0,        //  0– 5 am  — empty
  0, 2, 5, 12, 18, 22,     //  6–11 am  — building up
  25, 28, 24, 20, 18, 15,  // 12– 5 pm  — busy
  10, 6, 3, 1, 0, 0,       //  6–11 pm  — dying down
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const rand = (min: number, max: number) =>
  Number((Math.random() * (max - min) + min).toFixed(1));

function makeReadings(i: number, now: number) {
  return [
    { metricType: MetricType.TEMP,      value: rand(16, 28), time: new Date(now - i * 60_000) },
    { metricType: MetricType.HUMIDITY,  value: rand(30, 75), time: new Date(now - i * 60_000 - 1_000) },
    { metricType: MetricType.NOISE,     value: rand(35, 85), time: new Date(now - i * 60_000 - 2_000) },
    { metricType: MetricType.OCCUPANCY, value: rand(5, 95),  time: new Date(now - i * 60_000 - 3_000) },
  ];
}

function makeAccessibility(i: number) {
  return {
    wheelchairAccessible: i % 3 === 0,
    hasAdjustableDesks:   i % 4 === 0,
    groundFloor:          i % 5 === 0,
    hearingAssistance:    i % 6 === 0,
  };
}

// Writes 2 weeks of hourly occupancy readings for each room (overwrites old data)
async function seedMockOccupancyReadings(rooms: { id: number; name: string }[]) {
  const DAYS = 14;
  const now = Date.now();

  for (const room of rooms) {
    await prisma.sensorReading.deleteMany({
      where: { roomId: room.id, metricType: MetricType.OCCUPANCY },
    });

    const entries = [];
    for (let day = 0; day < DAYS; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const base = HOURLY_PATTERN[hour];
        const jitter = Math.floor(Math.random() * 5) - 2;
        const value = Math.max(0, base + jitter);
        const time = new Date(now - day * 86_400_000);
        time.setUTCHours(hour, 0, 0, 0);
        entries.push({ roomId: room.id, metricType: MetricType.OCCUPANCY, value, time });
      }
    }

    await prisma.sensorReading.createMany({ data: entries });
    console.log(`[seed] ${entries.length} occupancy readings → ${room.name}`);
  }
}

// Upserts a building and all its rooms; returns the created/updated room records
async function seedBuilding(
  universityId: number,
  building: (typeof BUILDINGS)[number],
  now: number,
) {
  const buildingRecord = await prisma.building.upsert({
    where: { universityId_name: { universityId, name: building.name } },
    update: {},
    create: { name: building.name, universityId },
  });

  const rooms = [];

  for (let i = 0; i < building.rooms.length; i++) {
    const roomName   = building.rooms[i];
    const readings   = makeReadings(i, now);
    const access     = makeAccessibility(i);
    const sensorId   = `TB_DEVICE_${building.devicePrefix}_${i + 1}`;
    const sensorName = `${roomName.toLowerCase().replace(/\s+/g, "-")}-main`;

    const room = await prisma.room.upsert({
      where: { buildingId_name: { buildingId: buildingRecord.id, name: roomName } },
      update: {
        readings: { deleteMany: {}, create: readings },
        ...access,
      },
      create: {
        name: roomName,
        buildingId: buildingRecord.id,
        sensors: { create: { name: sensorName, deviceId: sensorId } },
        readings: { create: readings },
        ...access,
      },
    });

    rooms.push(room);
    console.log(`[seed] Upserted room: ${room.name} (${building.name})`);
  }

  return rooms;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const now = Date.now();

  const uni = await prisma.university.upsert({
    where: { name: "Cardiff University" },
    update: {},
    create: { name: "Cardiff University" },
  });

  // Seed all buildings in one loop — just add entries to BUILDINGS above to extend
  const allFakeRooms: { id: number; name: string }[] = [];
  for (const building of BUILDINGS) {
    const rooms = await seedBuilding(uni.id, building, now);
    allFakeRooms.push(...rooms);
  }

  // Real (ThingsBoard-linked) room — always lives in Abacws
  const abacwsBuilding = await prisma.building.findFirstOrThrow({
    where: { universityId: uni.id, name: "Abacws" },
  });

  const realRoom = await prisma.room.upsert({
    where: { buildingId_name: { buildingId: abacwsBuilding.id, name: REAL_ROOM_NAME } },
    update: {},
    create: { name: REAL_ROOM_NAME, buildingId: abacwsBuilding.id },
  });

  if (REAL_ROOM_DEVICE_ID) {
    await prisma.sensor.deleteMany({ where: { roomId: realRoom.id } });
    await prisma.sensor.create({
      data: { roomId: realRoom.id, name: "real-room-main", deviceId: REAL_ROOM_DEVICE_ID },
    });
    console.log(`[seed] Linked "${REAL_ROOM_NAME}" to device ${REAL_ROOM_DEVICE_ID}`);
  } else {
    console.warn(`[seed] Created "${REAL_ROOM_NAME}" with no linked ThingsBoard device`);
  }

  // Test user — favourites the first 3 fake rooms
  const hashedPassword = await bcrypt.hash("password", 10);
  await prisma.user.upsert({
    where: { email: "testuser@gmail.com" },
    update: {},
    create: {
      email: "testuser@gmail.com",
      password: hashedPassword,
      favouritedRooms: {
        connect: allFakeRooms.slice(0, 3).map((r) => ({ id: r.id })),
      },
    },
  });

  // Historical occupancy for all fake rooms + real room
  await seedMockOccupancyReadings([...allFakeRooms, realRoom]);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

