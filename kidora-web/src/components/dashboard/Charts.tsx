"use client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import type { ProgressSeries } from "@/types/lms";

const palette = ["#7C3AED", "#22C55E", "#3B82F6", "#F59E0B", "#EC4899", "#14B8A6"];

export function ProgressLineChart({ data, height = 240, percent = true }: { data: ProgressSeries; height?: number; percent?: boolean }) {
  const rows = data.labels.map((l, i) => Object.fromEntries([["label", l], ...data.series.map((s) => [s.key, s.values[i] ?? null])]));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#EEF0F4" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} domain={percent ? [0, 100] : ["auto", "auto"]} tickFormatter={(v) => (percent ? `${v}%` : v)} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EEF0F4", fontSize: 12 }} formatter={(v: number) => (percent ? `${v}%` : v)} />
        {data.series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
        {data.series.map((s, i) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? palette[i % palette.length]} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: s.color ?? palette[i % palette.length] }} activeDot={{ r: 5 }} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MinutesBarChart({ labels, values, height = 220, color = "#22C55E" }: { labels: string[]; values: number[]; height?: number; color?: string }) {
  const rows = labels.map((l, i) => ({ label: l, min: values[i] ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 18, right: 4, left: -22, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#EEF0F4" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v) => `${v} min`} width={58} />
        <Tooltip cursor={{ fill: "#F7F5FF" }} contentStyle={{ borderRadius: 12, border: "1px solid #EEF0F4", fontSize: 12 }} formatter={(v: number) => [`${v} min`, "Learning"]} />
        <Bar dataKey="min" fill={color} radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false}>
          <LabelList dataKey="min" position="top" formatter={(v: number) => (v ? `${v} min` : "")} style={{ fontSize: 10, fill: "#6B7280" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
