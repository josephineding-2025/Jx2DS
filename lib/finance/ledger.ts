import { prisma } from "@/lib/db";
import { formatSenToMyr, type Sen } from "@/lib/finance/money";

export interface TransferHistoryItem {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amountSen: string;
  amountMyr: string;
  direction: "sent" | "received";
  status: string;
  note: string | null;
  createdAt: string;
}

export async function getWalletBalanceSen(userId: string): Promise<Sen> {
  const account = await prisma.ledgerAccount.findUnique({
    where: { userId },
    select: { balanceSen: true },
  });

  return account?.balanceSen ?? 0n;
}

export async function getWalletBalanceMyr(userId: string): Promise<string> {
  const balanceSen = await getWalletBalanceSen(userId);
  return formatSenToMyr(balanceSen);
}

export async function getTransferHistory(
  userId: string,
  limit = 20,
): Promise<TransferHistoryItem[]> {
  const transfers = await prisma.transfer.findMany({
    where: {
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      fromUser: { select: { name: true } },
      toUser: { select: { name: true } },
    },
  });

  return transfers.map((transfer) => ({
    id: transfer.id,
    fromUserId: transfer.fromUserId,
    fromUserName: transfer.fromUser.name,
    toUserId: transfer.toUserId,
    toUserName: transfer.toUser.name,
    amountSen: transfer.amountSen.toString(),
    amountMyr: formatSenToMyr(transfer.amountSen),
    direction: transfer.fromUserId === userId ? "sent" : "received",
    status: transfer.status,
    note: transfer.note,
    createdAt: transfer.createdAt.toISOString(),
  }));
}

export async function reconcileAccount(userId: string): Promise<{
  cachedBalance: Sen;
  computedBalance: Sen;
  match: boolean;
}> {
  const account = await prisma.ledgerAccount.findUnique({
    where: { userId },
    select: { id: true, balanceSen: true },
  });

  if (!account) {
    return {
      cachedBalance: 0n,
      computedBalance: 0n,
      match: true,
    };
  }

  const [creditAggregate, debitAggregate] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: { accountId: account.id, side: "CREDIT" },
      _sum: { amountSen: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { accountId: account.id, side: "DEBIT" },
      _sum: { amountSen: true },
    }),
  ]);

  const credits = creditAggregate._sum.amountSen ?? 0n;
  const debits = debitAggregate._sum.amountSen ?? 0n;
  const computedBalance = credits - debits;
  const cachedBalance = account.balanceSen;

  return {
    cachedBalance,
    computedBalance,
    match: cachedBalance === computedBalance,
  };
}

export async function ensureWalletAccount(userId: string): Promise<string> {
  const account = await prisma.ledgerAccount.upsert({
    where: { userId },
    create: {
      type: "USER_WALLET",
      userId,
      balanceSen: 0n,
    },
    update: {},
    select: { id: true },
  });

  return account.id;
}
