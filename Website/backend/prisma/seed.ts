import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, MetricType } from "../src/generated/prisma/client";

// Seeding script — populates the DB with mock data for development/demo purposes.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ── Constants ─────────────────────────────────────────────────────────────────

const REAL_ROOM_NAME      = "Real Room";
const REAL_ROOM_DEVICE_ID = process.env.REAL_ROOM_DEVICE_ID;

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

// Per-hour average occupancy baseline (0–23). Used for realistic 2-week history.
const HOURLY_PATTERN = [
  0,  0,  0,  0,  0,  0,        //  0– 5 am  — empty
  0,  2,  5, 12, 18, 22,        //  6–11 am  — building up
  25, 28, 24, 20, 18, 15,       // 12– 5 pm  — busy
  10,  6,  3,  1,  0,  0,       //  6–11 pm  — dying down
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const rand = (min: number, max: number) =>
  Number((Math.random() * (max - min) + min).toFixed(1));

// Returns standard 08:00–22:00 open/close Date objects for a given timestamp
function makeOpenClose(now: number) {
  const openHour = new Date(now);
  openHour.setUTCHours(8, 0, 0, 0);
  const closeHour = new Date(now);
  closeHour.setUTCHours(22, 0, 0, 0);
  return { openHour, closeHour };
}

// Generates one reading per metric type staggered slightly to avoid duplicate timestamps
function makeReadings(i: number, now: number) {
  const hour = new Date(now).getHours();
  const syntheticLight = hour >= 8 && hour <= 18 ? rand(1800, 4200) : rand(150, 900);
  const base = now - i * 60_000;

  return [
    { metricType: MetricType.TEMP,      value: rand(16, 28),       time: new Date(base) },
    { metricType: MetricType.HUMIDITY,  value: rand(30, 75),       time: new Date(base - 1_000) },
    { metricType: MetricType.NOISE,     value: rand(35, 85),       time: new Date(base - 2_000) },
    { metricType: MetricType.OCCUPANCY, value: rand(5, 95),        time: new Date(base - 3_000) },
    { metricType: MetricType.LIGHT,     value: syntheticLight,     time: new Date(base - 4_000) },
  ];
}

// Deterministic accessibility flags based on room index for reproducible variety
function makeAccessibility(i: number) {
  return {
    wheelchairAccessible: i % 3 === 0,
    hasAdjustableDesks:   i % 4 === 0,
    groundFloor:          i % 5 === 0,
    hearingAssistance:    i % 6 === 0,
  };
}

// ── Seeders ───────────────────────────────────────────────────────────────────

// Upserts a building and all its rooms. Returns buildingId and room stubs.
async function seedBuilding(
  universityId: number,
  building: (typeof BUILDINGS)[number],
  now: number,
) {
  const { id: buildingId } = await prisma.building.upsert({
    where:  { universityId_name: { universityId, name: building.name } },
    update: {},
    create: { name: building.name, universityId },
  });

  const { openHour, closeHour } = makeOpenClose(now);

  const rooms = await Promise.all(
    building.rooms.map(async (roomName, i) => {
      const room = await prisma.room.upsert({
        where:  { buildingId_name: { buildingId, name: roomName } },
        update: {
          readings: { deleteMany: {}, create: makeReadings(i, now) },
          ...makeAccessibility(i),
          bookable:  Math.random() < 0.3,
          openHour,
          closeHour,
        },
        create: {
          name: roomName,
          buildingId,
          sensors:  { create: { name: `${roomName.toLowerCase().replace(/\s+/g, "-")}-main`, deviceId: `TB_DEVICE_${building.devicePrefix}_${i + 1}` } },
          readings: { create: makeReadings(i, now) },
          ...makeAccessibility(i),
          bookable:  Math.random() < 0.3,
          openHour,
          closeHour,
        },
      });
      console.log(`[seed] Room: ${room.name} (${building.name})`);
      return { id: room.id, name: room.name };
    })
  );

  return { buildingId, rooms };
}

// Seeds 2 weeks of hourly occupancy readings for the given rooms
async function seedOccupancyHistory(rooms: { id: number; name: string }[]) {
  const now = Date.now();

  for (const room of rooms) {
    await prisma.sensorReading.deleteMany({
      where: { roomId: room.id, metricType: MetricType.OCCUPANCY },
    });

    const entries = Array.from({ length: 14 * 24 }, (_, n) => {
      const day  = Math.floor(n / 24);
      const hour = n % 24;
      const time = new Date(now - day * 86_400_000);
      time.setUTCHours(hour, 0, 0, 0);
      const value = Math.max(0, HOURLY_PATTERN[hour] + Math.floor(Math.random() * 5) - 2);
      return { roomId: room.id, metricType: MetricType.OCCUPANCY, value, time };
    });

    await prisma.sensorReading.createMany({ data: entries });
    console.log(`[seed] ${entries.length} occupancy readings → ${room.name}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const now = Date.now();

  const uni = await prisma.university.upsert({
    where:  { name: "Cardiff University" },
    update: {},
    create: { name: "Cardiff University" },
  });

  // Seed all buildings
  const allFakeRooms: { id: number; name: string }[] = [];
  let abacwsBuildingId: number | null = null;

  for (const building of BUILDINGS) {
    const { buildingId, rooms } = await seedBuilding(uni.id, building, now);
    allFakeRooms.push(...rooms);
    if (building.name === "Abacws") abacwsBuildingId = buildingId;
  }

  if (!abacwsBuildingId) throw new Error("Abacws building not seeded");

  // Real (ThingsBoard-linked) room — always bookable, lives in Abacws
  const { openHour, closeHour } = makeOpenClose(now);
  const realRoom = await prisma.room.upsert({
    where:  { buildingId_name: { buildingId: abacwsBuildingId, name: REAL_ROOM_NAME } },
    update: { bookable: true, openHour, closeHour },
    create: { name: REAL_ROOM_NAME, buildingId: abacwsBuildingId, bookable: true, openHour, closeHour },
  });

  if (REAL_ROOM_DEVICE_ID) {
    await prisma.sensor.deleteMany({ where: { roomId: realRoom.id } });
    await prisma.sensor.create({
      data: { roomId: realRoom.id, name: "real-room-main", deviceId: REAL_ROOM_DEVICE_ID },
    });
    console.log(`[seed] Linked "${REAL_ROOM_NAME}" → device ${REAL_ROOM_DEVICE_ID}`);
  } else {
    console.warn(`[seed] "${REAL_ROOM_NAME}" created with no linked ThingsBoard device`);
  }

  // Test user — favourites the first 3 fake rooms
  const hashedPassword = await bcrypt.hash("password", 10);
  await prisma.user.upsert({
    where:  { email: "testuser@gmail.com" },
    update: {},
    create: {
      email: "testuser@cardiff.ac.uk",
      password: hashedPassword,
      favouritedRooms: { connect: allFakeRooms.slice(0, 3).map((r) => ({ id: r.id })) },
    },
  });

  await seedOccupancyHistory([...allFakeRooms, { id: realRoom.id, name: realRoom.name }]);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

