import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseMyrToSen, sanitizeMyr } from "@/lib/finance/money";

export async function POST(req: NextRequest) {
  try {
    const { bucketId, userId, amount } = (await req.json()) as { bucketId: string; userId: string; amount: number };

    if (!bucketId || !userId || !amount || amount <= 0) {
      return NextResponse.json({ error: "bucketId, userId, and a positive amount are required" }, { status: 400 });
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
      bucket: bucket
        ? {
            id: bucket.id,
            name: bucket.name,
            balance: Number(bucket.balance),
            targetAmount: bucket.targetAmount ? Number(bucket.targetAmount) : null,
            members: bucket.members.map((m) => ({
              userId: m.userId,
              name: m.user.name,
              contribution: Number(m.contribution),
            })),
          }
        : null,
    });
  } catch (err) {
    console.error("[shared-bucket/contribute]", err);
    return NextResponse.json({ error: "Failed to contribute" }, { status: 500 });
  }
}
