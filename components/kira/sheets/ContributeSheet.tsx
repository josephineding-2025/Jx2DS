"use client";

import { useState } from "react";
import { Loader2, PiggyBank } from "lucide-react";
import { BottomSheet, SheetHeader } from "../ui";
import { cn, primaryButton } from "../utils";

export function ContributeSheet({
  open,
  bucketId,
  busy,
  onClose,
  onContribute,
}: {
  open: boolean;
  bucketId: string;
  busy: boolean;
  onClose: () => void;
  onContribute: (bucketId: string, amount: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const presets = [50, 100, 200];

  return (
    <BottomSheet open={open} onClose={onClose}>
      <SheetHeader label="Contribute to Fund" onClose={onClose} />
      <div className="mt-4 grid gap-3">
        <div className="flex gap-2">
          {presets.map((p) => (
            <button
              key={p}
              className={cn(
                "flex-1 rounded-full border py-2 text-sm font-black transition-colors",
                amount === String(p)
                  ? "border-[#22D3EE] bg-[#22D3EE]/20 text-[#22D3EE]"
                  : "border-white/10 bg-white/5 text-zinc-300",
              )}
              onClick={() => setAmount(String(p))}
            >
              RM {p}
            </button>
          ))}
        </div>
        <input
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#22D3EE]"
          placeholder="Or enter custom amount"
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          className={primaryButton("w-full")}
          onClick={() => onContribute(bucketId, Number(amount))}
          disabled={busy || !amount || Number(amount) <= 0}
        >
          {busy ? <Loader2 className="animate-spin" size={17} /> : <PiggyBank size={17} />}
          Add to bucket
        </button>
      </div>
    </BottomSheet>
  );
}
