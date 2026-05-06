"use client";

import { useMemo } from "react";
import { Check, Loader2, X } from "lucide-react";
import type { DemoState } from "@/lib/demo/state";
import type { SquadMemberItem } from "../constants";
import { DEMO_USER_ID } from "../constants";
import { LeaderRow } from "../cards";
import { Avatar, Pill, Progress, ScreenScroller, SectionHeader } from "../ui";
import { card, cn, formatMoney, secondaryButton } from "../utils";

export function KawanScreen({
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
