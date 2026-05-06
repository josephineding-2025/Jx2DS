"use client";

import { Check, ChevronRight, Loader2, X } from "lucide-react";
import type { DemoState } from "@/lib/demo/state";
import type { SquadMemberItem, SquadItem } from "../constants";
import { LeaderRow } from "../cards";
import { Avatar, Pill, Progress, ScreenScroller, SectionHeader } from "../ui";
import { card, cn, formatMoney, secondaryButton } from "../utils";

function localDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function computeChallengeStats(
  activeSquad: SquadItem,
  todayStr: string,
  currentUserId: string,
) {
  const challenge = activeSquad.challenge;
  if (!challenge) return null;

  const start = new Date(challenge.startDate + "T00:00:00");
  const end = new Date(challenge.endDate + "T00:00:00");
  const msPerDay = 86400000;
  const totalDays = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;

  const myCompletions = challenge.completions.filter((c) => c.userId === currentUserId);
  const completedDays = myCompletions.filter((c) => c.completed).length;
  const todayBroken = myCompletions.find((c) => c.date === todayStr && !c.completed);
  const todayDone = myCompletions.find((c) => c.date === todayStr && c.completed);
  const todayHasRecord = myCompletions.some((c) => c.date === todayStr);
  const progress = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  const today = new Date(todayStr + "T00:00:00");
  const elapsedDays = Math.min(
    Math.round((today.getTime() - start.getTime()) / msPerDay) + 1,
    totalDays,
  );
  const totalMembers = activeSquad.members.length;
  const totalPossible = totalMembers * Math.max(elapsedDays, 1);
  const totalGroupCompleted = challenge.completions.filter((c) => c.completed).length;
  const groupRate = totalPossible > 0 ? Math.round((totalGroupCompleted / totalPossible) * 100) : 0;
  const todayMembersCompleted = challenge.completions.filter(
    (c) => c.date === todayStr && c.completed,
  ).length;

  return {
    totalDays,
    completedDays,
    todayBroken,
    todayDone,
    todayHasRecord,
    progress,
    groupRate,
    todayMembersCompleted,
    totalMembers,
  };
}

