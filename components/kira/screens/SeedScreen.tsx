"use client";

import { Loader2, Sparkles, Zap } from "lucide-react";
import { primaryButton } from "../utils";

export function SeedScreen({
  busy,
  onSeed,
}: {
  busy: boolean;
  onSeed: () => void;
}) {
  return (
    <main className="grid min-h-svh place-items-center bg-[#07070D] p-5 text-white">
      <div className="grid min-h-[520px] w-[min(100%,430px)] content-center justify-items-center gap-5 rounded-[30px] border border-white/10 bg-[#0A0A14] p-8 text-center">
        <div className="grid size-[70px] place-items-center rounded-full bg-[radial-gradient(circle_at_35%_28%,#c4b5fd,#6d28d9_70%)] shadow-[0_0_34px_rgba(167,139,250,.5)]">
          <Sparkles size={28} />
        </div>
        <h1 className="m-0 text-[42px] font-black">SnapIt</h1>
        <p className="m-0 max-w-[280px] leading-6 text-zinc-400">
          Set up Amirah&apos;s account to explore SnapIt.
        </p>
        <button className={primaryButton()} onClick={onSeed} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
          Get started
        </button>
      </div>
    </main>
  );
}
