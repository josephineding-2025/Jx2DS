import { prisma } from "@/lib/db";
import { calcMusimEvents } from "@/lib/finance/musim";
import { DEMO_USER_ID } from "@/lib/demo/seed";

type DecimalLike = { toString(): string };

type TransactionRecord = {
  id: string;
  userId: string;
  amount: DecimalLike;
  category: string;
  merchant: string | null;
  date: Date;
  source: string;
  notes: string | null;
  createdAt: Date;
};

type DebtRecordRow = {
  id: string;
  creditorId: string;
  debtorId: string | null;
  debtorName: string | null;
  debtor: { name: string } | null;
  amount: DecimalLike;
  context: string | null;
  transactionId: string | null;
  status: string;
  direction: string;
  settledAt: Date | null;
  createdAt: Date;
};

type BucketRecord = {
  id: string;
  userId: string;
  name: string;
  percentage: number;
  balance: DecimalLike;
  type: string;
};

type MusimEventRecord = {
  id: string;
  eventName: string;
  eventDate: Date;
  estimatedCost: DecimalLike;
  category: string;
  autoSaveEnabled: boolean;
  lastAutoSaveDate: Date | null;
};

type SharedBucketRecord = {
  id: string;
  name: string;
  balance: DecimalLike;
  targetAmount: DecimalLike | null;
  members: Array<{
    userId: string;
    contribution: DecimalLike;
    user: { name: string };
  }>;
};

type ChallengeRecord = {
  id: string;
  squadId: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  penaltyAmount: DecimalLike;
  completions: Array<{
    challengeId: string;
    userId: string;
    date: Date;
    completed: boolean;
  }>;
};

type TransferRecord = {
  id: string;
  fromUserId: string;
  fromUser: { name: string };
  toUserId: string;
  toUser: { name: string };
  amountSen: bigint;
  status: string;
  note: string | null;
  createdAt: Date;
};

export function toTransactionState(transaction: TransactionRecord) {
  return {
    id: transaction.id,
    userId: transaction.userId,
    amount: Number(transaction.amount),
    category: transaction.category,
    merchant: transaction.merchant,
    date: transaction.date.toISOString().split("T")[0],
    source: transaction.source,
    notes: transaction.notes,
    createdAt: transaction.createdAt.toISOString(),
  };
}

export function toDebtState(debt: DebtRecordRow) {
  return {
    id: debt.id,
    creditorId: debt.creditorId,
    debtorId: debt.debtorId,
    debtorName: debt.debtor?.name ?? debt.debtorName ?? "Unknown",
    amount: Number(debt.amount),
    context: debt.context,
    transactionId: debt.transactionId,
    status: debt.status as "pending" | "settled" | "partial",
    direction: debt.direction as "owe_me" | "i_owe",
    settledAt: debt.settledAt?.toISOString() ?? null,
    createdAt: debt.createdAt.toISOString(),
  };
}

export function toBucketState(bucket: BucketRecord) {
  return {
    id: bucket.id,
    userId: bucket.userId,
    name: bucket.name,
    percentage: bucket.percentage,
    balance: Number(bucket.balance),
    type: bucket.type as "savings" | "bills" | "flex",
  };
}

export function toMusimEventState(event: MusimEventRecord) {
  return calcMusimEvents([
    {
      id: event.id,
      eventName: event.eventName,
      eventDate: event.eventDate,
      estimatedCost: Number(event.estimatedCost),
      category: event.category,
      autoSaveEnabled: event.autoSaveEnabled,
      lastAutoSaveDate: event.lastAutoSaveDate,
    },
  ])[0] ?? null;
}

export function toSharedBucketState(bucket: SharedBucketRecord) {
  return {
    id: bucket.id,
    name: bucket.name,
    balance: Number(bucket.balance),
    targetAmount: bucket.targetAmount ? Number(bucket.targetAmount) : null,
    members: bucket.members.map((member) => ({
      userId: member.userId,
      name: member.user.name,
      contribution: Number(member.contribution),
    })),
  };
}

export function toChallengeState(challenge: ChallengeRecord) {
  return {
    id: challenge.id,
    squadId: challenge.squadId,
    name: challenge.name,
    description: challenge.description,
    startDate: challenge.startDate.toISOString().split("T")[0],
    endDate: challenge.endDate.toISOString().split("T")[0],
    penaltyAmount: Number(challenge.penaltyAmount),
    completions: challenge.completions.map((completion) => ({
      challengeId: completion.challengeId,
      userId: completion.userId,
      date: completion.date.toISOString().split("T")[0],
      completed: completion.completed,
    })),
  };
}

export function toTransferState(transfer: TransferRecord, userId: string) {
  return {
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
  };
}

export async function getWalletBalanceSen(userId: string) {
  const walletAccount = await prisma.ledgerAccount.findUnique({
    where: { userId },
    select: { balanceSen: true },
  });

  return walletAccount?.balanceSen?.toString() ?? "0";
}

export async function getTransactionsState(userId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 40,
  });

  return transactions.map(toTransactionState);
}

