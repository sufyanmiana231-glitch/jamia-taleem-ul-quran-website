"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Single-series chart — no legend needed (the card title names the series), per dataviz skill's ≥2-series-only rule. */
export function TrendChart({
  data,
  xKey,
  yKey,
  variant = "line",
  valueFormatter,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  variant?: "line" | "bar";
  valueFormatter?: (value: number) => string;
}) {
  return (
    <div dir="ltr" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {variant === "bar" ? (
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "var(--chart-ink-muted)" }} axisLine={{ stroke: "var(--chart-axis)" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--chart-ink-muted)" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)", opacity: 0.5 }}
              contentStyle={{ background: "var(--chart-surface)", border: "1px solid var(--chart-grid)", borderRadius: 8, fontSize: 12 }}
              formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : value)}
            />
            <Bar dataKey={yKey} fill="var(--chart-series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-series-1)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--chart-series-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "var(--chart-ink-muted)" }} axisLine={{ stroke: "var(--chart-axis)" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--chart-ink-muted)" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ background: "var(--chart-surface)", border: "1px solid var(--chart-grid)", borderRadius: 8, fontSize: 12 }}
              formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : value)}
            />
            <Area type="monotone" dataKey={yKey} stroke="var(--chart-series-1)" strokeWidth={2} fill="url(#trendFill)" />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
