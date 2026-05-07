"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  Loader2,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { buildArusPlan, type ArusCommitment } from "@/lib/finance/arus";
import type { DemoState } from "@/lib/demo/state";
import type { BucketItem } from "../constants";
import { BucketCard } from "../cards";
import { Hero, Pill, Progress, ScreenScroller, SectionHeader, Title } from "../ui";
import { bucketRank, card, cn, formatMoney, primaryButton, roundButton, secondaryButton } from "../utils";

type ArusScreenProps = {
  buckets: BucketItem[];
  debts: DemoState["debts"];
  musimEvents: DemoState["musimEvents"];
  transactions: DemoState["transactions"];
  income: number;
  salaryDay: number | null;
  salaryPulse: boolean;
  onSimulateSalary: () => void;
  onEditSplit: () => void;
  onApplyCermin: (monthlySavings: number) => void;
  simulating: boolean;
};

function FlowDrops({ active }: { active: boolean }) {
  if (!active) return null;

  const drops = [
    { path: "M150 62 C 85 88, 58 118, 46 158", color: "#22D3EE", delay: 0 },
    { path: "M150 62 C 85 88, 58 118, 46 158", color: "#22D3EE", delay: 0.35 },
    { path: "M160 66 C 160 102, 160 128, 160 158", color: "#A78BFA", delay: 0.12 },
    { path: "M160 66 C 160 102, 160 128, 160 158", color: "#A78BFA", delay: 0.48 },
    { path: "M170 62 C 235 88, 262 118, 274 158", color: "#F59E0B", delay: 0.24 },
    { path: "M170 62 C 235 88, 262 118, 274 158", color: "#F59E0B", delay: 0.6 },
  ];

  return (
    <AnimatePresence>
      {drops.map((drop, i) => (
        <motion.circle
          key={i}
          r={4}
          fill={drop.color}
          opacity={0.9}
          filter="url(#glow)"
          initial={{ opacity: 0, offsetDistance: "0%" }}
          animate={{ opacity: [0, 0.9, 0.9, 0], offsetDistance: ["0%", "100%"] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, delay: drop.delay, ease: "easeIn" }}
        >
          <animateMotion dur="0.9s" begin={`${drop.delay}s`} fill="freeze" path={drop.path} />
        </motion.circle>
      ))}
    </AnimatePresence>
  );
}

function PlanMetric({ label, value, tone }: { label: string; value: string; tone: "cyan" | "violet" | "amber" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      <strong
        className={cn(
          "mt-1 block text-sm font-black",
          tone === "cyan" && "text-[#22D3EE]",
          tone === "violet" && "text-[#A78BFA]",
          tone === "amber" && "text-[#F59E0B]",
        )}
      >
        {value}
      </strong>
    </div>
  );
}

function ShieldCommitment({ item }: { item: ArusCommitment }) {
  return (
    <div className="grid grid-cols-[38px_1fr_auto] items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.035] p-3">
      <div
        className={cn(
          "grid size-[38px] place-items-center rounded-full",
          item.tone === "cyan" && "bg-[#22D3EE]/15 text-[#22D3EE]",
          item.tone === "violet" && "bg-[#7C3AED]/20 text-[#A78BFA]",
          item.tone === "amber" && "bg-[#F59E0B]/15 text-[#F59E0B]",
        )}
      >
        {item.tone === "cyan" ? <CalendarDays size={17} /> : <ShieldCheck size={17} />}
      </div>
      <div className="min-w-0">
        <strong className="block truncate text-[13px] font-black">{item.label}</strong>
        <span className="mt-0.5 block truncate text-[11px] font-medium text-zinc-500">{item.detail}</span>
      </div>
      <strong className="text-right text-[13px] font-black">{formatMoney(item.amount)}</strong>
    </div>
  );
}

function SplitChip({ label, value, tone }: { label: string; value: number; tone: "cyan" | "violet" | "amber" }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3 text-center",
        tone === "cyan" && "border-[#22D3EE]/25 bg-[#22D3EE]/10 text-[#22D3EE]",
        tone === "violet" && "border-[#A78BFA]/25 bg-[#7C3AED]/15 text-[#C4B5FD]",
        tone === "amber" && "border-[#F59E0B]/25 bg-[#F59E0B]/10 text-[#F59E0B]",
      )}
    >
      <span className="block text-[10px] font-black uppercase tracking-widest text-white/45">{label}</span>
      <strong className="mt-1 block text-lg font-black">{value}%</strong>
    </div>
  );
}

