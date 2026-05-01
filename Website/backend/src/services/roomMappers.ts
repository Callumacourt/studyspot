import type { RoomMetrics } from "../utils/RoomFilters";

export function extractMetrics(readings: Array<{ metricType: string; value: number }>): RoomMetrics {
  const latest = new Map<string, number>();
  for (const reading of readings) {
    if (!latest.has(reading.metricType)) latest.set(reading.metricType, reading.value);
  }

  return {
    temperature: latest.get("TEMP") ?? null,
    humidity: latest.get("HUMIDITY") ?? null,
    occupancy: latest.get("OCCUPANCY") ?? null,
    noise: latest.get("NOISE") ?? null,
  };
}

export function mapRoomWithMetrics(room: {
  id: number;
  name: string;
  building: unknown;
  readings: Array<{ metricType: string; value: number }>;
  wheelchairAccessible?: boolean;
  hasAdjustableDesks?: boolean;
  groundFloor?: boolean;
  hearingAssistance?: boolean;
  bookable?: boolean;
  openHour?: Date | null;
  closeHour?: Date | null;
  maxBookingDurationMinutes?: number | null;
}) {
  return {
    id: room.id,
    name: room.name,
    building: room.building,
    metrics: extractMetrics(room.readings),
    wheelchairAccessible: room.wheelchairAccessible ?? false,
    hasAdjustableDesks: room.hasAdjustableDesks ?? false,
    groundFloor: room.groundFloor ?? false,
    hearingAssistance: room.hearingAssistance ?? false,
    bookable: room.bookable ?? false,
    openHour: room.openHour ?? null,
    closeHour: room.closeHour ?? null,
    maxBookingDurationMinutes: room.maxBookingDurationMinutes ?? null,
  };
}
