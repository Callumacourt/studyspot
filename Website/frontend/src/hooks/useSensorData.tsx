import { useState, useEffect } from "react";

type MetricValue = number | boolean | string | null;
type Timeseries = { ts: number; value: MetricValue }[];

type SensorReading = {
    sensorId: number;
    deviceId: string;
    readings: {
        metricKey: string;
        timeseries: Timeseries;
    }[];
};

type Stats = {
    occupancy: number | null;
    temp: string | null;
    humidity: string | null;
    noise: string | null;
    light: string | null;
};

type LatestByMetric = {
    ts: number;
    value: MetricValue;
};

function asNumber(value: MetricValue): number | null {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
}

function parseStats(data: SensorReading[]): Stats {
    const stats: Stats = { occupancy: null, temp: null, humidity: null, noise: null, light: null };
    const latest: Partial<Record<string, LatestByMetric>> = {};

    for (const sensor of data) {
        for (const reading of sensor.readings) {
            const point = Array.isArray(reading.timeseries)
                ? reading.timeseries
                      .filter((p) => Number.isFinite(p.ts))
                      .sort((a, b) => b.ts - a.ts)[0]
                : undefined;

            if (!point) continue;

            const existing = latest[reading.metricKey];
            if (!existing || point.ts > existing.ts) {
                latest[reading.metricKey] = { ts: point.ts, value: point.value };
            }
        }
    }

    const tempVal = latest.temperature?.value;
    const humidityVal = latest.humidity?.value;
    const noiseVal = asNumber(latest.noise?.value ?? null);
    const occupancyVal = asNumber(latest.occupancy?.value ?? null);
    const lightVal = asNumber(latest.light?.value ?? null);

    stats.temp = tempVal != null ? `${tempVal}°C` : null;
    stats.humidity = humidityVal != null ? `${humidityVal}%` : null;
    stats.noise = noiseVal != null ? `${noiseVal} dB` : null;
    stats.occupancy = occupancyVal;
    stats.light = lightVal != null ? `${lightVal} lux` : null;

    return stats;
}

export function useSensorData(roomId: string | undefined) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!roomId) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/sensordata/${roomId}`);
                const json = await res.json();

                if (!json.success) throw new Error(json.error);

                setStats(parseStats(json.data));
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Poll every 60 seconds
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [roomId]);

    return { stats, loading, error };
}