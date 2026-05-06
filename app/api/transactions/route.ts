import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatSenToMyr, parseMyrToSen } from "@/lib/finance/money";
import { getAuthUserId } from "@/lib/auth";
import {
  getDebtsState,
  getTransactionsState,
  getWalletBalanceSen,
  toDebtState,
  toTransactionState,
} from "@/lib/demo/state";
import type { ParsedExpense } from "@/types";

type SaveTransactionBody = {
  source?: "voice" | "receipt" | "manual";
  expense?: ParsedExpense;
};

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
      const transaction = await tx.transaction.create({
        data: {
          userId,
          amount: -amount,
          category: expense.category || "Others",
          merchant: expense.merchant || "Unknown merchant",
          date,
          source,
          notes: expense.notes ?? null,
        },
      });

      const debtRows = expense.debt_records.flatMap((debt) => {
        if (!debt.name) return [];

        const debtAmountSen = parseMyrToSen(String(debt.amount));
        if (debtAmountSen <= 0n) return [];

        return [
          {
            creditorId: userId,
            debtorName: debt.name,
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

      // Debit the user's wallet for the expense amount
      await tx.ledgerAccount.update({
        where: { userId },
        data: { balanceSen: { decrement: amountSen } },
      });

      const debts = await tx.debtRecord.findMany({
        where: { transactionId: transaction.id },
      });

      return {
        transaction: toTransactionState(transaction),
        debts: debts.map(toDebtState),
      };
    });

    const [transactions, debts, walletBalanceSen] = await Promise.all([
      getTransactionsState(userId),
      getDebtsState(userId),
      getWalletBalanceSen(userId),
    ]);

    return NextResponse.json(
      { ...saved, transactions, debts, walletBalanceSen },
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
