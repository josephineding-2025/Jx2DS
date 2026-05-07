import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatSenToMyr, parseMyrToSen } from "@/lib/finance/money";
import { getAuthUserId } from "@/lib/auth";
import {
  getBucketsState,
  getDebtsState,
  getSquadsState,
  getTransactionsState,
  getWalletBalanceSen,
  toDebtState,
  toTransactionState,
} from "@/lib/demo/state";
import { updateStreak } from "@/lib/streak";
import { checkChallengeViolation } from "@/lib/claude/haiku";
import type { ParsedExpense } from "@/types";

type SaveTransactionBody = {
  source?: "voice" | "receipt" | "manual";
  expense?: ParsedExpense;
};

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { source = "manual", expense } = (await req.json()) as SaveTransactionBody;

    if (!expense) {
      return NextResponse.json(
        { error: "expense is required" },
        { status: 400 },
      );
    }

    const amountSen = parseMyrToSen(String(expense.amount));
    const amount = Number(formatSenToMyr(amountSen));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "expense.amount must be a positive number" },
        { status: 400 },
      );
    }

    const date = new Date(expense.date);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "expense.date must be a valid date" },
        { status: 400 },
      );
    }

    const saved = await prisma.$transaction(async (tx) => {
      // Personal spend = total paid minus amounts others owe back
      const debtTotal = expense.debt_records.reduce((sum, d) => sum + (d.amount ?? 0), 0);
      const personalAmount = Math.max(0, amount - debtTotal);
      const personalAmountSen = parseMyrToSen(String(personalAmount));

      const transaction = await tx.transaction.create({
        data: {
          userId,
          amount: -personalAmount,
          category: expense.category || "Others",
          merchant: expense.merchant || "Unknown merchant",
          date,
          source,
          notes: expense.notes ?? null,
        },
      });

      const debtRows = expense.debt_records.flatMap((debt) => {
        if (!debt.name && !debt.debtorId) return [];

        const debtAmountSen = parseMyrToSen(String(debt.amount));
        if (debtAmountSen <= 0n) return [];

        return [
          {
            creditorId: userId,
            ...(debt.debtorId
              ? { debtorId: debt.debtorId }
              : { debtorName: debt.name }),
            amount: Number(formatSenToMyr(debtAmountSen)),
            context: expense.merchant,
            transactionId: transaction.id,
            status: "pending",
          },
        ];
      });

      if (debtRows.length) {
        await tx.debtRecord.createMany({ data: debtRows });
      }

      // Wallet debit = full amount paid (float until others repay)
      await tx.ledgerAccount.update({
        where: { userId },
        data: { balanceSen: { decrement: amountSen } },
      });

      // Bucket debit = personal share only
      const category = expense.category || "Others";
      const bucketType = categoryToBucketType(category);
      const bucket = await tx.bucket.findFirst({
        where: { userId, type: bucketType },
      });
      if (bucket) {
        await tx.bucket.update({
          where: { id: bucket.id },
          data: { balance: { decrement: personalAmount } },
        });
      }

      const debts = await tx.debtRecord.findMany({
        where: { transactionId: transaction.id },
        include: { debtor: { select: { name: true } } },
      });

      return {
        transaction: toTransactionState(transaction),
        debts: debts.map(toDebtState),
      };
    });

    // Check active challenges for violations, update streaks accordingly
    const today = localDateStr();
    const todayDate = new Date(today);
    const memberships = await prisma.squadMember.findMany({ where: { userId } });

    const violatedNames: string[] = [];

    await Promise.all(
      memberships.map(async (m) => {
        const challenge = await prisma.challenge.findFirst({
          where: { squadId: m.squadId, startDate: { lte: todayDate }, endDate: { gte: todayDate } },
          orderBy: { startDate: "desc" },
        });

        if (!challenge) {
          await updateStreak(userId, m.squadId, false);
          return;
        }

        // Skip if already broken today
        const alreadyBroken = await prisma.challengeCompletion.findFirst({
          where: { challengeId: challenge.id, userId, date: todayDate, completed: false },
        });
        if (alreadyBroken) return;

        const violated = await checkChallengeViolation(
          { merchant: expense.merchant || "Unknown", amount, category: expense.category || "Others" },
          { name: challenge.name, description: challenge.description },
        );

        if (violated) {
          await prisma.challengeCompletion.upsert({
            where: { challengeId_userId_date: { challengeId: challenge.id, userId, date: todayDate } },
            create: { challengeId: challenge.id, userId, date: todayDate, completed: false },
            update: { completed: false },
          });
          if (Number(challenge.penaltyAmount) > 0) {
            await prisma.sharedBucket.updateMany({
              where: { squadId: challenge.squadId },
              data: { balance: { increment: Number(challenge.penaltyAmount) } },
            });
          }
          await updateStreak(userId, m.squadId, true);
          violatedNames.push(challenge.name);
        } else {
          await updateStreak(userId, m.squadId, false);
        }
      }),
    );

    const [transactions, debts, walletBalanceSen, buckets, squads] = await Promise.all([
      getTransactionsState(userId),
      getDebtsState(userId),
      getWalletBalanceSen(userId),
      getBucketsState(userId),
      getSquadsState(userId),
    ]);

    return NextResponse.json(
      {
        ...saved,
        transactions,
        debts,
        walletBalanceSen,
        buckets,
        squads,
        challengeViolated: violatedNames.length > 0,
        violatedChallengeNames: violatedNames,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[transactions]", err);
    return NextResponse.json(
      { error: "Failed to save transaction" },
      { status: 500 },
    );
  }
}

function categoryToBucketType(category: string): string {
  if (category === "Bills") return "bills";
  return "flex";
}
