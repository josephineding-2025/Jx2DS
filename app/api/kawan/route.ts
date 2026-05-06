import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSquadsState, toChallengeState } from "@/lib/demo/state";
import { updateStreak } from "@/lib/streak";

type ChallengeActionBody = {
  challengeId: string;
  date: string;
  completed: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId, date, completed } = (await req.json()) as ChallengeActionBody;

    if (!challengeId || !date || completed === undefined) {
      return NextResponse.json(
        { error: "challengeId, date and completed are required" },
        { status: 400 },
      );
    }

    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Upsert the completion record with the provided completed value
    await prisma.challengeCompletion.upsert({
      where: { challengeId_userId_date: { challengeId, userId, date: new Date(date) } },
      create: { challengeId, userId, date: new Date(date), completed },
      update: { completed },
    });

    // Apply penalty only when breaking the challenge
    if (!completed && Number(challenge.penaltyAmount) > 0) {
      await prisma.sharedBucket.updateMany({
        where: { squadId: challenge.squadId },
        data: { balance: { increment: Number(challenge.penaltyAmount) } },
      });
    }

    // Update streak: breaking resets it, completing increments it
    const { milestone } = await updateStreak(userId, challenge.squadId, !completed);

    // Return updated challenge with completions
    const updated = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { completions: { orderBy: { date: "asc" } } },
    });

    return NextResponse.json({
      ok: true,
      penaltyAmount: !completed ? Number(challenge.penaltyAmount) : 0,
      milestone,
      challenge: updated ? toChallengeState(updated) : null,
      squads: await getSquadsState(userId),
    });
  } catch (err) {
    console.error("[kawan]", err);
    return NextResponse.json({ error: "Failed to update challenge" }, { status: 500 });
  }
}
