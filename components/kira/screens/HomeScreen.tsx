"use client";

import { useMemo } from "react";
import { Camera, Eye, Mic, Sparkles } from "lucide-react";
import type { DemoState } from "@/lib/demo/state";
import type { SheetId } from "../constants";
import { MusimCard, TransactionRow } from "../cards";
import { Hero, QuickAction, ScreenScroller, SectionHeader } from "../ui";
import { card, cn, formatMoney, formatSignedMoney, greeting, roundButton } from "../utils";

export function HomeScreen({
  data,
  onOpenSheet,
  onToggleMusimAutoSave,
  onOpenRewind,
}: {
  data: DemoState;
  onOpenSheet: (sheet: SheetId) => void;
  onToggleMusimAutoSave: (eventId: string, enabled: boolean) => void;
  onOpenRewind: () => void;
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

  const monthName = new Date().toLocaleDateString("en-MY", { month: "long" });

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

        {/* Kira Rewind Banner */}
        <button
          className={cn(
            "mt-5 w-full text-left overflow-hidden rounded-[22px]",
            "bg-[radial-gradient(circle_at_80%_50%,rgba(236,72,153,.4),transparent_60%),linear-gradient(135deg,#4C1D95,#831843)]",
            "border border-[#A78BFA]/30 p-4",
          )}
          onClick={onOpenRewind}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded-full bg-[#EC4899] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                  NEW
                </span>
                <span className="text-[11px] font-black uppercase tracking-[.15em] text-white/50">
                  Kira Rewind
                </span>
              </div>
              <p className="text-[17px] font-black text-white leading-snug">
                Your {monthName} story is ready
              </p>
              <p className="mt-0.5 text-[12px] text-white/60">
                See your spending personality →
              </p>
            </div>
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15">
              <Sparkles size={22} className="text-white" />
            </div>
          </div>
        </button>

        <div className="mt-5 grid grid-cols-2 gap-3">
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
