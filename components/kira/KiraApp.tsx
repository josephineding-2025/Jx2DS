"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
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
import { EditSplitSheet } from "./sheets/EditSplitSheet";
import { ReceiptSheet } from "./sheets/ReceiptSheet";
import { TransferSheet } from "./sheets/TransferSheet";
import { VoiceSheet } from "./sheets/VoiceSheet";
import { RewindLoadingOverlay, RewindStoryOverlay } from "./RewindStory";

type ApiError = { error?: string };
type DemoStatePatch = Partial<
  Pick<
    DemoState,
    | "walletBalanceSen"
    | "transactions"
    | "debts"
    | "buckets"
    | "musimEvents"
    | "squads"
    | "transfers"
  >
>;

async function readJson<T>(res: Response) {
  return (await res.json()) as T & ApiError;
}

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
  const [editSplitOpen, setEditSplitOpen] = useState(false);

  // Cermin slider state — lifted so Rewind can pre-fill them
  const [cerminSavings, setCerminSavings] = useState(0);
  const [cerminFood, setCerminFood] = useState(0);
  const [cerminTransport, setCerminTransport] = useState(0);

  // Rewind state
  const [rewindOpen, setRewindOpen] = useState(false);
  const [rewindLoading, setRewindLoading] = useState(false);
  const [rewindStory, setRewindStory] = useState<RewindStory | null>(null);

  const router = useRouter();

  const applyPatch = useCallback((patch: DemoStatePatch) => {
    setData((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  }, []);

  const seed = useCallback(async () => {
    setBusy("seed");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const result = await readJson<{ state: DemoState | null }>(res);
      if (!res.ok) throw new Error(result.error ?? "Seed failed");
      setData(result.state);
      flash("Account ready");
    } finally {
      setBusy(null);
    }
  }, [flash]);

  const saveExpense = useCallback(
    async (expense: ParsedExpense, source: "voice" | "receipt") => {
      setBusy(`save-${source}`);
      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source, expense }),
        });
        const result = await readJson<DemoStatePatch & { challengeViolated?: boolean; violatedChallengeNames?: string[] }>(res);
        if (!res.ok) throw new Error(result.error ?? "Save failed");
        applyPatch(result);
        setSheet(null);
        setSheetKey((k) => k + 1);
        setActiveTab("duit");
        if (result.challengeViolated && result.violatedChallengeNames?.length) {
          flash(`Challenge broken: ${result.violatedChallengeNames.join(", ")} — penalty applied`);
        } else {
          flash(source === "voice" ? "Voice expense saved" : "Receipt saved");
        }
      } finally {
        setBusy(null);
      }
    },
    [applyPatch, flash],
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
        const result = await readJson<
          DemoStatePatch & {
            matched: boolean;
            debtRecordId: string | null;
            debtorName: string | null;
            context: string | null;
            delta: number | null;
            remainingBalance: number | null;
          }
        >(res);
        if (!res.ok) throw new Error(result.error ?? "Reconcile failed");
        applyPatch(result);
        flash(result.matched ? `${name} repayment matched` : "No debt matched");
      } finally {
        setBusy(null);
      }
    },
    [applyPatch, flash],
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
      const result = await readJson<DemoStatePatch>(res);
      if (!res.ok) throw new Error(result.error ?? "Arus failed");
      applyPatch(result);
      flash("Salary split into buckets");
      window.setTimeout(() => setSalaryPulse(false), 1800);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Arus failed");
    } finally {
      setSalaryPulse(false);
      setBusy(null);
    }
  }, [applyPatch, data?.user.income, flash]);

  const saveSplit = useCallback(
    async (patches: { id: string; percentage: number }[]) => {
      setBusy("split");
      try {
        const res = await fetch("/api/arus", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buckets: patches }),
        });
        const result = await readJson<DemoStatePatch>(res);
        if (!res.ok) throw new Error(result.error ?? "Update failed");
        applyPatch(result);
        setEditSplitOpen(false);
        flash("Split updated");
      } finally {
        setBusy(null);
      }
    },
    [applyPatch, flash],
  );

  const challengeAction = useCallback(
    async (challengeId: string, completed: boolean, penaltyAmount: number) => {
      setBusy("challenge");
      try {
        const d = new Date();
        const today = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
        const res = await fetch("/api/kawan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId, date: today, completed }),
        });
        const result = await readJson<DemoStatePatch & { milestone?: number }>(res);
        if (!res.ok)
          throw new Error(result.error ?? "Challenge update failed");
        applyPatch(result);
        if (result.milestone) {
          flash(`Day ${result.milestone} streak! Your squad can see your milestone.`);
        } else if (completed) {
          flash("Marked as done for today!");
        } else {
          flash(
            penaltyAmount > 0
              ? `RM${penaltyAmount} added to the Bali Trip fund`
              : "Marked as broken",
          );
        }
      } catch (err) {
        flash(err instanceof Error ? err.message : "Challenge update failed");
      } finally {
        setBusy(null);
      }
    },
    [applyPatch, flash],
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
        const result = await readJson<DemoStatePatch>(res);
        if (!res.ok) throw new Error(result.error ?? "Contribute failed");
        applyPatch(result);
        setContributeSheet(null);
        flash(`RM${amount} added to the fund`);
      } finally {
        setBusy(null);
      }
    },
    [applyPatch, flash],
  );

  const toggleMusimAutoSave = useCallback(
    async (eventId: string, enabled: boolean) => {
      try {
        const res = await fetch("/api/musim/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, enabled }),
        });
        const result = await readJson<DemoStatePatch & { autoSaveResult?: { processed: number; totalDeducted: number } }>(res);
        if (!res.ok) throw new Error(result.error ?? "Toggle failed");
        applyPatch(result);
        if (enabled && result.autoSaveResult && result.autoSaveResult.processed > 0) {
          flash(`Auto-save on — RM${result.autoSaveResult.totalDeducted.toFixed(2)} moved to savings today`);
        } else {
          flash(enabled ? "Auto-save enabled" : "Auto-save disabled");
        }
      } catch {
        flash("Failed to update setting");
      }
    },
    [applyPatch, flash],
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
        const result = await readJson<DemoStatePatch>(res);
        if (!res.ok) throw new Error(result.error ?? "Transfer failed");
        applyPatch(result);
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
    [applyPatch, flash],
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
  }, [data, rewindStory, flash]);

  const applyRewindCermin = useCallback((key: string, amount: number) => {
    if (key === "food") setCerminFood(Math.min(Math.round(amount), 400));
    else if (key === "transport")
      setCerminTransport(Math.min(Math.round(amount), 250));
    else if (key === "savings")
      setCerminSavings(Math.min(Math.round(amount), 600));
    setActiveTab("cermin");
  }, []);

  const applyArusCermin = useCallback((monthlySavings: number) => {
    setCerminSavings(Math.min(Math.round(monthlySavings), 600));
    setActiveTab("cermin");
    flash("Arus plan applied to Cermin");
  }, [flash]);

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
                onSignOut={signOut}
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
                debts={data.debts}
                musimEvents={data.musimEvents}
                transactions={data.transactions}
                income={data.user.income}
                salaryDay={data.user.salaryDay}
                salaryPulse={salaryPulse}
                onSimulateSalary={simulateSalary}
                onEditSplit={() => setEditSplitOpen(true)}
                onApplyCermin={applyArusCermin}
                simulating={busy === "salary"}
              />
            )}
            {activeTab === "kawan" && (
              <KawanScreen
                squads={data.squads}
                activeSquadIndex={activeSquadIndex}
                onSelectSquad={setActiveSquadIndex}
                onChallengeAction={challengeAction}
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
          key={transferSheet ? `transfer-${transferSheet.toUserId}-${transferSheet.debtRecordId ?? "direct"}-${transferSheet.amountMyr}` : "transfer-closed"}
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

        <EditSplitSheet
          open={editSplitOpen}
          buckets={data.buckets}
          income={data.user.income}
          busy={busy === "split"}
          onClose={() => setEditSplitOpen(false)}
          onSave={saveSplit}
        />

        {/* SnapIt Rewind overlay */}
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
