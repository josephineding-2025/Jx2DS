"use client";

import { Loader2, SlidersHorizontal } from "lucide-react";
import { useCallback, useState } from "react";
import type { BucketItem } from "../constants";
import { bucketColor } from "../utils";
import { BottomSheet, SheetHeader } from "../ui";
import { cn, primaryButton } from "../utils";

type DraftBucket = { id: string; name: string; percentage: number; color: string };

export function EditSplitSheet({
  open,
  buckets,
  income,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  buckets: BucketItem[];
  income: number;
  busy: boolean;
  onClose: () => void;
  onSave: (patches: { id: string; percentage: number }[]) => void;
}) {
  const [drafts, setDrafts] = useState<DraftBucket[]>(() =>
    buckets
      .slice()
      .sort((a, b) => {
        const rank = (t: string) => (t === "savings" ? 0 : t === "bills" ? 1 : 2);
        return rank(a.type) - rank(b.type);
      })
      .map((b) => ({ id: b.id, name: b.name, percentage: b.percentage, color: bucketColor(b.type) })),
  );

  const total = drafts.reduce((s, d) => s + d.percentage, 0);
  const valid = total === 100;

  const adjust = useCallback((index: number, rawNext: number) => {
    setDrafts((prev) => {
      const next = Math.max(0, Math.min(100, rawNext));
      const delta = next - prev[index].percentage;
      if (delta === 0) return prev;

      const updated = [...prev];
      updated[index] = { ...updated[index], percentage: next };

      const others = updated
        .map((d, i) => ({ i, p: d.percentage }))
        .filter((d) => d.i !== index && d.p > 0);

      if (others.length > 0) {
        const share = Math.floor(delta / others.length);
        let remainder = delta - share * others.length;
        for (const o of others) {
          const deducted = share + (remainder > 0 ? 1 : 0);
          remainder -= remainder > 0 ? 1 : 0;
          updated[o.i] = {
            ...updated[o.i],
            percentage: Math.max(0, updated[o.i].percentage - deducted),
          };
        }
      }

      return updated;
    });
  }, []);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <SheetHeader label="Configure Split" onClose={onClose} />
      <div className="mt-4 grid gap-5">
        {drafts.map((draft, i) => (
          <label key={draft.id} className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-black">
                <span
                  className={cn(
                    "inline-block size-2.5 rounded-full",
                    draft.color === "cyan" && "bg-[#22D3EE]",
                    draft.color === "violet" && "bg-[#A78BFA]",
                    draft.color === "amber" && "bg-[#F59E0B]",
                  )}
                />
                {draft.name}
              </span>
              <em
                className={cn(
                  "text-sm font-black not-italic",
                  draft.color === "cyan" && "text-[#22D3EE]",
                  draft.color === "violet" && "text-[#A78BFA]",
                  draft.color === "amber" && "text-[#F59E0B]",
                )}
              >
                {draft.percentage}% · RM {((income * draft.percentage) / 100).toFixed(0)}
              </em>
            </div>
            <input
              className="w-full accent-white"
              type="range"
              min={0}
              max={100}
              step={5}
              value={draft.percentage}
              onChange={(e) => adjust(i, Number(e.target.value))}
            />
          </label>
        ))}

        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Total</span>
          <span
            className={cn(
              "font-black",
              valid ? "text-[#4ADE80]" : "text-[#F59E0B]",
            )}
          >
            {total}%
          </span>
        </div>

        <button
          className={primaryButton("w-full")}
          disabled={busy || !valid}
          onClick={() => onSave(drafts.map((d) => ({ id: d.id, percentage: d.percentage })))}
        >
          {busy ? <Loader2 className="animate-spin" size={17} /> : <SlidersHorizontal size={17} />}
          Save split
        </button>
      </div>
    </BottomSheet>
  );
}
