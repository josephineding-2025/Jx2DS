import { prisma } from "@/lib/db";
import { parseMyrToSen, formatSenToMyr, type Sen } from "@/lib/finance/money";

export interface TransferInput {
  fromUserId: string;
  toUserId: string;
  amountMyr: string;
  idempotencyKey: string;
  debtRecordId?: string;
  note?: string;
}

export interface TransferResult {
  id: string;
  fromUserId: string;
  toUserId: string;
  amountMyr: string;
  amountSen: string;
  status: string;
  debtRecordId: string | null;
  note: string | null;
  postedAt: string | null;
  createdAt: string;
}

interface TransferRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  amountSen: Sen;
  status: string;
  debtRecordId: string | null;
  note: string | null;
  postedAt: Date | null;
  createdAt: Date;
}

function toTransferResult(transfer: TransferRecord): TransferResult {
  return {
    id: transfer.id,
    fromUserId: transfer.fromUserId,
    toUserId: transfer.toUserId,
    amountMyr: formatSenToMyr(transfer.amountSen),
    amountSen: transfer.amountSen.toString(),
    status: transfer.status,
    debtRecordId: transfer.debtRecordId,
    note: transfer.note,
    postedAt: transfer.postedAt?.toISOString() ?? null,
    createdAt: transfer.createdAt.toISOString(),
  };
}

export async function createTransfer(input: TransferInput): Promise<TransferResult> {
  const amountSen = parseMyrToSen(input.amountMyr);

  if (amountSen <= 0n) {
    throw new Error("Amount must be positive");
  }

  if (input.fromUserId === input.toUserId) {
    throw new Error("Cannot transfer to self");
  }

  if (!input.idempotencyKey) {
    throw new Error("Idempotency key is required");
  }

  // TODO: add requestHash to schema. For now, an idempotency key match returns
  // the existing transfer without comparing request payloads.
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transfer.findUnique({
      where: {
        fromUserId_idempotencyKey: {
          fromUserId: input.fromUserId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });

    if (existing) {
      return toTransferResult(existing);
    }

    const fromAccount = await tx.ledgerAccount.findUniqueOrThrow({
      where: { userId: input.fromUserId },
    });
    const toAccount = await tx.ledgerAccount.findUniqueOrThrow({
      where: { userId: input.toUserId },
    });

    if (fromAccount.balanceSen < amountSen) {
      throw new Error("Insufficient balance");
    }

    const transfer = await tx.transfer.create({
      data: {
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        amountSen,
        status: "POSTED",
        idempotencyKey: input.idempotencyKey,
        debtRecordId: input.debtRecordId ?? undefined,
        note: input.note ?? undefined,
        postedAt: new Date(),
      },
    });

    await tx.ledgerEntry.createMany({
      data: [
        {
          transferId: transfer.id,
          accountId: fromAccount.id,
          side: "DEBIT",
          amountSen,
          currency: "MYR",
        },
        {
          transferId: transfer.id,
          accountId: toAccount.id,
          side: "CREDIT",
          amountSen,
          currency: "MYR",
        },
      ],
    });

    await tx.ledgerAccount.update({
      where: { id: fromAccount.id },
      data: { balanceSen: { decrement: amountSen } },
    });
    await tx.ledgerAccount.update({
      where: { id: toAccount.id },
      data: { balanceSen: { increment: amountSen } },
    });

    if (input.debtRecordId) {
      await tx.debtRecord.update({
        where: { id: input.debtRecordId },
        data: { status: "settled", settledAt: new Date() },
      });
    }

    return toTransferResult(transfer);
  });
}
