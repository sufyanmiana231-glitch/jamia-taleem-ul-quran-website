"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonth, formatCurrency } from "@/lib/i18n";
import type { MonthlyTotals } from "@/lib/services/finance-calculations";

/**
 * Two-series grouped bar (income vs expense). Colors are the validated
 * palette's slot 2 (green) / slot 8 (red) — see globals.css chart tokens
 * and dataviz skill references/palette.md. Rendered LTR: axis numbers and
 * month labels read more naturally left-to-right even inside an RTL page.
 */
export function IncomeExpenseChart({ data, incomeLabel, expenseLabel }: { data: MonthlyTotals[]; incomeLabel: string; expenseLabel: string }) {
  const chartData = data.map((d) => ({ ...d, monthLabel: formatMonth(d.period) }));

  return (
    <div dir="ltr" className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 11, fill: "var(--chart-ink-muted)" }}
            axisLine={{ stroke: "var(--chart-axis)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--chart-ink-muted)" }}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-grid)", opacity: 0.5 }}
            contentStyle={{
              background: "var(--chart-surface)",
              border: "1px solid var(--chart-grid)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--chart-ink-primary)", fontWeight: 600 }}
            formatter={(value) => formatCurrency(Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name={incomeLabel} fill="var(--chart-income)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expense" name={expenseLabel} fill="var(--chart-expense)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
