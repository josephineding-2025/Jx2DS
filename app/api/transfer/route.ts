import { NextRequest, NextResponse } from "next/server";
import { createTransfer } from "@/lib/finance/transfer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fromUserId, toUserId, amountMyr, idempotencyKey, debtRecordId, note } = body;

    if (!fromUserId || !toUserId || !amountMyr || !idempotencyKey) {
      return NextResponse.json(
        { error: "fromUserId, toUserId, amountMyr, and idempotencyKey are required" },
        { status: 400 },
      );
    }

    // Validate amountMyr is a string
    if (typeof amountMyr !== "string") {
      return NextResponse.json(
        { error: "amountMyr must be a string like \"21.25\"" },
        { status: 400 },
      );
    }

    const result = await createTransfer({
      fromUserId,
      toUserId,
      amountMyr,
      idempotencyKey,
      debtRecordId: debtRecordId ?? undefined,
      note: note ?? undefined,
    });

    return NextResponse.json({ ok: true, transfer: result }, { status: 201 });
  } catch (err) {
    console.error("[transfer]", err);
    const message = err instanceof Error ? err.message : "Transfer failed";
    const status = message.includes("Insufficient") ? 400
      : message.includes("positive") ? 400
      : message.includes("self") ? 400
      : message.includes("Invalid MYR") ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
