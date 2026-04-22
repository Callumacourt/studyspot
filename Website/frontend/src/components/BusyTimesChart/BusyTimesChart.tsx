import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import styles from "./BusyTimesChart.module.css";

type BusyTimesChartProps = {
  hourlyAverages: number[]; // length 24
  liveOccupancy?: number | null;
};

type Point = { hour: number; label: string; value: number };

function toRoundedNumber(value: unknown): number {
  if (Array.isArray(value)) return Math.round(Number(value[0] ?? 0));
  return Math.round(Number(value ?? 0));
}

function hourLabel(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function colorFor(value: number, max: number): string {
  if (max <= 0) return "#e6f2ff"; // no data - very light blue
  const ratio = value / max;
  if (ratio < 0.25) return "#dbeafe"; // very light
  if (ratio < 0.5) return "#93c5fd"; // light
  if (ratio < 0.75) return "#60a5fa"; // medium
  return "#3b82f6"; // busiest 
}

export default function BusyTimesChart({ hourlyAverages, liveOccupancy = null }: BusyTimesChartProps) {
  const values = Array.isArray(hourlyAverages) ? hourlyAverages : [];
  const full = Array.from({ length: 24 }, (_, h) => Number(values[h] ?? 0));
  const max = Math.max(...full, 0);
  const currentHour = new Date().getHours();

  const data: Point[] = full.map((value, hour) => ({
    hour,
    label: hourLabel(hour),
    value,
  }));

  const liveText =
    typeof liveOccupancy === "number"
      ? `Live: ${Math.max(0, Math.round(liveOccupancy))} people`
      : "Live: -- people";

  return (
    <div className={styles.container}>
      <div className={styles.liveBadge}>{liveText}</div>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <XAxis
            dataKey="label"
            interval={2}
            tick={{ fontSize: 16 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 18 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            formatter={(value: unknown) => [toRoundedNumber(value), "Avg people"]}
            labelFormatter={(l) => `Hour: ${l}`}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.hour}
                fill={d.hour === currentHour ? "#fb923c" : colorFor(d.value, max)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}