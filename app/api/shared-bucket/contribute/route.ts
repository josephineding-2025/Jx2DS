import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { getSquadsState, getWalletBalanceSen, toSharedBucketState } from "@/lib/demo/state";
import { prisma } from "@/lib/db";
import { parseMyrToSen, sanitizeMyr } from "@/lib/finance/money";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bucketId, amount } = (await req.json()) as { bucketId: string; amount: number };

    if (!bucketId || !amount || amount <= 0) {
      return NextResponse.json({ error: "bucketId and a positive amount are required" }, { status: 400 });
    }

    const sanitizedAmount = sanitizeMyr(amount);

    await prisma.$transaction([
      prisma.sharedBucketMember.upsert({
        where: { bucketId_userId: { bucketId, userId } },
        create: { bucketId, userId, contribution: sanitizedAmount },
        update: { contribution: { increment: sanitizedAmount } },
      }),
      prisma.sharedBucket.update({
        where: { id: bucketId },
        data: { balance: { increment: sanitizedAmount } },
      }),
      // Debit the user's wallet for the contribution amount
      prisma.ledgerAccount.update({
        where: { userId },
        data: { balanceSen: { decrement: parseMyrToSen(String(amount)) } },
      }),
    ]);

    const bucket = await prisma.sharedBucket.findUnique({
      where: { id: bucketId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { contribution: "desc" },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      bucket: bucket ? toSharedBucketState(bucket) : null,
      squads: await getSquadsState(userId),
      walletBalanceSen: await getWalletBalanceSen(userId),
    });
  } catch (err) {
    console.error("[shared-bucket/contribute]", err);
    return NextResponse.json({ error: "Failed to contribute" }, { status: 500 });
  }
}
