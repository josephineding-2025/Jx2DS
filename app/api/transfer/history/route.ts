import { NextRequest, NextResponse } from "next/server";
import { getTransferHistory } from "@/lib/finance/ledger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 },
      );
    }

    const transfers = await getTransferHistory(userId, limit);
    return NextResponse.json({ transfers });
  } catch (err) {
    console.error("[transfer/history]", err);
    return NextResponse.json(
      { error: "Failed to load transfer history" },
      { status: 500 },
    );
  }
}
