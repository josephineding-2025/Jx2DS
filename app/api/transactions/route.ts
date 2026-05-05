import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ParsedExpense } from "@/types";

type SaveTransactionBody = {
  userId?: string;
  source?: "voice" | "receipt" | "manual";
  expense?: ParsedExpense;
};

export async function POST(req: NextRequest) {
  try {
    const { userId, source = "manual", expense } =
      (await req.json()) as SaveTransactionBody;

    if (!userId || !expense) {
      return NextResponse.json(
        { error: "userId and expense are required" },
        { status: 400 },
      );
    }

    const amount = Number(expense.amount);
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

      const debtRows = expense.debt_records
        .filter((debt) => debt.name && Number(debt.amount) > 0)
        .map((debt) => ({
          creditorId: userId,
          debtorName: debt.name,
          amount: Number(debt.amount),
          context: expense.merchant,
          transactionId: transaction.id,
          status: "pending",
        }));

      if (debtRows.length) {
        await tx.debtRecord.createMany({ data: debtRows });
      }

      const debts = await tx.debtRecord.findMany({
        where: { transactionId: transaction.id },
      });

      return {
        transaction: {
          id: transaction.id,
          userId: transaction.userId,
          amount: Number(transaction.amount),
          category: transaction.category,
          merchant: transaction.merchant,
          date: transaction.date.toISOString().split("T")[0],
          source: transaction.source,
          createdAt: transaction.createdAt.toISOString(),
        },
        debts: debts.map((debt) => ({
          id: debt.id,
          debtorName: debt.debtorName,
          amount: Number(debt.amount),
          status: debt.status,
        })),
      };
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("[transactions]", err);
    return NextResponse.json(
      { error: "Failed to save transaction" },
      { status: 500 },
    );
  }
}
