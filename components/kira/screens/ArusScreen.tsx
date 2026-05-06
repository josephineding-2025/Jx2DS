"use client";

import { motion } from "framer-motion";
import { Loader2, Sparkles, Zap } from "lucide-react";
import type { BucketItem } from "../constants";
import { BucketCard } from "../cards";
import { Hero, ScreenScroller, Title } from "../ui";
import { bucketRank, formatMoney, primaryButton } from "../utils";

export function ArusScreen({
  buckets,
  income,
  salaryPulse,
  onSimulateSalary,
  simulating,
}: {
  buckets: BucketItem[];
  income: number;
  salaryPulse: boolean;
  onSimulateSalary: () => void;
  simulating: boolean;
}) {
  const sorted = [...buckets].sort(
    (a, b) => bucketRank(a.type) - bucketRank(b.type),
  );

  return (
    <>
      <Hero />
      <ScreenScroller>
        <Title title="Arus" subtitle="Salary Autopilot" icon={Sparkles} />

        <div className="relative my-1 h-[185px]">
          <svg className="absolute inset-0 size-full" viewBox="0 0 320 170" aria-hidden="true">
            <path className="flow-line" d="M150 62 C 85 88, 58 118, 46 158" />
            <path className="flow-line" d="M160 66 C 160 102, 160 128, 160 158" />
            <path className="flow-line" d="M170 62 C 235 88, 262 118, 274 158" />
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
