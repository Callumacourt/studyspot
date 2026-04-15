import { useState, useEffect } from "react";

type Timeseries = { ts: number; value: string }[];

type SensorReading = {
    sensorId: number;
    deviceId: string;
    readings: {
        metricKey: string;
        timeseries: Timeseries;
    }[];
};

type Stats = {
    occupancy: string | null;
    temp: string | null;
    humidity: string | null;
    noise: string | null;
};

// Helper to get the latest value from a timeseries array
function latestValue(timeseries: Timeseries): string | null {
    if (!timeseries || timeseries.length === 0) return null;
    return timeseries[0].value; // ThingsBoard returns latest first
}

// Flatten all sensor readings for a room into a single stats object
function parseStats(data: SensorReading[]): Stats {
    const stats: Stats = { occupancy: null, temp: null, humidity: null, noise: null };

    for (const sensor of data) {
        for (const reading of sensor.readings) {
            const val = latestValue(reading.timeseries as Timeseries);
            switch (reading.metricKey) {
                case "temperature": stats.temp = val ? `${val}°C` : null; break;
                case "humidity":    stats.humidity = val ? `${val}%` : null; break;
                case "noise":       stats.noise = val ?? null; break;
                case "occupancy":   stats.occupancy = val ?? null; break;
            }
        }
    }

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
        // Poll every 30 seconds 
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [roomId]);

    return { stats, loading, error };
}