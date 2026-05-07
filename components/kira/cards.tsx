"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import type { ParsedExpense } from "@/types";
import type { BucketItem, DebtItem, MusimItem, SquadMemberItem, TransactionItem } from "./constants";
import { renderMusimIcon, renderTransactionIcon } from "./icons";
import { Avatar, AnimatedProgress, Pill, Progress } from "./ui";
import {
  bucketCaption,
  bucketColor,
  card,
  cn,
  formatMoney,
  formatShortDate,
  formatSignedMoney,
  groupTransactions,
  primaryButton,
} from "./utils";

export function MusimCard({ event, onToggleAutoSave }: { event: MusimItem; onToggleAutoSave: (id: string, enabled: boolean) => void }) {
  return (
    <article className={card("min-w-[166px] p-3")}>
      <div className="flex items-center justify-between">
        {renderMusimIcon(event.category)}
        <Pill>{event.daysRemaining} days</Pill>
      </div>
      <h3 className="mb-1 mt-3 min-h-8 text-sm font-black leading-tight">
        {event.eventName}
      </h3>
      <strong className="mb-1 block text-[13px] font-black text-[#22D3EE]">
        {formatMoney(event.dailyTarget)} / day
      </strong>
      <button
        className={cn(
          "mt-1.5 flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-black transition-colors",
          event.autoSaveEnabled
            ? "bg-[#4ADE80]/20 text-[#4ADE80]"
            : "bg-white/5 text-zinc-500",
        )}
        onClick={() => onToggleAutoSave(event.id, !event.autoSaveEnabled)}
      >
        {event.autoSaveEnabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
        Auto-save
      </button>
      {event.autoSaveEnabled && event.savedToday && (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-[#4ADE80]/80">
          <Check size={10} />
          Saved today
        </p>
      )}
    </article>
  );
}

export function TransactionRow({ transaction }: { transaction: TransactionItem }) {
  const positive = transaction.amount > 0;

  return (
    <div className="grid grid-cols-[42px_1fr_auto] items-center gap-3 py-2.5">
      <div
        className={cn(
          "grid size-[42px] place-items-center rounded-full bg-[#A78BFA]/20 text-[#C4B5FD]",
          positive && "bg-[#4ADE80]/15 text-[#4ADE80]",
        )}
      >
        {renderTransactionIcon(transaction)}
      </div>
      <div className="min-w-0">
        <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-black">
          {transaction.merchant ?? transaction.category}
        </strong>
        <span className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-zinc-400">
          {transaction.category} — {formatShortDate(transaction.date)}
        </span>
      </div>
      <div className={cn("text-sm font-black", positive ? "text-[#4ADE80]" : "text-white")}>
        {formatSignedMoney(transaction.amount)}
      </div>
    </div>
  );
}

export function GroupedTransactions({ transactions }: { transactions: TransactionItem[] }) {
  const grouped = useMemo(() => groupTransactions(transactions), [transactions]);

  return (
    <div className="grid gap-3">
      {grouped.map((group) => (
        <div key={group.label}>
          <h3 className="mb-0.5 mt-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
            {group.label}
          </h3>
          {group.items.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DebtCard({
  debt,
  iOwe = false,
  squadMembers,
  setTransferSheet,
  onRequestPayment,
  flash,
}: {
  debt: DebtItem;
  iOwe?: boolean;
  squadMembers?: SquadMemberItem[];
  setTransferSheet?: (sheet: { toUserId: string; toUserName: string; amountMyr: string; debtRecordId: string | null }) => void;
  onRequestPayment?: (name: string, amount: number) => void;
  flash?: (msg: string) => void;
}) {
  const settled = debt.status === "settled";
  const partial = debt.status === "partial";
  const progress = settled ? 100 : partial ? 50 : 0;

  const handlePay = () => {
    if (!squadMembers || !setTransferSheet || !flash) return;
    const member = squadMembers.find((m) =>
      m.name.toLowerCase().startsWith(debt.debtorName.toLowerCase())
    );
    if (!member) {
      flash(`Cannot find user account for ${debt.debtorName}`);
      return;
    }
    setTransferSheet({
      toUserId: member.userId,
      toUserName: debt.debtorName,
      amountMyr: debt.amount.toFixed(2),
      debtRecordId: debt.id,
    });
  };

  const handleRequest = () => {
    if (onRequestPayment) {
      onRequestPayment(debt.debtorName, debt.amount);
    } else if (flash) {
      flash(`Payment requested from ${debt.debtorName}`);
    }
  };

  return (
    <article
      className={card(
        cn(
          "grid grid-cols-[44px_1fr_auto] items-center gap-3 p-3.5",
          settled && "opacity-75 shadow-[inset_0_0_0_1px_rgba(74,222,128,.34)]",
          iOwe && !settled && "shadow-[inset_0_0_0_1px_rgba(245,158,11,.2)]",
        ),
      )}
    >
      <Avatar name={debt.debtorName} />
      <div className="grid min-w-0 gap-1.5">
        <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px]">
          {debt.debtorName}
        </strong>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-zinc-400">
          {debt.context ?? "Shared spend"}
        </span>
        <Progress value={progress} color={settled ? "green" : partial ? "amber" : iOwe ? "amber" : "pink"} />
      </div>
      <div className="grid justify-items-end gap-1.5">
        <strong className="text-sm">{formatMoney(debt.amount)}</strong>
        <div className="flex items-center gap-2">
          <Pill green={settled} amber={partial || iOwe}>
            {settled ? "Settled" : partial ? "Partial" : iOwe ? "You owe" : "Owes"}
          </Pill>
          {!settled && (setTransferSheet || onRequestPayment) && (
            <button
              className="rounded-full bg-[#7C3AED]/20 px-3 py-1 text-[11px] font-black text-[#A78BFA] transition-colors hover:bg-[#7C3AED]/30"
              onClick={iOwe ? handlePay : handleRequest}
            >
              {iOwe ? "Pay" : "Request"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function BucketCard({ bucket, income }: { bucket: BucketItem; income: number }) {
  const color = bucketColor(bucket.type);
  const maxBalance = income * (bucket.percentage / 100);
  const fill = maxBalance > 0
    ? Math.max(6, Math.min(96, (bucket.balance / maxBalance) * 100))
    : Math.max(6, Math.min(96, bucket.percentage * 1.8));

  const overspent = bucket.balance < 0;
  const low = !overspent && maxBalance > 0 && bucket.balance / maxBalance < 0.2;

  return (
    <article
      className={card(
        cn(
          "relative grid min-h-[132px] gap-2.5 p-3 text-white before:absolute before:left-3.5 before:right-3.5 before:top-0 before:h-0.5 before:rounded-full before:bg-current before:shadow-[0_0_12px_currentColor]",
          color === "cyan" && "text-[#22D3EE]",
          color === "violet" && "text-[#A78BFA]",
          color === "amber" && "text-[#F59E0B]",
          overspent && "shadow-[inset_0_0_0_1px_rgba(245,158,11,.45)] before:bg-[#F59E0B]",
          low && !overspent && "shadow-[inset_0_0_0_1px_rgba(245,158,11,.2)]",
        ),
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-black text-zinc-200">{bucket.name}</span>
        <em className="text-[11px] font-black not-italic">{bucket.percentage}%</em>
      </div>
      <strong className="text-[15px] font-black text-white">{formatMoney(bucket.balance)}</strong>
      <AnimatedProgress value={fill} color={overspent ? "amber" : color} />
      {overspent && (
        <small className="min-h-6 text-[11px] font-bold text-[#F59E0B]">Over budget</small>
      )}
      {low && !overspent && (
        <small className="min-h-6 text-[11px] font-bold text-[#F59E0B]/80">Running low</small>
      )}
      {!overspent && !low && (
        <small className="min-h-6 text-[11px] font-bold text-current">{bucketCaption(bucket)}</small>
      )}
    </article>
  );
}

export function LeaderRow({ member, rank }: { member: SquadMemberItem; rank: number }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[24px_38px_1fr_76px] items-center gap-2.5 rounded-2xl px-1.5 py-2.5",
        member.isCurrentUser && "bg-gradient-to-r from-[#EC4899]/15 to-transparent shadow-[inset_0_0_0_1px_rgba(236,72,153,.28)]",
      )}
    >
      <span className="text-center text-sm font-black text-zinc-400">{rank}</span>
      <Avatar name={member.name} />
      <div className="min-w-0">
        <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13px]">
          {member.isCurrentUser ? `${member.name.split(" ")[0]} (You)` : member.name}
        </strong>
        <span className="mt-0.5 block text-[11px] font-bold text-[#F59E0B]">
          {member.currentStreak} day streak
        </span>
      </div>
      <div className="grid gap-1 text-right">
        <strong className="text-[13px]">{member.savingsRate}%</strong>
        <Progress value={member.savingsRate * 3} color="pink" />
      </div>
    </div>
  );
}

export function ParsedExpenseCard({
  parsed,
  onParsedChange,
  busy,
  onSave,
}: {
  parsed: ParsedExpense;
  onParsedChange: (updated: ParsedExpense) => void;
  busy: boolean;
  onSave: () => void;
}) {
  const [editingAmount, setEditingAmount] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState(false);

  const updateAmount = (raw: string) => {
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    const per_person = parsed.participants > 0 ? n / parsed.participants : n;
    onParsedChange({ ...parsed, amount: n, per_person });
  };

  const updateDebtAmount = (name: string, raw: string) => {
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return;
    onParsedChange({
      ...parsed,
      debt_records: parsed.debt_records.map((d) =>
        d.name === name ? { ...d, amount: n } : d,
      ),
    });
  };

  return (
    <div className={card("mt-3 grid gap-3.5 border-[#4ADE80]/20 bg-[#1E1E30] p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editingAmount ? (
            <input
              autoFocus
              className="w-full rounded-xl border border-[#4ADE80]/40 bg-black/30 px-2 py-1 text-[26px] font-black text-[#4ADE80] focus:outline-none"
              defaultValue={parsed.amount}
              type="number"
              onBlur={(e) => { updateAmount(e.target.value); setEditingAmount(false); }}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
            />
          ) : (
            <button
              className="text-left"
              onClick={() => setEditingAmount(true)}
              title="Tap to edit amount"
            >
              <strong className="block text-[28px] font-black text-[#4ADE80]">
                {formatMoney(parsed.amount)}
              </strong>
            </button>
          )}
          {editingMerchant ? (
            <input
              autoFocus
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-2 py-0.5 text-xs text-zinc-300 focus:outline-none"
              defaultValue={`${parsed.merchant} - ${parsed.category}`}
              onBlur={(e) => {
                const parts = e.target.value.split(" - ");
                onParsedChange({ ...parsed, merchant: parts[0] ?? parsed.merchant, category: parts[1] ?? parsed.category });
                setEditingMerchant(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
            />
          ) : (
            <button className="text-left" onClick={() => setEditingMerchant(true)} title="Tap to edit">
              <p className="mt-1 text-xs text-zinc-400">
                {parsed.merchant} — {parsed.category}
              </p>
            </button>
          )}
        </div>
        <Pill green>{Math.round(parsed.confidence * 100)}%</Pill>
      </div>
      {parsed.debt_records.length > 0 && (
        <div className="grid gap-2">
          {parsed.debt_records.map((debt) => (
            <div key={debt.name} className="flex items-center gap-2">
              <Avatar name={debt.name} small />
              <span className="flex-1 text-xs font-bold">{debt.name}</span>
              <input
                className="w-[72px] rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-right text-xs font-black text-[#22D3EE] focus:outline-none focus:ring-1 focus:ring-[#22D3EE]"
                defaultValue={debt.amount}
                type="number"
                onBlur={(e) => updateDebtAmount(debt.name, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
              />
            </div>
          ))}
          {parsed.debt_records.every(d => d.amount === parsed.debt_records[0].amount) ? (
            <em className="text-right text-xs font-black not-italic text-[#22D3EE]">
              {formatMoney(parsed.per_person)} each
            </em>
          ) : (
            <em className="text-right text-xs font-black not-italic text-[#22D3EE]">
              {formatMoney(parsed.debt_records.reduce((s, d) => s + d.amount, 0))} owed to you
            </em>
          )}
        </div>
      )}
      <button className={primaryButton("w-full")} onClick={onSave} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />}
        Confirm and save
      </button>
    </div>
  );
}
