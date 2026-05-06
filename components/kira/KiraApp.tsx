"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeCheck,
  Banknote,
  Camera,
  Car,
  Check,
  CircleDollarSign,
  Coins,
  Eye,
  Flame,
  Gift,
  Home as HomeIcon,
  Loader2,
  Mic,
  Moon,
  PiggyBank,
  ReceiptText,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Target,
  ToggleLeft,
  ToggleRight,
  Utensils,
  Wallet,
  Waves,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { DEMO_SQUAD_ID, DEMO_USER_ID } from "@/lib/demo/seed";
import type { DemoState } from "@/lib/demo/state";
import { buildProjection } from "@/lib/finance/projection";
import type { ParsedExpense } from "@/types";

type TabId = "home" | "duit" | "arus" | "kawan" | "cermin";
type SheetId = "voice" | "receipt" | null;
type TransactionItem = DemoState["transactions"][number];
type DebtItem = DemoState["debts"][number];
type BucketItem = DemoState["buckets"][number];
type MusimItem = DemoState["musimEvents"][number];
type SquadMemberItem = DemoState["squadMembers"][number];

const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "duit", label: "Duit", icon: Wallet },
  { id: "arus", label: "Arus", icon: Waves },
  { id: "kawan", label: "Kawan", icon: Flame },
  { id: "cermin", label: "Cermin", icon: Sparkles },
];