export async function getDebtsState(userId: string) {
  const [oweMeDebts, iOweDebts] = await Promise.all([
    prisma.debtRecord.findMany({
      where: { creditorId: userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { debtor: { select: { name: true } } },
    }),
    prisma.debtRecord.findMany({
      where: { debtorId: userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { creditor: { select: { name: true } } },
    }),
  ]);

  return [
    ...oweMeDebts.map(toDebtState),
    ...iOweDebts.map((debt) => ({
      id: debt.id,
      creditorId: debt.creditorId,
      debtorId: debt.debtorId,
      debtorName: debt.creditor.name,
      amount: Number(debt.amount),
      context: debt.context,
      transactionId: debt.transactionId,
      status: debt.status as "pending" | "settled" | "partial",
      direction: "i_owe" as const,
      settledAt: debt.settledAt?.toISOString() ?? null,
      createdAt: debt.createdAt.toISOString(),
    })),
  ];
}

export async function getBucketsState(userId: string) {
  const buckets = await prisma.bucket.findMany({
    where: { userId },
    orderBy: { percentage: "asc" },
  });

  return buckets.map(toBucketState);
}

export async function getMusimEventsState(userId: string) {
  const events = await prisma.musimEvent.findMany({
    where: { userId },
    orderBy: { eventDate: "asc" },
  });

  return calcMusimEvents(
    events.map((event) => ({
      id: event.id,
      eventName: event.eventName,
      eventDate: event.eventDate,
      estimatedCost: Number(event.estimatedCost),
      category: event.category,
      autoSaveEnabled: event.autoSaveEnabled,
      lastAutoSaveDate: event.lastAutoSaveDate,
    })),
  );
}

export async function getTransfersState(userId: string) {
  const transfers = await prisma.transfer.findMany({
    where: {
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
  });

  return transfers.map((transfer) => toTransferState(transfer, userId));
}

function getLastSalaryDay(salaryDay: number | null, today: Date): Date {
  const day = salaryDay ?? 1;
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), day);
  if (thisMonth <= today) return thisMonth;
  return new Date(today.getFullYear(), today.getMonth() - 1, day);
}

export async function getSquadsState(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const squadMemberships = await prisma.squadMember.findMany({
    where: { userId },
    select: { squadId: true },
  });
  const squadIds = squadMemberships.map((membership) => membership.squadId);

  const squadRows = await prisma.squad.findMany({
    where: { id: { in: squadIds } },
  });

  return Promise.all(
    squadRows.map(async (squad) => {
      const [streaks, sharedBucket, challenge] = await Promise.all([
        prisma.squadStreak.findMany({
          where: { squadId: squad.id },
          include: {
            user: { select: { id: true, name: true, income: true, salaryDay: true } },
          },
        }),
        prisma.sharedBucket.findFirst({
          where: { squadId: squad.id },
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
          where: { squadId: squad.id, endDate: { gte: today } },
          include: {
            completions: {
              orderBy: { date: "asc" },
            },
          },
          orderBy: { startDate: "desc" },
        }),
      ]);

      // Per-member savings rate: savings deposited this cycle / income
      const membersWithRate = await Promise.all(
        streaks.map(async (streak) => {
          const cycleStart = getLastSalaryDay(streak.user.salaryDay, today);
          const [salarySaved, musimSaved] = await Promise.all([
            prisma.transaction.aggregate({
              where: { userId: streak.userId, source: "salary_savings", date: { gte: cycleStart } },
              _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
              where: { userId: streak.userId, source: "musim", date: { gte: cycleStart } },
              _sum: { amount: true },
            }),
          ]);
          const totalSaved =
            Number(salarySaved._sum.amount ?? 0) +
            Math.abs(Number(musimSaved._sum.amount ?? 0));
          const income = Number(streak.user.income);
          const savingsRate = income > 0 ? Math.min(100, (totalSaved / income) * 100) : 0;
          return {
            userId: streak.userId,
            name: streak.user.name,
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastActive: streak.lastActive?.toISOString().split("T")[0] ?? null,
            savingsRate: Math.round(savingsRate * 10) / 10,
            isCurrentUser: streak.userId === userId,
          };
        }),
      );

      // Sort by savings rate desc, then streak desc
      membersWithRate.sort(
        (a, b) => b.savingsRate - a.savingsRate || b.currentStreak - a.currentStreak,
      );

      return {
        id: squad.id,
        name: squad.name,
        members: membersWithRate,
        sharedBucket: sharedBucket ? toSharedBucketState(sharedBucket) : null,
        challenge: challenge ? toChallengeState(challenge) : null,
      };
    }),
  );
}

export async function getDemoState(userId: string = DEMO_USER_ID) {
  const [
    user,
    transactions,
    debts,
    buckets,
    musimEvents,
    walletBalanceSen,
    transfers,
    squads,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getTransactionsState(userId),
    getDebtsState(userId),
    getBucketsState(userId),
    getMusimEventsState(userId),
    getWalletBalanceSen(userId),
    getTransfersState(userId),
    getSquadsState(userId),
  ]);

  if (!user) return null;

  return {
    user: {
      id: user.id,
      name: user.name,
      income: Number(user.income),
      salaryDay: user.salaryDay,
    },
    walletBalanceSen,
    transfers,
    transactions,
    debts,
    buckets,
    musimEvents,
    squads,
  };
}

export type DemoState = NonNullable<Awaited<ReturnType<typeof getDemoState>>>;
