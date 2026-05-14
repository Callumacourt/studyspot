import { TbPoint, TbTelemetry } from "./thingsboard";

export const generateMockTelemetry = (keys: readonly string[]): TbTelemetry => {
  const mockData: TbTelemetry = {};
  const now = Date.now();

  keys.forEach((key) => {
    let val = "0";
    const k = key.toUpperCase(); 

    if (k.includes("TEMP")) {
      val = (19 + Math.random() * 5).toFixed(1);
    } else if (k.includes("HUMIDITY")) {
      val = (40 + Math.random() * 15).toFixed(1);
    } else if (k.includes("NOISE")) {
      val = (30 + Math.random() * 50).toFixed(0);
    } else if (k.includes("OCCUPANCY")) {
      val = (Math.random() * 100).toFixed(0);
    } else if (k.includes("LIGHT")) {
      const hour = new Date().getHours();
      val = (hour >= 8 && hour <= 18) 
        ? (600 + Math.random() * 400).toFixed(0) 
        : (20 + Math.random() * 80).toFixed(0);
    }

    mockData[key] = [{ ts: now, value: val }];
  });

  return mockData;
};