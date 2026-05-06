"use client";

import { useRef, useState } from "react";
import { ReceiptText } from "lucide-react";
import type { ParsedExpense } from "@/types";
import { ParsedExpenseCard } from "../cards";
import { BottomSheet, SheetHeader } from "../ui";
import { resizeImage } from "../utils";

export function ReceiptSheet({
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = async (file: File) => {
    setParsing(true);
    setError(null);
    try {
      const compressed = await resizeImage(file, 1024);
      setPreview(compressed);
      const res = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: compressed.split(",")[1],
          mimeType: "image/jpeg",
        }),
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
      <SheetHeader label="Scan Receipt" onClose={onClose} />
      <button
        className="mt-3.5 grid min-h-[190px] w-full place-items-center gap-2 overflow-hidden rounded-3xl border border-[#A78BFA]/40 bg-[#1E1E30] text-[#A78BFA]"
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Receipt preview" className="max-h-[260px] w-full object-cover" />
        ) : (
          <>
            <ReceiptText size={34} />
            <span className="text-sm font-black text-white">Choose receipt image</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void parseFile(file);
        }}
      />
      {parsing && (
        <p className="mt-3 text-center text-[13px] text-zinc-400">
          Extracting merchant, total, and category.
        </p>
      )}
      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
      {parsed && (
        <>
          <ParsedExpenseCard parsed={parsed} onParsedChange={setParsed} busy={busy} onSave={() => onSave({ ...parsed, notes: notes || undefined })} />
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
