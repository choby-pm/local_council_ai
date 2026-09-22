"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const data = [
  { dept: "행정안전국", 전년: 820, 금년: 1180 },
  { dept: "복지환경국", 전년: 1500, 금년: 1620 },
  { dept: "기획조정실", 전년: 210, 금년: 205 },
  { dept: "건설교통국", 전년: 340, 금년: 690 },
];

const config: ChartConfig = {
  전년: { label: "전년(백만원)", color: "var(--chart-2)" },
  금년: { label: "금년(백만원)", color: "var(--chart-5)" },
};

export function BudgetChart() {
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <BarChart data={data} margin={{ left: -20 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="dept" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="전년" fill="var(--color-전년)" radius={4} />
        <Bar dataKey="금년" fill="var(--color-금년)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
