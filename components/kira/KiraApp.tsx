"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, LogOut } from "lucide-react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { DemoState } from "@/lib/demo/state";
import type { ParsedExpense, RewindStory } from "@/types";
import type { SheetId, TabId } from "./constants";
import { TabBar } from "./ui";
import { ArusScreen } from "./screens/ArusScreen";
import { CerminScreen } from "./screens/CerminScreen";
import { DuitScreen } from "./screens/DuitScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { KawanScreen } from "./screens/KawanScreen";
import { SeedScreen } from "./screens/SeedScreen";
import { ContributeSheet } from "./sheets/ContributeSheet";
import { ReceiptSheet } from "./sheets/ReceiptSheet";
import { TransferSheet } from "./sheets/TransferSheet";
import { VoiceSheet } from "./sheets/VoiceSheet";
import { RewindLoadingOverlay, RewindStoryOverlay } from "./RewindStory";

export function KiraApp({ initialState }: { initialState: DemoState | null }) {
  const [data, setData] = useState<DemoState | null>(initialState);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [activeSquadIndex, setActiveSquadIndex] = useState(0);
  const [sheet, setSheet] = useState<SheetId>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [salaryPulse, setSalaryPulse] = useState(false);
  const [reconcileName, setReconcileName] = useState("");
  const [reconcileAmount, setReconcileAmount] = useState("");
  const [contributeSheet, setContributeSheet] = useState<string | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [transferSheet, setTransferSheet] = useState<{
    toUserId: string;
    toUserName: string;
    amountMyr: string;
    debtRecordId: string | null;
  } | null>(null);

  // Cermin slider state — lifted so Rewind can pre-fill them
  const [cerminSavings, setCerminSavings] = useState(0);
  const [cerminFood, setCerminFood] = useState(0);
  const [cerminTransport, setCerminTransport] = useState(0);

  // Rewind state
  const [rewindOpen, setRewindOpen] = useState(false);
  const [rewindLoading, setRewindLoading] = useState(false);
  const [rewindStory, setRewindStory] = useState<RewindStory | null>(null);

  const router = useRouter();

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/demo-state`);
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
          body: JSON.stringify({ source, expense }),
        });
        if (!res.ok) throw new Error("Save failed");
        await refresh();
        setSheet(null);
        setSheetKey((k) => k + 1);
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
          body: JSON.stringify({ senderName: name, amount }),
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
        body: JSON.stringify({ amount: income }),
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
          body: JSON.stringify({ challengeId, date: today }),
        });
        if (!res.ok) throw new Error("Challenge update failed");
        await refresh();
        flash(
          penaltyAmount > 0
            ? `RM${penaltyAmount} added to the Bali Trip fund`
            : "Marked as broken",
        );
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
          body: JSON.stringify({ bucketId, amount }),
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
    async (
      toUserId: string,
      amountMyr: string,
      debtRecordId: string | null,
      note?: string,
    ) => {
      setBusy("transfer");
      try {
        const idempotencyKey = crypto.randomUUID();
        const res = await fetch("/api/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
        flash(
          debtRecordId ? "Debt settled — payment sent" : `RM ${amountMyr} sent`,
        );
      } catch (err) {
        flash(err instanceof Error ? err.message : "Transfer failed");
      } finally {
        setBusy(null);
      }
    },
    [flash, refresh],
  );

  const openRewind = useCallback(async () => {
    if (rewindStory) {
      setRewindOpen(true);
      return;
    }
    setRewindLoading(true);
    setRewindOpen(true);
    try {
      const res = await fetch("/api/rewind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data?.user.id,
        }),
      });
      if (!res.ok) throw new Error("Rewind failed");
      const story = (await res.json()) as RewindStory;
      setRewindStory(story);
    } catch {
      flash("Could not generate your rewind — try again");
      setRewindOpen(false);
    } finally {
      setRewindLoading(false);
    }
  }, [rewindStory, flash]);

  const applyRewindCermin = useCallback((key: string, amount: number) => {
    if (key === "food") setCerminFood(Math.min(Math.round(amount), 400));
    else if (key === "transport")
      setCerminTransport(Math.min(Math.round(amount), 250));
    else if (key === "savings")
      setCerminSavings(Math.min(Math.round(amount), 600));
    setActiveTab("cermin");
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/auth/signout", { method: "POST" });
    router.push("/login");
  }, [router]);

  if (!data) {
    return <SeedScreen busy={busy === "seed"} onSeed={seed} />;
  }

  return (
    <main className="min-h-svh bg-[#07070D] text-white">
      <div className="relative mx-auto min-h-svh w-full max-w-[430px] overflow-hidden bg-[#0A0A14]">
        <button
          type="button"
          onClick={signOut}
          className="absolute right-4 top-4 z-50 rounded-full bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
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
                onOpenRewind={openRewind}
              />
            )}
            {activeTab === "duit" && (
              <DuitScreen
                debts={data.debts}
                transactions={data.transactions}
                transfers={data.transfers}
                squadMembers={data.squads.flatMap((s) => s.members)}
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
                squads={data.squads}
                activeSquadIndex={activeSquadIndex}
                onSelectSquad={setActiveSquadIndex}
                onBreakChallenge={breakChallenge}
                breakingChallenge={busy === "challenge"}
                onContribute={setContributeSheet}
              />
            )}
            {activeTab === "cermin" && (
              <CerminScreen
                monthlySavings={cerminSavings}
                foodCut={cerminFood}
                transportCut={cerminTransport}
                onMonthlySavingsChange={setCerminSavings}
                onFoodCutChange={setCerminFood}
                onTransportCutChange={setCerminTransport}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <TabBar active={activeTab} onChange={setActiveTab} />

        <VoiceSheet
          key={`voice-${sheetKey}`}
          open={sheet === "voice"}
          busy={busy === "save-voice"}
          onClose={() => setSheet(null)}
          onSave={(expense) => saveExpense(expense, "voice")}
        />
        <ReceiptSheet
          key={`receipt-${sheetKey}`}
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
              sendTransfer(
                transferSheet.toUserId,
                amountMyr,
                transferSheet.debtRecordId,
                note,
              );
            }
          }}
          toUserName={transferSheet?.toUserName ?? ""}
          amountMyr={transferSheet?.amountMyr ?? ""}
          debtRecordId={transferSheet?.debtRecordId ?? null}
        />

        {/* Kira Rewind overlay */}
        <AnimatePresence>
          {rewindOpen && rewindLoading && (
            <RewindLoadingOverlay key="rewind-loading" />
          )}
          {rewindOpen && !rewindLoading && rewindStory && (
            <RewindStoryOverlay
              key="rewind-story"
              story={rewindStory}
              onClose={() => setRewindOpen(false)}
              onApplyCermin={applyRewindCermin}
            />
          )}
        </AnimatePresence>

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