const moneyFormatter = new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const compactFormatter = new Intl.NumberFormat("en-MY", {
  maximumFractionDigits: 0,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function KiraApp({ initialState }: { initialState: DemoState | null }) {
  const [data, setData] = useState<DemoState | null>(initialState);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [sheet, setSheet] = useState<SheetId>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [salaryPulse, setSalaryPulse] = useState(false);
  const [reconcileName, setReconcileName] = useState("");
  const [reconcileAmount, setReconcileAmount] = useState("");
  const [contributeSheet, setContributeSheet] = useState<string | null>(null);
  const [transferSheet, setTransferSheet] = useState<{
    toUserId: string;
    toUserName: string;
    amountMyr: string;
    debtRecordId: string | null;
  } | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(
      `/api/demo-state?userId=${DEMO_USER_ID}&squadId=${DEMO_SQUAD_ID}`,
    );
    if (!res.ok) throw new Error("Could not load account state");
    setData((await res.json()) as DemoState);
  }, []);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  }, []);

  const seed = useCallback(async () => {
    setBusy("seed");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (!res.ok) throw new Error("Seed failed");
      await refresh();
      flash("Account ready");
    } finally {
      setBusy(null);
    }
  }, [flash, refresh]);

  const saveExpense = useCallback(
    async (expense: ParsedExpense, source: "voice" | "receipt") => {
      setBusy(`save-${source}`);
      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: DEMO_USER_ID, source, expense }),
        });
        if (!res.ok) throw new Error("Save failed");
        await refresh();
        setSheet(null);
        setActiveTab("duit");
        flash(source === "voice" ? "Voice expense saved" : "Receipt saved");
      } finally {
        setBusy(null);
      }
    },
    [flash, refresh],
  );

  const reconcile = useCallback(
    async (name: string, amount: number) => {
      setBusy("reconcile");
      try {
        const res = await fetch("/api/reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderName: name, amount, userId: DEMO_USER_ID }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Reconcile failed");
        await refresh();
        flash(result.matched ? `${name} repayment matched` : "No debt matched");
      } finally {
        setBusy(null);
      }
    },
    [flash, refresh],
  );

  const simulateSalary = useCallback(async () => {
    const income = data?.user.income ?? 2800;
    setBusy("salary");
    setSalaryPulse(true);
    try {
      const res = await fetch("/api/arus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: DEMO_USER_ID, amount: income }),
      });
      if (!res.ok) throw new Error("Arus failed");
      await refresh();
      flash("Salary split into buckets");
      window.setTimeout(() => setSalaryPulse(false), 1800);
    } finally {
      setBusy(null);
    }
  }, [data?.user.income, flash, refresh]);

  const breakChallenge = useCallback(
    async (challengeId: string, penaltyAmount: number) => {
      setBusy("challenge");
      try {
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch("/api/kawan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId, userId: DEMO_USER_ID, date: today }),
        });
        if (!res.ok) throw new Error("Challenge update failed");
        await refresh();
        flash(penaltyAmount > 0 ? `RM${penaltyAmount} added to the Bali Trip fund` : "Marked as broken");
      } finally {
        setBusy(null);
      }
    },
    [flash, refresh],
  );

  const contribute = useCallback(
    async (bucketId: string, amount: number) => {
      setBusy("contribute");
      try {
        const res = await fetch("/api/shared-bucket/contribute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucketId, userId: DEMO_USER_ID, amount }),
        });
        if (!res.ok) throw new Error("Contribute failed");
        await refresh();
        setContributeSheet(null);
        flash(`RM${amount} added to the fund`);
      } finally {
        setBusy(null);
      }
    },
    [flash, refresh],
  );

  const toggleMusimAutoSave = useCallback(
    async (eventId: string, enabled: boolean) => {
      try {
        const res = await fetch("/api/musim/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, enabled }),
        });
        if (!res.ok) throw new Error("Toggle failed");
        await refresh();
        flash(enabled ? "Auto-save enabled" : "Auto-save disabled");
      } catch {
        flash("Failed to update setting");
      }
    },
    [flash, refresh],
  );

  const sendTransfer = useCallback(
    async (toUserId: string, amountMyr: string, debtRecordId: string | null, note?: string) => {
      setBusy("transfer");
      try {
        const idempotencyKey = crypto.randomUUID();
        const res = await fetch("/api/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromUserId: DEMO_USER_ID,
            toUserId,
            amountMyr,
            idempotencyKey,
            debtRecordId: debtRecordId || undefined,
            note,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Transfer failed");
        await refresh();
        setTransferSheet(null);
        flash(debtRecordId ? "Debt settled — payment sent" : `RM ${amountMyr} sent`);
      } catch (err) {
        flash(err instanceof Error ? err.message : "Transfer failed");
      } finally {
        setBusy(null);
      }
    },
    [flash, refresh],
  );

  if (!data) {
    return (
      <SeedScreen busy={busy === "seed"} onSeed={seed} />
    );
  }

  return (
    <main className="min-h-svh bg-[#07070D] text-white">
      <div className="relative mx-auto min-h-svh w-full max-w-[430px] overflow-hidden bg-[#0A0A14]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "home" && (
              <HomeScreen
                data={data}
                onOpenSheet={setSheet}
                onToggleMusimAutoSave={toggleMusimAutoSave}
              />
            )}
            {activeTab === "duit" && (
              <DuitScreen
                debts={data.debts}
                transactions={data.transactions}
                transfers={data.transfers}
                squadMembers={data.squadMembers}
                onReconcile={reconcile}
                reconciling={busy === "reconcile"}
                reconcileName={reconcileName}
                reconcileAmount={reconcileAmount}
                onReconcileNameChange={setReconcileName}
                onReconcileAmountChange={setReconcileAmount}
                setTransferSheet={setTransferSheet}
                flash={flash}
              />
            )}
            {activeTab === "arus" && (
              <ArusScreen
                buckets={data.buckets}
                income={data.user.income}
                salaryPulse={salaryPulse}
                onSimulateSalary={simulateSalary}
                simulating={busy === "salary"}
              />
            )}
            {activeTab === "kawan" && (
              <KawanScreen
                members={data.squadMembers}
                squadName={data.squad?.name ?? "KL Kawan Crew"}
                sharedBucket={data.sharedBucket}
                challenge={data.challenge}
                onBreakChallenge={breakChallenge}
                breakingChallenge={busy === "challenge"}
                onContribute={setContributeSheet}
              />
            )}
            {activeTab === "cermin" && <CerminScreen />}
          </motion.div>
        </AnimatePresence>

        <TabBar active={activeTab} onChange={setActiveTab} />

        <VoiceSheet
          open={sheet === "voice"}
          busy={busy === "save-voice"}
          onClose={() => setSheet(null)}
          onSave={(expense) => saveExpense(expense, "voice")}
        />
        <ReceiptSheet
          open={sheet === "receipt"}
          busy={busy === "save-receipt"}
          onClose={() => setSheet(null)}
          onSave={(expense) => saveExpense(expense, "receipt")}
        />
        <ContributeSheet
          open={contributeSheet !== null}
          bucketId={contributeSheet ?? ""}
          busy={busy === "contribute"}
          onClose={() => setContributeSheet(null)}
          onContribute={contribute}
        />
        <TransferSheet
          open={transferSheet !== null}
          busy={busy === "transfer"}
          onClose={() => setTransferSheet(null)}
          onSend={(amountMyr, note) => {
            if (transferSheet) {
              sendTransfer(transferSheet.toUserId, amountMyr, transferSheet.debtRecordId, note);
            }
          }}
          toUserName={transferSheet?.toUserName ?? ""}
          amountMyr={transferSheet?.amountMyr ?? ""}
          debtRecordId={transferSheet?.debtRecordId ?? null}
        />

        <AnimatePresence>
          {notice && (
            <motion.div
              className="absolute bottom-[106px] left-5 right-5 z-[90] flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-300/30 bg-[#16162A]/95 text-sm font-bold shadow-2xl"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
            >
              <BadgeCheck size={16} />
              {notice}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function SeedScreen({
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
        <h1 className="m-0 text-[42px] font-black">Kira</h1>
        <p className="m-0 max-w-[280px] leading-6 text-zinc-400">
          Set up Amirah&apos;s account to explore Kira.
        </p>
        <button className={primaryButton()} onClick={onSeed} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
          Get started
        </button>
      </div>
    </main>
  );
}

function ScreenScroller({ children }: { children: ReactNode }) {
  return (
    <section className="no-scrollbar relative z-10 h-full overflow-y-auto px-[22px] pb-[126px] pt-6">
      {children}
    </section>
  );
}

function Hero({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 bg-[radial-gradient(circle_at_82%_8%,rgba(236,72,153,.55),transparent_12rem),radial-gradient(circle_at_20%_8%,rgba(76,29,149,.95),transparent_15rem),linear-gradient(180deg,#2b0e55_0%,#4c1d95_36%,rgba(131,24,67,.56)_68%,rgba(10,10,20,0)_100%)]",
        compact ? "h-[230px]" : "h-[340px]",
      )}
    />
  );
}

function HomeScreen({
  data,
  onOpenSheet,
  onToggleMusimAutoSave,
}: {
  data: DemoState;
  onOpenSheet: (sheet: SheetId) => void;
  onToggleMusimAutoSave: (eventId: string, enabled: boolean) => void;
}) {
  const balance = Number(data.walletBalanceSen) / 100;
  const savings = data.buckets.find((bucket) => bucket.type === "savings");
  const saveRate = savings?.percentage ?? 0;

  // Compute weekly delta from last 7 days of transactions
  const weeklyDelta = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return data.transactions
      .filter((t) => t.date >= cutoffStr)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [data.transactions]);

  return (
    <>
      <Hero />
      <ScreenScroller>
        <div>
          <p className="mb-2 text-[13px] font-medium text-white/75">{greeting()}, {data.user.name.split(" ")[0]}</p>
          <h1 className="m-0 text-2xl font-black leading-none">Total balance</h1>
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <div className="text-[clamp(34px,10vw,44px)] font-black leading-none tracking-normal">
            {formatMoney(balance)}
          </div>
          <button className={roundButton("size-[30px]")} aria-label="Toggle balance visibility">
            <Eye size={15} />
          </button>
        </div>
        <div className="mt-2.5 flex flex-col gap-1">
          <div className="flex gap-2.5 text-xs text-white/70">
            <span className={weeklyDelta >= 0 ? "text-[#4ADE80]" : "text-[#EC4899]"}>
              {weeklyDelta >= 0 ? "+" : ""}{formatSignedMoney(weeklyDelta)} this week
            </span>
            <span>{saveRate}% saved</span>
          </div>
        </div>

        <div className="my-6 grid grid-cols-2 gap-3">
          <QuickAction icon={Mic} label="Voice Log" onClick={() => onOpenSheet("voice")} />
          <QuickAction icon={Camera} label="Scan Receipt" onClick={() => onOpenSheet("receipt")} />
        </div>

        <SectionHeader title="Musim" action="See all" />
        <div className="no-scrollbar -mr-[22px] flex gap-2.5 overflow-x-auto pr-[22px]">
          {data.musimEvents.slice(0, 3).map((event) => (
            <MusimCard key={event.id} event={event} onToggleAutoSave={onToggleMusimAutoSave} />
          ))}
          {!data.musimEvents.length && (
            <div className={card("min-w-[220px] p-4 text-sm text-zinc-400")}>
              No upcoming events scheduled.
            </div>
          )}
        </div>

        <SectionHeader title="Recent" action="View all" />
        <div className="grid gap-1">
          {data.transactions.slice(0, 5).map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </ScreenScroller>
    </>
  );
}

function DuitScreen({
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
        <Title title="Duit" subtitle="Transactions and money owed" icon={Search} />
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

        {view === "transactions" && (
          <GroupedTransactions transactions={transactions} />
        )}

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

            {/* Reconcile form */}
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
                  setTransferSheet={setTransferSheet}
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

function ArusScreen({
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

function KawanScreen({
  members,
  squadName,
  sharedBucket,
  challenge,
  onBreakChallenge,
  breakingChallenge,
  onContribute,
}: {
  members: SquadMemberItem[];
  squadName: string;
  sharedBucket: DemoState["sharedBucket"];
  challenge: DemoState["challenge"];
  onBreakChallenge: (challengeId: string, penaltyAmount: number) => void;
  breakingChallenge: boolean;
  onContribute: (bucketId: string) => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];

  const challengeStats = useMemo(() => {
    if (!challenge) return null;
    const start = new Date(challenge.startDate + "T00:00:00");
    const end = new Date(challenge.endDate + "T00:00:00");
    const msPerDay = 86400000;
    const totalDays = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
    const myCompletions = challenge.completions.filter(
      (c) => c.userId === DEMO_USER_ID,
    );
    const completedDays = myCompletions.filter((c) => c.completed).length;
    const todayBroken = myCompletions.find(
      (c) => c.date === todayStr && !c.completed,
    );
    const todayHasRecord = myCompletions.some((c) => c.date === todayStr);
    const progress = Math.round((completedDays / totalDays) * 100);
    return { totalDays, completedDays, todayBroken, todayHasRecord, progress };
  }, [challenge, todayStr]);

  return (
    <ScreenScroller>
      <div className="pointer-events-none absolute -bottom-5 -left-32 size-[340px] rounded-full bg-[#7C3AED]/15 blur-[76px]" />
      <div className="pointer-events-none absolute bottom-24 -right-28 size-[270px] rounded-full bg-[#EC4899]/15 blur-[76px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-16 size-[220px] rounded-full bg-[#22D3EE]/10 blur-[76px]" />

      <div className="relative mb-4">
        <h1 className="m-0 text-2xl font-black">Kawan Duit</h1>
        <p className="mt-1 text-[13px] font-medium text-zinc-400">
          {squadName} — {members.length} members
        </p>
      </div>

      <div className={card("relative z-10 p-3 pb-1.5")}>
        <SectionHeader title="Leaderboard" action="May" compact />
        {members.map((member, index) => (
          <LeaderRow key={member.userId} member={member} rank={index + 1} />
        ))}
      </div>

      {challenge && challengeStats && (
        <div className={card("relative z-10 mt-3.5 p-4")}>
          <Pill>Live</Pill>
          <h2 className="mb-1 mt-2.5 text-lg font-black">{challenge.name}</h2>
          <p className="mb-3.5 text-xs text-zinc-400">{challenge.description ?? "Squad challenge"}</p>
          <Progress value={challengeStats.progress} color="pink" />
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: Math.min(challengeStats.totalDays, 7) }).map((_, day) => {
              const date = new Date(challenge.startDate + "T00:00:00");
              date.setDate(date.getDate() + day);
              const dateStr = date.toISOString().split("T")[0];
              const completion = challenge.completions.find(
                (c) => c.date === dateStr && c.userId === DEMO_USER_ID,
              );
              const done = completion?.completed ?? false;
              const broken = completion && !completion.completed;
              return (
                <span
                  key={day}
                  className={cn(
                    "grid size-[34px] place-items-center rounded-full",
                    done && "bg-gradient-to-br from-[#EC4899] to-[#7C3AED]",
                    broken && "border border-[#F59E0B]/50 bg-[#F59E0B]/15 text-[#F59E0B]",
                    !done && !broken && "border border-dashed border-white/20 bg-white/5",
                  )}
                >
                  {done ? <Check size={14} /> : broken ? <X size={13} /> : null}
                </span>
              );
            })}
          </div>
          <p className="mt-2.5 text-[11px] text-zinc-400">
            {challengeStats.completedDays}/{challengeStats.totalDays} days complete
            {challenge.penaltyAmount > 0 && ` · RM${challenge.penaltyAmount} penalty if broken`}
          </p>
          {!challengeStats.todayHasRecord && (
            <button
              className={cn(secondaryButton("mt-3 w-full text-xs"), "border-[#F59E0B]/30 text-[#F59E0B]")}
              onClick={() => onBreakChallenge(challenge.id, challenge.penaltyAmount)}
              disabled={breakingChallenge}
            >
              {breakingChallenge ? <Loader2 className="animate-spin" size={14} /> : <X size={14} />}
              I broke it today
            </button>
          )}
          {challengeStats.todayBroken && (
            <p className="mt-3 text-center text-[11px] font-bold text-[#F59E0B]">
              Already marked broken today
            </p>
          )}
        </div>
      )}

      {sharedBucket && (
        <div className={card("relative z-10 mt-3.5 p-4")}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-lg font-black">{sharedBucket.name}</h2>
            <Pill cyan>Active</Pill>
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <strong className="text-2xl font-black text-[#22D3EE]">
              {formatMoney(sharedBucket.balance)}
            </strong>
            <span className="text-[13px] text-zinc-400">
              / {formatMoney(sharedBucket.targetAmount ?? sharedBucket.balance)}
            </span>
          </div>
          <Progress
            value={
              sharedBucket.targetAmount
                ? (sharedBucket.balance / sharedBucket.targetAmount) * 100
                : 100
            }
            color="cyan"
          />
          <div className="mt-3.5 flex items-center">
            {sharedBucket.members.map((member) => (
              <Avatar
                key={member.userId}
                name={member.name}
                className="-ml-2 first:ml-0 border-2 border-[#16162A]"
                small
              />
            ))}
            <button
              className="ml-auto text-xs font-black text-[#A78BFA]"
              onClick={() => onContribute(sharedBucket.id)}
            >
              Contribute
            </button>
          </div>
        </div>
      )}
    </ScreenScroller>
  );
}

function CerminScreen() {
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [foodCut, setFoodCut] = useState(0);
  const [transportCut, setTransportCut] = useState(0);
  const monthlyDelta = monthlySavings + foodCut + transportCut;
  const series = useMemo(
    () => buildProjection(50, 50 + monthlyDelta, 4200, 23, 85),
    [monthlyDelta],
  );
  const last = series[series.length - 1];
  const delta = last.optimised - last.current;

  return (
    <>
      <Hero compact />
      <ScreenScroller>
        <Title title="Cermin" subtitle="See what your habits are building" icon={Sparkles} />

        <div className="mb-3.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <ProjectionTwin title="Current You" amount={last.current} muted />
          <div className="max-w-[74px] rounded-full border border-[#22D3EE]/40 bg-[#22D3EE]/15 px-2 py-1.5 text-center text-[11px] font-black text-[#22D3EE]">
            +RM {compactFormatter.format(delta)}
          </div>
          <ProjectionTwin title="Optimised You" amount={last.optimised} />
        </div>

        <div className={card("p-3 pb-1")}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="currentLine" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6b7280" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#6b7280" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="optimisedLine" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis
                dataKey="age"
                interval={20}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280", fontSize: 10 }}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "#16162a",
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 12,
                  color: "#fff",
                }}
                formatter={(value) => formatMoney(Number(value))}
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke="#6b7280"
                fill="url(#currentLine)"
                strokeDasharray="4 4"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="optimised"
                stroke="#22d3ee"
                fill="url(#optimisedLine)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid gap-3.5">
          <MoneySlider label="Monthly savings" value={monthlySavings} min={0} max={600} color="cyan" sign="+" onChange={setMonthlySavings} />
          <MoneySlider label="Food and drinks" value={foodCut} min={0} max={400} color="amber" sign="-" onChange={setFoodCut} />
          <MoneySlider label="Transport" value={transportCut} min={0} max={250} color="violet" sign="-" onChange={setTransportCut} />
        </div>
        <p className="mt-3.5 text-center text-[11px] text-zinc-500">
          Assumes 4% p.a. baseline return.
        </p>
      </ScreenScroller>
    </>
  );
}

function VoiceSheet({
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

function ReceiptSheet({
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

function ParsedExpenseCard({
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

function ContributeSheet({
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

function TransferSheet({
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

  useMemo(() => {
    if (open) {
      setAmount(amountMyr);
      setNote("");
    }
  }, [open, amountMyr]);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <SheetHeader label="Send Money" onClose={onClose} />
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

function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[80]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            className="absolute inset-0 w-full bg-[#05050C]/60 backdrop-blur-md"
            onClick={onClose}
            aria-label="Close sheet"
          />
          <motion.div
            className="no-scrollbar absolute inset-x-0 bottom-0 max-h-[84%] overflow-y-auto rounded-t-[32px] border-t border-white/10 bg-gradient-to-b from-[#1A1A2E] to-[#13132A] px-[22px] pb-8 pt-3.5 shadow-[0_-20px_60px_rgba(0,0,0,.6)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-white/20" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SheetHeader({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-black uppercase tracking-[.14em] text-[#A78BFA]">
        {label}
      </span>
      <button className={roundButton("size-[30px]")} onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
    </div>
  );
}

function TabBar({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="absolute bottom-5 left-3 right-3 z-50 grid h-[74px] grid-cols-5 items-center rounded-[28px] border border-white/10 bg-[#16162A]/90 shadow-[0_18px_40px_rgba(0,0,0,.5)] backdrop-blur-xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={cn(
              "grid cursor-pointer justify-items-center gap-1 bg-transparent text-[10px] font-black text-[#7C7C92]",
              active === tab.id && "text-white",
            )}
            onClick={() => onChange(tab.id)}
          >
            <Icon size={21} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button className="grid cursor-pointer justify-items-center gap-2.5 bg-transparent text-[#D9D6F4]" onClick={onClick}>
      <span className="grid size-[58px] place-items-center rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#6D28D9] shadow-[0_12px_24px_rgba(124,58,237,.45),inset_0_-8px_20px_rgba(167,139,250,.22)]">
        <Icon size={23} />
      </span>
      <em className="text-xs font-bold not-italic">{label}</em>
    </button>
  );
}

function Title({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: LucideIcon }) {
  return (
    <header className="mb-4 mt-1 flex items-center justify-between gap-3">
      <div>
        <h1 className="m-0 text-2xl font-black leading-none">{title}</h1>
        <p className="mt-1.5 text-[13px] font-medium text-[#A78BFA]">{subtitle}</p>
      </div>
      <IconButton label={title} icon={Icon} />
    </header>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  spin = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  spin?: boolean;
}) {
  return (
    <button
      className={roundButton("size-[38px]")}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
    >
      <Icon className={spin ? "animate-spin" : ""} size={18} />
    </button>
  );
}

function SectionHeader({ title, action, compact = false }: { title: string; action?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between", compact ? "mb-2" : "mb-2 mt-4")}>
      <h2 className="m-0 text-sm font-black">{title}</h2>
      {action && <span className="text-xs font-black text-[#A78BFA]">{action}</span>}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="mb-4 gap-1 rounded-full border border-white/10 bg-black/35 p-1"
      style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((option) => (
        <button
          key={option.id}
          className={cn(
            "h-9 rounded-full bg-transparent text-[13px] font-black text-zinc-400",
            value === option.id && "bg-gradient-to-b from-[#7C3AED] to-[#6D28D9] text-white shadow-[0_6px_14px_rgba(124,58,237,.4)]",
          )}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MusimCard({ event, onToggleAutoSave }: { event: MusimItem; onToggleAutoSave: (id: string, enabled: boolean) => void }) {
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
    </article>
  );
}

function TransactionRow({ transaction }: { transaction: TransactionItem }) {
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

function GroupedTransactions({ transactions }: { transactions: TransactionItem[] }) {
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

function DebtCard({
  debt,
  iOwe = false,
  squadMembers,
  setTransferSheet,
  flash,
}: {
  debt: DebtItem;
  iOwe?: boolean;
  squadMembers?: SquadMemberItem[];
  setTransferSheet?: (sheet: { toUserId: string; toUserName: string; amountMyr: string; debtRecordId: string | null }) => void;
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
          {!settled && !iOwe && setTransferSheet && (
            <button
              className="rounded-full bg-[#7C3AED]/20 px-3 py-1 text-[11px] font-black text-[#A78BFA] transition-colors hover:bg-[#7C3AED]/30"
              onClick={handlePay}
            >
              Pay
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function BucketCard({ bucket, income }: { bucket: BucketItem; income: number }) {
  const color = bucketColor(bucket.type);
  const maxBalance = income * (bucket.percentage / 100);
  const fill = maxBalance > 0
    ? Math.max(6, Math.min(96, (bucket.balance / maxBalance) * 100))
    : Math.max(6, Math.min(96, bucket.percentage * 1.8));

  return (
    <article
      className={card(
        cn(
          "relative grid min-h-[132px] gap-2.5 p-3 text-white before:absolute before:left-3.5 before:right-3.5 before:top-0 before:h-0.5 before:rounded-full before:bg-current before:shadow-[0_0_12px_currentColor]",
          color === "cyan" && "text-[#22D3EE]",
          color === "violet" && "text-[#A78BFA]",
          color === "amber" && "text-[#F59E0B]",
        ),
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-black text-zinc-200">{bucket.name}</span>
        <em className="text-[11px] font-black not-italic">{bucket.percentage}%</em>
      </div>
      <strong className="text-[15px] font-black text-white">{formatMoney(bucket.balance)}</strong>
      <AnimatedProgress value={fill} color={color} />
      <small className="min-h-6 text-[11px] font-bold text-current">{bucketCaption(bucket)}</small>
    </article>
  );
}

function LeaderRow({ member, rank }: { member: SquadMemberItem; rank: number }) {
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

function ProjectionTwin({ title, amount, muted = false }: { title: string; amount: number; muted?: boolean }) {
  return (
    <div
      className={cn(
        "grid min-w-0 justify-items-center gap-1.5 rounded-[18px] border p-3 text-center",
        muted
          ? "border-white/10 bg-white/[.04]"
          : "border-[#22D3EE]/35 bg-[#22D3EE]/10",
      )}
    >
      <div
        className={cn(
          "grid size-11 place-items-center rounded-full",
          muted
            ? "bg-gradient-to-br from-zinc-600 to-zinc-800 text-zinc-400"
            : "bg-[radial-gradient(circle_at_30%_30%,#67e8f9,#0e7490)] text-white",
        )}
      >
        <Target size={21} />
      </div>
      <span className={cn("text-[11px] font-black", muted ? "text-zinc-400" : "text-[#22D3EE]")}>
        {title}
      </span>
      <strong className="text-lg font-black">{formatMoney(amount)}</strong>
      <small className="text-[11px] text-zinc-400">Age 30</small>
    </div>
  );
}

function MoneySlider({
  label,
  value,
  min,
  max,
  color,
  sign,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  color: "cyan" | "amber" | "violet";
  sign: "+" | "-";
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex justify-between gap-3 text-[13px]">
        <strong>{label}</strong>
        <em
          className={cn(
            "font-black not-italic",
            color === "cyan" && "text-[#22D3EE]",
            color === "amber" && "text-[#F59E0B]",
            color === "violet" && "text-[#A78BFA]",
          )}
        >
          {sign}RM {value}/month
        </em>
      </span>
      <input
        className={cn(
          "w-full",
          color === "cyan" && "accent-[#22D3EE]",
          color === "amber" && "accent-[#F59E0B]",
          color === "violet" && "accent-[#7C3AED]",
        )}
        type="range"
        min={min}
        max={max}
        step={10}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Progress({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <i
        className={cn(
          "block h-full rounded-full",
          color === "cyan" && "bg-[#22D3EE]",
          color === "green" && "bg-[#4ADE80]",
          color === "pink" && "bg-[#EC4899]",
          color === "amber" && "bg-[#F59E0B]",
          color === "violet" && "bg-[#7C3AED]",
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function AnimatedProgress({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <motion.i
        className={cn(
          "block h-full rounded-full",
          color === "cyan" && "bg-[#22D3EE]",
          color === "green" && "bg-[#4ADE80]",
          color === "pink" && "bg-[#EC4899]",
          color === "amber" && "bg-[#F59E0B]",
          color === "violet" && "bg-[#7C3AED]",
        )}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ type: "spring", stiffness: 60, damping: 18 }}
      />
    </div>
  );
}

function Pill({
  children,
  cyan = false,
  green = false,
  amber = false,
}: {
  children: ReactNode;
  cyan?: boolean;
  green?: boolean;
  amber?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-5 items-center rounded-full px-2 text-[10px] font-black uppercase tracking-wide text-white",
        "bg-[#EC4899]",
        cyan && "bg-[#22D3EE]/15 text-[#22D3EE] shadow-[inset_0_0_0_1px_rgba(34,211,238,.36)]",
        green && "bg-[#4ADE80]/15 text-[#4ADE80] shadow-[inset_0_0_0_1px_rgba(74,222,128,.34)]",
        amber && "bg-[#F59E0B]/20 text-[#F59E0B] shadow-[inset_0_0_0_1px_rgba(245,158,11,.36)]",
      )}
    >
      {children}
    </span>
  );
}

function Avatar({ name, small = false, className = "" }: { name: string; small?: boolean; className?: string }) {
  const initial = name.trim()[0]?.toUpperCase() ?? "A";
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full text-white font-black",
        small ? "size-7 text-xs" : "size-[38px] text-[15px]",
        className,
      )}
      style={{ background: avatarColor(name) }}
    >
      {initial}
    </span>
  );
}

function renderMusimIcon(category: string) {
  if (category === "education") return <ShoppingBag size={17} />;
  if (category === "debt") return <Banknote size={17} />;
  return <Moon size={17} />;
}

function renderTransactionIcon(transaction: TransactionItem) {
  if (transaction.source === "salary") return <Coins size={18} />;
  if (transaction.source === "transfer") return <BadgeCheck size={18} />;
  if (transaction.category === "Food & Drinks") return <Utensils size={18} />;
  if (transaction.category === "Transport") return <Car size={18} />;
  if (transaction.category === "Groceries") return <ShoppingBag size={18} />;
  if (transaction.category === "Entertainment") return <Gift size={18} />;
  if (transaction.category === "Bills") return <ReceiptText size={18} />;
  return <CircleDollarSign size={18} />;
}

function formatMoney(value: number) {
  return `RM ${moneyFormatter.format(Math.abs(value))}`;
}

function formatSignedMoney(value: number) {
  const sign = value > 0 ? "+" : "-";
  return `${sign}RM ${moneyFormatter.format(Math.abs(value))}`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function groupTransactions(transactions: TransactionItem[]) {
  const groups = new Map<string, TransactionItem[]>();
  for (const transaction of transactions) {
    const label = groupDateLabel(transaction.date);
    groups.set(label, [...(groups.get(label) ?? []), transaction]);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function groupDateLabel(value: string) {
  const today = new Date();
  const date = new Date(`${value}T00:00:00`);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const delta = Math.round((todayStart.getTime() - date.getTime()) / 86400000);

  if (delta === 0) return "Today";
  if (delta === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function bucketRank(type: string) {
  if (type === "savings") return 1;
  if (type === "bills") return 2;
  return 3;
}

function bucketColor(type: string) {
  if (type === "savings") return "cyan";
  if (type === "bills") return "violet";
  return "amber";
}

function bucketCaption(bucket: BucketItem) {
  if (bucket.type === "savings") return "Bonus 3.55% p.a.";
  if (bucket.type === "bills") return "Auto-pay bills";
  return `Daily RM ${moneyFormatter.format(bucket.balance / 30)}`;
}

function avatarColor(name: string) {
  const palette = [
    "linear-gradient(135deg,#ec4899,#7c3aed)",
    "linear-gradient(135deg,#22d3ee,#0e7490)",
    "linear-gradient(135deg,#f59e0b,#b45309)",
    "linear-gradient(135deg,#7c3aed,#4c1d95)",
    "linear-gradient(135deg,#4ade80,#15803d)",
  ];
  const index = name
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function card(extra = "") {
  return cn("rounded-[22px] border border-white/10 bg-[#16162A]", extra);
}

function roundButton(extra = "") {
  return cn("grid place-items-center rounded-full bg-white/10 text-white", extra);
}

function primaryButton(extra = "") {
  return cn(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#7C3AED] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(124,58,237,.38)] disabled:cursor-not-allowed disabled:opacity-70",
    extra,
  );
}

function secondaryButton(extra = "") {
  return cn(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#A78BFA]/40 bg-white/5 px-4 text-sm font-black text-[#E9E5FB] disabled:cursor-not-allowed disabled:opacity-70",
    extra,
  );
}

async function resizeImage(file: File, maxPx: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}