export function ArusScreen({
  buckets,
  debts,
  musimEvents,
  transactions,
  income,
  salaryDay,
  salaryPulse,
  onSimulateSalary,
  onEditSplit,
  onApplyCermin,
  simulating,
}: ArusScreenProps) {
  const sorted = useMemo(
    () => [...buckets].sort((a, b) => bucketRank(a.type) - bucketRank(b.type)),
    [buckets],
  );
  const plan = useMemo(
    () => buildArusPlan({ buckets, debts, musimEvents: musimEvents as DemoState["musimEvents"], transactions, income, salaryDay }),
    [buckets, debts, musimEvents, transactions, income, salaryDay],
  );
  const statusCopy = {
    protected: "Protected",
    watch: "Watch zone",
    tight: "Tight cash flow",
  }[plan.status];

  return (
    <>
      <Hero />
      <ScreenScroller>
        <div className="flex items-start justify-between">
          <Title title="Arus" subtitle="Safe-to-Spend Autopilot" icon={Sparkles} />
          <button className={roundButton("mt-1 size-[34px]")} onClick={onEditSplit} aria-label="Configure split">
            <Settings2 size={16} />
          </button>
        </div>

        <section className="relative overflow-hidden rounded-[32px] border border-[#22D3EE]/20 bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,.28),transparent_36%),linear-gradient(145deg,#111827,#100B1F_55%,#2B1905)] p-4 shadow-[0_24px_70px_rgba(0,0,0,.4)]">
          <div className="absolute -right-16 -top-20 size-44 rounded-full bg-[#F59E0B]/20 blur-3xl" />
          <div className="absolute -bottom-24 left-6 size-44 rounded-full bg-[#22D3EE]/20 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <Pill cyan>Debt Shield {statusCopy}</Pill>
            <span className="text-[11px] font-black uppercase tracking-widest text-white/45">
              Payday {plan.nextSalaryLabel}
            </span>
          </div>

          <div className="relative mt-5">
            <span className="text-[11px] font-black uppercase tracking-[.18em] text-[#22D3EE]">Safe to spend today</span>
            <motion.strong
              className="mt-1 block text-[46px] font-black leading-none tracking-[-0.08em] text-white"
              animate={salaryPulse ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              {formatMoney(plan.safeToSpendToday)}
            </motion.strong>
            <p className="mt-2 max-w-[270px] text-[12px] font-medium leading-relaxed text-zinc-300">
              Arus reserves bills, debts, and known Musim costs first. What remains is your spendable daily runway.
            </p>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <PlanMetric label="Until salary" value={`${plan.daysUntilSalary} days`} tone="cyan" />
            <PlanMetric label="Shielded" value={`${plan.shieldCoverage}%`} tone="violet" />
            <PlanMetric label="Runway" value={formatMoney(plan.safeToSpendUntilSalary)} tone="amber" />
          </div>
        </section>

        <div className="relative my-1 h-[154px]">
          <svg className="absolute inset-0 size-full" viewBox="0 0 320 150" aria-hidden="true">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path className="flow-line" d="M150 62 C 85 88, 58 118, 46 138" />
            <path className="flow-line" d="M160 66 C 160 102, 160 118, 160 138" />
            <path className="flow-line" d="M170 62 C 235 88, 262 118, 274 138" />
            <FlowDrops active={salaryPulse} />
          </svg>
          <motion.div
            className="absolute left-1/2 top-2 grid size-[100px] -translate-x-1/2 place-content-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#c4b5fd,#6d28d9_70%)] text-center shadow-[0_0_50px_rgba(167,139,250,.66),inset_0_-10px_24px_rgba(76,29,149,.5)]"
            animate={salaryPulse ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.8, repeat: salaryPulse ? 2 : 0 }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Salary</span>
            <strong className="text-lg font-black">{formatMoney(income)}</strong>
          </motion.div>
        </div>

        <SectionHeader title="Debt Shield" action={plan.shieldShortfall > 0 ? `${formatMoney(plan.shieldShortfall)} gap` : "covered"} compact />
        <section className={card("grid gap-3 p-3.5")}> 
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Protected this cycle</p>
              <strong className="mt-1 block text-2xl font-black">{formatMoney(plan.shieldTarget)}</strong>
            </div>
            <div className="grid size-[68px] place-items-center rounded-full border border-[#A78BFA]/30 bg-[#7C3AED]/15 text-center">
              <strong className="text-lg font-black text-[#C4B5FD]">{plan.shieldCoverage}%</strong>
            </div>
          </div>
          <Progress value={plan.shieldCoverage} color={plan.status === "tight" ? "amber" : "violet"} />
          <div className="grid gap-2">
            {plan.commitments.map((item) => (
              <ShieldCommitment key={item.id} item={item} />
            ))}
          </div>
        </section>

        <SectionHeader title="AI Split Recommendation" action="salary-day rule" />
        <section className={card("grid gap-3.5 p-3.5")}> 
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#22D3EE]/15 text-[#22D3EE]">
              <BrainCircuit size={18} />
            </div>
            <div>
              <strong className="text-sm font-black">Protect first, spend with one clear number.</strong>
              <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">{plan.recommendedSplit.reason}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <SplitChip label="Savings" value={plan.recommendedSplit.savings} tone="cyan" />
            <SplitChip label="Bills" value={plan.recommendedSplit.bills} tone="violet" />
            <SplitChip label="Flex" value={plan.recommendedSplit.flex} tone="amber" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className={secondaryButton("min-h-11")} onClick={onEditSplit}>
              <Target size={16} />
              Tune split
            </button>
            <button className={secondaryButton("min-h-11 border-[#22D3EE]/35 text-[#CFFAFE]")} onClick={() => onApplyCermin((plan.recommendedSplit.savings / 100) * income)}>
              Cermin impact
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        <SectionHeader title="Live Pockets" action="GX-style buckets" />
        <div className="grid grid-cols-3 gap-2">
          {sorted.map((bucket) => (
            <BucketCard key={bucket.id} bucket={bucket} income={income} />
          ))}
        </div>

        <button className={primaryButton("mt-4 w-full")} onClick={onSimulateSalary} disabled={simulating}>
          {simulating ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
          Run salary autopilot
        </button>
      </ScreenScroller>
    </>
  );
}
