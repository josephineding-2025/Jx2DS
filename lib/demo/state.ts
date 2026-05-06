import { prisma } from "@/lib/db";
import { calcMusimEvents } from "@/lib/finance/musim";
import { DEMO_SQUAD_ID, DEMO_USER_ID } from "@/lib/demo/seed";

export async function getDemoState(
  userId: string = DEMO_USER_ID,
  squadId: string = DEMO_SQUAD_ID,
) {
  const today = new Date();

  const [
    user,
    transactions,
    debts,
    buckets,
    musimRows,
    squad,
    streaks,
    sharedBucket,
    challenge,
    walletAccount,
    transferRows,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 40,
    }),
    prisma.debtRecord.findMany({
      where: { creditorId: userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.bucket.findMany({
      where: { userId },
      orderBy: { percentage: "asc" },
    }),
    prisma.musimEvent.findMany({
      where: { userId },
      orderBy: { eventDate: "asc" },
    }),
    prisma.squad.findUnique({ where: { id: squadId } }),
    prisma.squadStreak.findMany({
      where: { squadId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ savingsRate: "desc" }, { currentStreak: "desc" }],
    }),
    prisma.sharedBucket.findFirst({
      where: { squadId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { contribution: "desc" },
        },
      },
    }),
    prisma.challenge.findFirst({
      where: { squadId, endDate: { gte: today } },
      include: {
        completions: {
          orderBy: { date: "asc" },
        },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.ledgerAccount.findUnique({
      where: { userId },
      select: { balanceSen: true },
    }),
    prisma.transfer.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    }),
  ]);

  if (!user) return null;

  const musimEvents = calcMusimEvents(
    musimRows.map((event) => ({
      id: event.id,
      eventName: event.eventName,
      eventDate: event.eventDate,
      estimatedCost: Number(event.estimatedCost),
      category: event.category,
      autoSaveEnabled: event.autoSaveEnabled,
    })),
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      income: Number(user.income),
      salaryDay: user.salaryDay,
      squadId: user.squadId,
    },
    walletBalanceSen: walletAccount?.balanceSen?.toString() ?? "0",
    transfers: transferRows.map((transfer) => ({
      id: transfer.id,
      fromUserId: transfer.fromUserId,
      fromUserName: transfer.fromUser.name,
      toUserId: transfer.toUserId,
      toUserName: transfer.toUser.name,
      amountSen: transfer.amountSen.toString(),
      direction: transfer.fromUserId === userId ? "sent" : "received",
      status: transfer.status,
      note: transfer.note,
      createdAt: transfer.createdAt.toISOString(),
    })),
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      userId: transaction.userId,
      amount: Number(transaction.amount),
      category: transaction.category,
      merchant: transaction.merchant,
      date: transaction.date.toISOString().split("T")[0],
      source: transaction.source,
      notes: transaction.notes,
      createdAt: transaction.createdAt.toISOString(),
    })),
    debts: debts.map((debt) => ({
      id: debt.id,
      creditorId: debt.creditorId,
      debtorName: debt.debtorName,
      amount: Number(debt.amount),
      context: debt.context,
      transactionId: debt.transactionId,
      status: debt.status as "pending" | "settled" | "partial",
      direction: debt.direction as "owe_me" | "i_owe",
      settledAt: debt.settledAt?.toISOString() ?? null,
      createdAt: debt.createdAt.toISOString(),
    })),
    buckets: buckets.map((bucket) => ({
      id: bucket.id,
      userId: bucket.userId,
      name: bucket.name,
      percentage: bucket.percentage,
      balance: Number(bucket.balance),
      type: bucket.type as "savings" | "bills" | "flex",
    })),
    musimEvents,
    squad: squad
      ? {
          id: squad.id,
          name: squad.name,
        }
      : null,
    squadMembers: streaks.map((streak) => ({
      userId: streak.userId,
      name: streak.user.name,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActive: streak.lastActive?.toISOString().split("T")[0] ?? null,
      savingsRate: Number(streak.savingsRate),
      isCurrentUser: streak.userId === userId,
    })),
    sharedBucket: sharedBucket
      ? {
          id: sharedBucket.id,
          name: sharedBucket.name,
          balance: Number(sharedBucket.balance),
          targetAmount: sharedBucket.targetAmount
            ? Number(sharedBucket.targetAmount)
            : null,
          members: sharedBucket.members.map((member) => ({
            userId: member.userId,
            name: member.user.name,
            contribution: Number(member.contribution),
          })),
        }
      : null,
    challenge: challenge
      ? {
          id: challenge.id,
          squadId: challenge.squadId,
          name: challenge.name,
          description: challenge.description,
          startDate: challenge.startDate.toISOString().split("T")[0],
          endDate: challenge.endDate.toISOString().split("T")[0],
          penaltyAmount: Number(challenge.penaltyAmount),
          completions: challenge.completions.map((c) => ({
            challengeId: c.challengeId,
            userId: c.userId,
            date: c.date.toISOString().split("T")[0],
            completed: c.completed,
          })),
        }
      : null,
  };
}

export type DemoState = NonNullable<Awaited<ReturnType<typeof getDemoState>>>;
