"use client";

import { useState } from "react";
import { Loader2, Mic, Sparkles } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import type { ParsedExpense } from "@/types";
import { ParsedExpenseCard } from "../cards";
import { BottomSheet, SheetHeader } from "../ui";
import { card, cn, primaryButton } from "../utils";

export function VoiceSheet({
  open,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (expense: ParsedExpense) => void;
}) {
  const { state, transcript, start, stop } = useVoiceRecorder();
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [notes, setNotes] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parse = async () => {
    if (!transcript) return;
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      setParsed(data as ParsedExpense);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setParsing(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <SheetHeader label="Voice Log" onClose={onClose} />
      <div className="relative mx-auto mt-1 grid size-[188px] place-items-center">
        <span className="sonar-ring" />
        <span className="sonar-ring delay-1" />
        <span className="sonar-ring delay-2" />
        <button
          onClick={state === "listening" ? stop : start}
          className="relative z-10 grid size-[82px] place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#a78bfa,#6d28d9_70%)] shadow-[0_0_40px_rgba(167,139,250,.55)]"
        >
          <Mic size={30} />
        </button>
      </div>
      <p className="mb-3 text-center text-[13px] text-zinc-400">
        {state === "listening" ? "Listening…" : "Tap the mic and speak"}
      </p>

      <div className={card("bg-[#1E1E30] p-4")}>
        <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Transcript</span>
        <p className="mt-1.5 min-h-6 text-sm leading-6">
          {transcript || "No speech captured yet."}
        </p>
      </div>

      <button className={cn(primaryButton("w-full mt-3"))} onClick={parse} disabled={!transcript || parsing}>
        {parsing ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
        Parse
      </button>

      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
      {parsed && (
        <>
          <ParsedExpenseCard parsed={parsed} onParsedChange={setParsed} busy={busy} onSave={(expense) => onSave({ ...expense, notes: notes || undefined })} />
          <input
            className="mt-2.5 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
            placeholder="Add a note (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </>
      )}
    </BottomSheet>
  );
}
