"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { BottomSheet, SheetHeader } from "../ui";
import { card, primaryButton } from "../utils";

export function TransferSheet({
  open,
  busy,
  onClose,
  onSend,
  toUserName,
  amountMyr,
  debtRecordId,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSend: (amountMyr: string, note?: string) => void;
  toUserName: string;
  amountMyr: string;
  debtRecordId: string | null;
}) {
  const [amount, setAmount] = useState(amountMyr);
  const [note, setNote] = useState("");

  return (
    <BottomSheet open={open} onClose={onClose}>
      <SheetHeader label={debtRecordId ? "Settle Debt" : "Send Money"} onClose={onClose} />
      <div className="mt-4 grid gap-3">
        <div className={card("bg-[#1E1E30] p-4")}>
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Recipient</span>
          <p className="mt-1.5 text-sm font-bold text-white">{toUserName}</p>
        </div>
        <div className={card("bg-[#1E1E30] p-4")}>
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Amount (RM)</span>
          <input
            className="mt-1.5 w-full bg-transparent text-[28px] font-black text-[#4ADE80] placeholder:text-[#4ADE80]/30 focus:outline-none"
            placeholder="0.00"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className={card("bg-[#1E1E30] p-4")}>
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Note (Optional)</span>
          <input
            className="mt-1.5 w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
            placeholder="What's this for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <button
          className={primaryButton("w-full mt-2")}
          onClick={() => onSend(amount, note)}
          disabled={busy || !amount || Number(amount) <= 0}
        >
          {busy ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
          Send RM {Number(amount || 0).toFixed(2)} to {toUserName.split(" ")[0]}
        </button>
      </div>
    </BottomSheet>
  );
}
