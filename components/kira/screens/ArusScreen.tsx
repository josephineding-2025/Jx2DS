"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Settings2, Sparkles, Zap } from "lucide-react";
import type { BucketItem } from "../constants";
import { BucketCard } from "../cards";
import { Hero, ScreenScroller, Title } from "../ui";
import { bucketRank, formatMoney, primaryButton, roundButton } from "../utils";

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

export function ArusScreen({
  buckets,
  income,
  salaryPulse,
  onSimulateSalary,
  onEditSplit,
  simulating,
}: {
  buckets: BucketItem[];
  income: number;
  salaryPulse: boolean;
  onSimulateSalary: () => void;
  onEditSplit: () => void;
  simulating: boolean;
}) {
  const sorted = [...buckets].sort(
    (a, b) => bucketRank(a.type) - bucketRank(b.type),
  );

  return (
    <>
      <Hero />
      <ScreenScroller>
        <div className="flex items-start justify-between">
          <Title title="Arus" subtitle="Salary Autopilot" icon={Sparkles} />
          <button className={roundButton("mt-1 size-[34px]")} onClick={onEditSplit} aria-label="Configure split">
            <Settings2 size={16} />
          </button>
        </div>

        <div className="relative my-1 h-[185px]">
          <svg className="absolute inset-0 size-full" viewBox="0 0 320 170" aria-hidden="true">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path className="flow-line" d="M150 62 C 85 88, 58 118, 46 158" />
            <path className="flow-line" d="M160 66 C 160 102, 160 128, 160 158" />
            <path className="flow-line" d="M170 62 C 235 88, 262 118, 274 158" />
            <FlowDrops active={salaryPulse} />
          </svg>
          <motion.div
            className="absolute left-1/2 top-2 grid size-[104px] -translate-x-1/2 place-content-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#c4b5fd,#6d28d9_70%)] text-center shadow-[0_0_50px_rgba(167,139,250,.66),inset_0_-10px_24px_rgba(76,29,149,.5)]"
            animate={salaryPulse ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.8, repeat: salaryPulse ? 2 : 0 }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Salary</span>
            <strong className="text-lg font-black">{formatMoney(income)}</strong>
          </motion.div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {sorted.map((bucket) => (
            <BucketCard key={bucket.id} bucket={bucket} income={income} />
          ))}
        </div>

        <button className={primaryButton("w-full mt-4")} onClick={onSimulateSalary} disabled={simulating}>
          {simulating ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
          Salary received
        </button>
      </ScreenScroller>
    </>
  );
}
