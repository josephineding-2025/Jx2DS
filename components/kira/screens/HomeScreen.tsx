"use client";

import { useMemo } from "react";
import { Camera, Eye, Mic } from "lucide-react";
import type { DemoState } from "@/lib/demo/state";
import type { SheetId } from "../constants";
import { MusimCard, TransactionRow } from "../cards";
import { Hero, QuickAction, ScreenScroller, SectionHeader } from "../ui";
import { card, formatMoney, formatSignedMoney, greeting, roundButton } from "../utils";

export function HomeScreen({
  data,
  onOpenSheet,
  onToggleMusimAutoSave,
}: {
  data: DemoState;
  onOpenSheet: (sheet: SheetId) => void;
  onToggleMusimAutoSave: (eventId: string, enabled: boolean) => void;
}) {
  const balance = Number(data.walletBalanceSen) / 100;
  const savings = data.buckets.find((bucket) => bucket.type === "savings");
  const saveRate = savings?.percentage ?? 0;

  const weeklyDelta = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return data.transactions
      .filter((t) => t.date >= cutoffStr)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [data.transactions]);

  return (
    <>
      <Hero />
      <ScreenScroller>
        <div>
          <p className="mb-2 text-[13px] font-medium text-white/75">{greeting()}, {data.user.name.split(" ")[0]}</p>
          <h1 className="m-0 text-2xl font-black leading-none">Total balance</h1>
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <div className="text-[clamp(34px,10vw,44px)] font-black leading-none tracking-normal">
            {formatMoney(balance)}
          </div>
          <button className={roundButton("size-[30px]")} aria-label="Toggle balance visibility">
            <Eye size={15} />
          </button>
        </div>
        <div className="mt-2.5 flex flex-col gap-1">
          <div className="flex gap-2.5 text-xs text-white/70">
            <span className={weeklyDelta >= 0 ? "text-[#4ADE80]" : "text-[#EC4899]"}>
              {weeklyDelta >= 0 ? "+" : ""}{formatSignedMoney(weeklyDelta)} this week
            </span>
            <span>{saveRate}% saved</span>
          </div>
        </div>

        <div className="my-6 grid grid-cols-2 gap-3">
          <QuickAction icon={Mic} label="Voice Log" onClick={() => onOpenSheet("voice")} />
          <QuickAction icon={Camera} label="Scan Receipt" onClick={() => onOpenSheet("receipt")} />
        </div>

        <SectionHeader title="Musim" action="See all" />
        <div className="no-scrollbar -mr-[22px] flex gap-2.5 overflow-x-auto pr-[22px]">
          {data.musimEvents.slice(0, 3).map((event) => (
            <MusimCard key={event.id} event={event} onToggleAutoSave={onToggleMusimAutoSave} />
          ))}
          {!data.musimEvents.length && (
            <div className={card("min-w-[220px] p-4 text-sm text-zinc-400")}>
              No upcoming events scheduled.
            </div>
          )}
        </div>

        <SectionHeader title="Recent" action="View all" />
        <div className="grid gap-1">
          {data.transactions.slice(0, 5).map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </ScreenScroller>
    </>
  );
}