export function KawanScreen({
  squads,
  activeSquadIndex,
  onSelectSquad,
  onChallengeAction,
  breakingChallenge,
  onContribute,
}: {
  squads: DemoState["squads"];
  activeSquadIndex: number;
  onSelectSquad: (index: number) => void;
  onChallengeAction: (challengeId: string, completed: boolean, penaltyAmount: number) => void;
  breakingChallenge: boolean;
  onContribute: (bucketId: string) => void;
}) {
  const activeSquad = squads[activeSquadIndex] as SquadItem | undefined;
  const todayStr = localDate();
  const currentUserId = activeSquad?.members.find((m) => m.isCurrentUser)?.userId ?? "";
  const challengeStats = activeSquad ? computeChallengeStats(activeSquad, todayStr, currentUserId) : null;

  if (!activeSquad) {
    return (
      <ScreenScroller>
        <p className="text-center text-sm text-zinc-400">No squads yet</p>
      </ScreenScroller>
    );
  }

  return (
    <ScreenScroller>
      <div className="pointer-events-none absolute -bottom-5 -left-32 size-[340px] rounded-full bg-[#7C3AED]/15 blur-[76px]" />
      <div className="pointer-events-none absolute bottom-24 -right-28 size-[270px] rounded-full bg-[#EC4899]/15 blur-[76px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-16 size-[220px] rounded-full bg-[#22D3EE]/10 blur-[76px]" />

      <div className="relative mb-4">
        <h1 className="m-0 text-2xl font-black">Kawan Duit</h1>
        <p className="mt-1 text-[13px] font-medium text-zinc-400">
          {activeSquad.name} — {activeSquad.members.length} members
        </p>
      </div>

      {squads.length > 1 && (
        <div className={card("relative z-10 mb-3.5 flex gap-2 p-2")}>
          {squads.map((squad, idx) => (
            <button
              key={squad.id}
              className={cn(
                "flex flex-1 items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-all",
                idx === activeSquadIndex
                  ? "bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10",
              )}
              onClick={() => onSelectSquad(idx)}
            >
              <div className="min-w-0">
                <span className={cn(
                  "block text-[13px] font-black truncate",
                  idx === activeSquadIndex ? "text-white" : "text-zinc-300",
                )}>
                  {squad.name}
                </span>
                <span className="block text-[11px] font-bold opacity-70">
                  {squad.members.length} members
                </span>
              </div>
              {idx !== activeSquadIndex && (
                <ChevronRight size={14} className="shrink-0 opacity-50" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className={card("relative z-10 p-3 pb-1.5")}>
        <SectionHeader title="Leaderboard" action="May" compact />
        {activeSquad.members.map((member: SquadMemberItem, index: number) => (
          <LeaderRow key={member.userId} member={member} rank={index + 1} />
        ))}
      </div>

      {activeSquad.challenge && challengeStats && (
        <div className={card("relative z-10 mt-3.5 p-4")}>
          <Pill>Live</Pill>
          <h2 className="mb-1 mt-2.5 text-lg font-black">{activeSquad.challenge.name}</h2>
          <p className="mb-3.5 text-xs text-zinc-400">{activeSquad.challenge.description ?? "Squad challenge"}</p>
          <Progress value={challengeStats.progress} color="pink" />
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: Math.min(challengeStats.totalDays, 7) }).map((_, day) => {
              const date = new Date(activeSquad.challenge!.startDate + "T00:00:00");
              date.setDate(date.getDate() + day);
              const dateStr = localDate(date);
              const completion = activeSquad.challenge!.completions.find(
                (c) => c.date === dateStr && c.userId === currentUserId,
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
            {activeSquad.challenge.penaltyAmount > 0 && ` · RM${activeSquad.challenge.penaltyAmount} penalty if broken`}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Group: {challengeStats.groupRate}% completion · {challengeStats.todayMembersCompleted}/{challengeStats.totalMembers} done today
          </p>
          {!challengeStats.todayHasRecord && (
            <div className="mt-3 flex gap-2">
              <button
                className={cn(secondaryButton("flex-1 text-xs"), "border-[#4ADE80]/30 text-[#4ADE80]")}
                onClick={() => onChallengeAction(activeSquad.challenge!.id, true, activeSquad.challenge!.penaltyAmount)}
                disabled={breakingChallenge}
              >
                {breakingChallenge ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                Done today
              </button>
              <button
                className={cn(secondaryButton("flex-1 text-xs"), "border-[#F59E0B]/30 text-[#F59E0B]")}
                onClick={() => onChallengeAction(activeSquad.challenge!.id, false, activeSquad.challenge!.penaltyAmount)}
                disabled={breakingChallenge}
              >
                {breakingChallenge ? <Loader2 className="animate-spin" size={14} /> : <X size={14} />}
                I broke it
              </button>
            </div>
          )}
          {challengeStats.todayDone && (
            <p className="mt-3 text-center text-[11px] font-bold text-[#4ADE80]">
              Completed today
            </p>
          )}
          {challengeStats.todayBroken && (
            <p className="mt-3 text-center text-[11px] font-bold text-[#F59E0B]">
              Already marked broken today
            </p>
          )}
        </div>
      )}

      {activeSquad.sharedBucket && (
        <div className={card("relative z-10 mt-3.5 p-4")}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-lg font-black">{activeSquad.sharedBucket.name}</h2>
            <Pill cyan>Active</Pill>
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <strong className="text-2xl font-black text-[#22D3EE]">
              {formatMoney(activeSquad.sharedBucket.balance)}
            </strong>
            <span className="text-[13px] text-zinc-400">
              / {formatMoney(activeSquad.sharedBucket.targetAmount ?? activeSquad.sharedBucket.balance)}
            </span>
          </div>
          <Progress
            value={
              activeSquad.sharedBucket.targetAmount
                ? (activeSquad.sharedBucket.balance / activeSquad.sharedBucket.targetAmount) * 100
                : 100
            }
            color="cyan"
          />
          <div className="mt-3.5 flex items-center">
            {activeSquad.sharedBucket.members.map((member) => (
              <Avatar
                key={member.userId}
                name={member.name}
                className="-ml-2 first:ml-0 border-2 border-[#16162A]"
                small
              />
            ))}
            <button
              className="ml-auto text-xs font-black text-[#A78BFA]"
              onClick={() => onContribute(activeSquad.sharedBucket!.id)}
            >
              Contribute
            </button>
          </div>
        </div>
      )}
    </ScreenScroller>
  );
}
