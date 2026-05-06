import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSquadsState, toChallengeState } from "@/lib/demo/state";

type ChallengeBreakBody = {
  challengeId: string;
  date: string;
};

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId, date } = (await req.json()) as ChallengeBreakBody;

    if (!challengeId || !date) {
      return NextResponse.json({ error: "challengeId and date are required" }, { status: 400 });
    }

    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Upsert the completion record as broken
    await prisma.challengeCompletion.upsert({
      where: { challengeId_userId_date: { challengeId, userId, date: new Date(date) } },
      create: { challengeId, userId, date: new Date(date), completed: false },
      update: { completed: false },
    });

    // Apply penalty: increment the squad's shared bucket balance
    if (Number(challenge.penaltyAmount) > 0) {
      await prisma.sharedBucket.updateMany({
        where: { squadId: challenge.squadId },
        data: { balance: { increment: Number(challenge.penaltyAmount) } },
      });
    }

    // Return updated challenge with completions
    const updated = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { completions: { orderBy: { date: "asc" } } },
    });

    return NextResponse.json({
      ok: true,
      penaltyAmount: Number(challenge.penaltyAmount),
      challenge: updated ? toChallengeState(updated) : null,
      squads: await getSquadsState(userId),
    });
  } catch (err) {
    console.error("[kawan]", err);
    return NextResponse.json({ error: "Failed to update challenge" }, { status: 500 });
  }
}
