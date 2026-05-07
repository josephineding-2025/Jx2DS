"use client";

import { useState } from "react";
import { CircleDollarSign, Loader2, Search, Send } from "lucide-react";
import type { DemoState } from "@/lib/demo/state";
import type { DebtItem, SquadMemberItem, TransactionItem } from "../constants";
import { DebtCard, GroupedTransactions } from "../cards";
import { Hero, ScreenScroller, Segmented, Title } from "../ui";
import { card, cn, formatMoney, primaryButton } from "../utils";

export function DuitScreen({
  debts,
  transactions,
  transfers,
  squadMembers,
  onReconcile,
  reconciling,
  reconcileName,
  reconcileAmount,
  onReconcileNameChange,
  onReconcileAmountChange,
  setTransferSheet,
  flash,
}: {
  debts: DebtItem[];
  transactions: TransactionItem[];
  transfers: DemoState["transfers"];
  squadMembers: SquadMemberItem[];
  onReconcile: (name: string, amount: number) => void;
  reconciling: boolean;
  reconcileName: string;
  reconcileAmount: string;
  onReconcileNameChange: (v: string) => void;
  onReconcileAmountChange: (v: string) => void;
  setTransferSheet: (sheet: { toUserId: string; toUserName: string; amountMyr: string; debtRecordId: string | null }) => void;
  flash: (msg: string) => void;
}) {
  const [view, setView] = useState<"transactions" | "owes_me" | "i_owe" | "transfers">("owes_me");

  const oweMeDebts = debts.filter((d) => d.direction === "owe_me");
  const iOweDebts = debts.filter((d) => d.direction === "i_owe");

  const outstanding = oweMeDebts
    .filter((d) => d.status !== "settled")
    .reduce((sum, d) => sum + d.amount, 0);

  const iOweTotal = iOweDebts
    .filter((d) => d.status !== "settled")
    .reduce((sum, d) => sum + d.amount, 0);

  const canSubmit = reconcileName.trim().length > 0 && Number(reconcileAmount) > 0;

  return (
    <>
      <Hero compact />
      <ScreenScroller>
        <Title title="Wallet" subtitle="Transactions and money owed" icon={Search} />
        <Segmented
          value={view}
          options={[
            { id: "transactions", label: "Transactions" },
            { id: "owes_me", label: "Owes Me" },
            { id: "i_owe", label: "I Owe" },
            { id: "transfers", label: "Transfers" },
          ]}
          onChange={setView}
        />

        {view === "transactions" && <GroupedTransactions transactions={transactions} />}

        {view === "transfers" && (
          <div className="grid gap-3">
            {transfers.length === 0 ? (
              <div className={card("p-5 text-center text-sm text-zinc-400")}>
                No transfers yet.
              </div>
            ) : (
              transfers.map((t) => (
                <div key={t.id} className={card("flex items-center gap-3 p-3.5")}>
                  <div className={cn(
                    "grid size-10 place-items-center rounded-full",
                    t.direction === "sent" ? "bg-[#7C3AED]/20 text-[#A78BFA]" : "bg-[#4ADE80]/15 text-[#4ADE80]"
                  )}>
                    {t.direction === "sent" ? <Send size={18} /> : <CircleDollarSign size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold">
                      {t.direction === "sent" ? `To ${t.toUserName}` : `From ${t.fromUserName}`}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {new Date(t.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                      {t.note && ` · ${t.note}`}
                    </p>
                  </div>
                  <span className={cn(
                    "text-sm font-black tabular-nums",
                    t.direction === "sent" ? "text-white" : "text-[#4ADE80]"
                  )}>
                    {t.direction === "sent" ? "-" : "+"}RM {(Number(t.amountSen) / 100).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {view === "owes_me" && (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="mb-1 text-xs text-zinc-400">Outstanding</p>
                <strong className="text-3xl font-black">{formatMoney(outstanding)}</strong>
              </div>
            </div>

            <div className={card("mb-4 grid gap-3 p-3.5")}>
              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
                Match incoming payment
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="h-10 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                  placeholder="Sender name"
                  value={reconcileName}
                  onChange={(e) => onReconcileNameChange(e.target.value)}
                />
                <input
                  className="h-10 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                  placeholder="Amount (RM)"
                  type="number"
                  min="0"
                  value={reconcileAmount}
                  onChange={(e) => onReconcileAmountChange(e.target.value)}
                />
              </div>
              <button
                className={primaryButton("w-full")}
                onClick={() => onReconcile(reconcileName.trim(), Number(reconcileAmount))}
                disabled={reconciling || !canSubmit}
              >
                {reconciling ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                Match payment
              </button>
            </div>

            <div className="grid gap-3">
              {oweMeDebts.map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  squadMembers={squadMembers}
                  onRequestPayment={(name, amount) => {
                    onReconcileNameChange(name);
                    onReconcileAmountChange(String(amount));
                    flash(`Request sent to ${name} — match payment below`);
                  }}
                  flash={flash}
                />
              ))}
            </div>
          </>
        )}

        {view === "i_owe" && (
          <>
            <div className="mb-4">
              <p className="mb-1 text-xs text-zinc-400">You owe</p>
              <strong className="text-3xl font-black text-[#F59E0B]">{formatMoney(iOweTotal)}</strong>
            </div>
            {iOweDebts.length === 0 ? (
              <div className={card("p-5 text-center text-sm text-zinc-400")}>
                No outgoing debts — you&apos;re all square.
              </div>
            ) : (
              <div className="grid gap-3">
                {iOweDebts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    iOwe
                    squadMembers={squadMembers}
                    setTransferSheet={setTransferSheet}
                    flash={flash}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </ScreenScroller>
    </>
  );
}
