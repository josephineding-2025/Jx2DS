import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { processMusimAutoSavesForUser } from "@/lib/finance/musim-autosave";
import { getBucketsState, getMusimEventsState, getTransactionsState } from "@/lib/demo/state";

export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const autoSaveResult = await processMusimAutoSavesForUser(userId);

    const [buckets, transactions, musimEvents] = await Promise.all([
      getBucketsState(userId),
      getTransactionsState(userId),
      getMusimEventsState(userId),
    ]);

    return NextResponse.json({ ok: true, autoSaveResult, buckets, transactions, musimEvents });
  } catch (err) {
    console.error("[musim/autosave]", err);
    return NextResponse.json({ error: "Auto-save failed" }, { status: 500 });
  }
}
