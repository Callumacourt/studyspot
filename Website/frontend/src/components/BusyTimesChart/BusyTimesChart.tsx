/**
 * BusyTimesChart
 *
 * Accessibility-first occupancy visualisation component.
 *
 * Inputs:
 * - pre-computed hourly averages,
 * - live occupancy snapshot,
 * - room open/close hours,
 * - room id (to overlay same-day booking constraints).
 *
 * Visual encoding:
 * - blue gradient = relative occupancy intensity,
 * - orange bar = current hour,
 * - red bar = hour already booked today.
 */
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
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
  openHour?: string | null;
  closeHour?: string | null;
  roomId?: string | number | null; // fetch today's bookings
};

type Point = { hour: number; label: string; value: number };

function toRoundedNumber(value: unknown): number {
  if (Array.isArray(value)) return Math.round(Number(value[0] ?? 0));
  return Math.round(Number(value ?? 0));
}

function hourLabel(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12p";
  return `${h - 12}pm`;
}

function colorFor(value: number, max: number): string {
  if (max <= 0) return "#f1f5f9"; // very light (no data)
  const ratio = value / max;
  if (ratio < 0.25) return "#c7e9ff"; // light blue
  if (ratio < 0.5) return "#7fbfff"; // medium-light
  if (ratio < 0.75) return "#2b8bd6"; // medium
  return "#0b5fc1"; // high contrast busy
}

export default function BusyTimesChart({ hourlyAverages, liveOccupancy = null, openHour, closeHour, roomId }: BusyTimesChartProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Fetch today's bookings to mark unavailable slots
  const [bookedHours, setBookedHours] = useState<Set<number>>(new Set());
  const todayStr = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    axios.get(`/api/rooms/${roomId}/bookings?date=${todayStr}`)
      .then((res) => {
        if (cancelled) return;
        const bookings: { startTime: string; endTime: string }[] = res.data?.bookings ?? [];
        const hours = new Set<number>();
        for (const b of bookings) {
          const start = new Date(b.startTime).getUTCHours();
          const end   = new Date(b.endTime).getUTCHours();
          for (let h = start; h < end; h++) hours.add(h);
        }
        setBookedHours(hours);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [roomId, todayStr]);
  const values = Array.isArray(hourlyAverages) ? hourlyAverages : [];
  const full = Array.from({ length: 24 }, (_, h) => Number(values[h] ?? 0));

  // Restrict to opening hours when provided
  const openH  = openHour  ? new Date(openHour).getUTCHours()  : 0;
  const closeH = closeHour ? new Date(closeHour).getUTCHours() : 24;

  const max = Math.max(...full.slice(openH, closeH), 0);
  const currentHour = new Date().getHours();

  const data: Point[] = full
    .map((value, hour) => ({ hour, label: hourLabel(hour), value }))
    .filter(({ hour }) => hour >= openH && hour < closeH);

  const liveText =
    typeof liveOccupancy === "number"
      ? `Live: ${Math.max(0, Math.round(liveOccupancy))} people`
      : "Live: -- people";

  // accessibility: describe chart contents for screen readers
  const busiest = data.reduce(
    (acc, p) => (p.value > acc.value ? p : acc),
    { hour: 0, label: hourLabel(0), value: 0 } as Point
  );
  const ariaLabel = `Busy times chart. Busiest hour ${busiest.label} with ${Math.round(
    busiest.value
  )} people on average. ${liveText}.`;

  return (
    <div
      className={styles.container}
      role="img"
      aria-label={ariaLabel}
      tabIndex={0}
      aria-describedby="busyTimesDescription"
    >
      <div className={styles.headerRow}>
        <div className={styles.description}>
          Average amount of people per day at each time
        </div>
        <button
          type="button"
          className={styles.infoButton}
          aria-label="How this is calculated"
          aria-expanded={showTooltip}
          aria-controls="busyTimesTooltip"
          onClick={() => setShowTooltip((s) => !s)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          ?
        </button>
        <div
          id="busyTimesTooltip"
          role="tooltip"
          className={`${styles.tooltip} ${showTooltip ? styles.tooltipVisible : ""}`}
        >
          Calculated as the hourly average occupancy from stored sensor readings across recent days.
          Red bars indicate the room is already booked for that hour today.
        </div>
      </div>
      <div className={styles.liveBadge} aria-hidden="true">
        {liveText}
      </div>

      {/* sr-only description for assistive tech updates */}
      <div id="busyTimesDescription" className={styles.srOnly} aria-live="polite">
        {ariaLabel}
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <XAxis
            dataKey="label"
            interval={2}
            tick={{ fontSize: 14 }}
            axisLine={false}
            tickLine={false}
            height={36}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 14 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            formatter={(value: unknown, _name: unknown, props: any) => {
              const hour = props?.payload?.hour;
              if (typeof hour === "number" && bookedHours.has(hour)) {
                return ["Already booked today", ""];
              }
              return [toRoundedNumber(value), "Avg people"];
            }}
            labelFormatter={(l) => `Hour: ${l}`}
            wrapperStyle={{
              background: "rgba(11,95,193,0.95)",
              color: "#fff",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.hour}
                fill={
                  bookedHours.has(d.hour)
                    ? "#ef4444"
                    : d.hour === currentHour
                    ? "#ff8a3d"
                    : colorFor(d.value, max)
                }
                stroke={
                  bookedHours.has(d.hour)
                    ? "#7f1d1d"
                    : d.hour === currentHour
                    ? "#7a2f00"
                    : "#07304a"
                }
                strokeWidth={bookedHours.has(d.hour) || d.hour === currentHour ? 1.5 : 1}
                tabIndex={0}
                role="img"
                aria-label={`${
                  d.label
                }: ${Math.round(d.value)} average people${
                  bookedHours.has(d.hour) ? " — booked today" : ""
                }`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      {bookedHours.size > 0 && (
        <div className={styles.bookedLegend} aria-hidden="true">
          <span className={styles.bookedSwatch} />
          Room booked today
        </div>
      )}
    </div>
  );
}