"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles } from "lucide-react";
import { buildProjection } from "@/lib/finance/projection";
import { compactFormatter } from "../constants";
import { Hero, MoneySlider, ProjectionTwin, ScreenScroller, Title } from "../ui";
import { card, formatMoney } from "../utils";

export function CerminScreen() {
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [foodCut, setFoodCut] = useState(0);
  const [transportCut, setTransportCut] = useState(0);
  const monthlyDelta = monthlySavings + foodCut + transportCut;
  const series = useMemo(
    () => buildProjection(50, 50 + monthlyDelta, 4200, 23, 85),
    [monthlyDelta],
  );
  const last = series[series.length - 1];
  const delta = last.optimised - last.current;

  return (
    <>
      <Hero compact />
      <ScreenScroller>
        <Title title="Cermin" subtitle="See what your habits are building" icon={Sparkles} />

        <div className="mb-3.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <ProjectionTwin title="Current You" amount={last.current} muted />
          <div className="max-w-[74px] rounded-full border border-[#22D3EE]/40 bg-[#22D3EE]/15 px-2 py-1.5 text-center text-[11px] font-black text-[#22D3EE]">
            +RM {compactFormatter.format(delta)}
          </div>
          <ProjectionTwin title="Optimised You" amount={last.optimised} />
        </div>

        <div className={card("p-3 pb-1")}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="currentLine" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6b7280" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#6b7280" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="optimisedLine" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis
                dataKey="age"
                interval={20}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280", fontSize: 10 }}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "#16162a",
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 12,
                  color: "#fff",
                }}
                formatter={(value) => formatMoney(Number(value))}
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke="#6b7280"
                fill="url(#currentLine)"
                strokeDasharray="4 4"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="optimised"
                stroke="#22d3ee"
                fill="url(#optimisedLine)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid gap-3.5">
          <MoneySlider label="Monthly savings" value={monthlySavings} min={0} max={600} color="cyan" sign="+" onChange={setMonthlySavings} />
          <MoneySlider label="Food and drinks" value={foodCut} min={0} max={400} color="amber" sign="-" onChange={setFoodCut} />
          <MoneySlider label="Transport" value={transportCut} min={0} max={250} color="violet" sign="-" onChange={setTransportCut} />
        </div>
        <p className="mt-3.5 text-center text-[11px] text-zinc-500">
          Assumes 4% p.a. baseline return.
        </p>
      </ScreenScroller>
    </>
  );
}
