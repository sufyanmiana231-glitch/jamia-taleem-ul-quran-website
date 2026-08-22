"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/i18n";

const SLOT_COLORS = ["var(--chart-series-1)", "var(--chart-series-2)", "var(--chart-series-6)", "var(--chart-series-7)"];
const OTHER_COLOR = "var(--chart-other)";

export interface CategorySlice {
  name: string;
  amount: number;
}

/**
 * Donut chart, top 4 categories direct-colored + "دیگر" fold for the rest —
 * a pie touches every wedge against every other (--pairs all), and only
 * the first four validated slots clear both CVD floors under that
 * condition (see dataviz skill palette.md). Direct labels ship with it
 * regardless, per the relief rule for the light-mode slots.
 */
export function ExpensesByCategoryChart({ data, otherLabel }: { data: CategorySlice[]; otherLabel: string }) {
  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  const top = sorted.slice(0, 4);
  const rest = sorted.slice(4);
  const restTotal = rest.reduce((s, r) => s + r.amount, 0);
  const slices = restTotal > 0 ? [...top, { name: otherLabel, amount: restTotal }] : top;
  const total = slices.reduce((s, r) => s + r.amount, 0);

  return (
    <div dir="ltr" className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="amount"
            nameKey="name"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
            stroke="var(--chart-surface)"
            strokeWidth={2}
            label={({ name, percent }) => (total > 0 ? `${name} ${Math.round((percent ?? 0) * 100)}%` : name)}
            labelLine={false}
          >
            {slices.map((slice, i) => (
              <Cell key={slice.name} fill={i < top.length ? SLOT_COLORS[i] : OTHER_COLOR} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--chart-surface)",
              border: "1px solid var(--chart-grid)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => formatCurrency(Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
