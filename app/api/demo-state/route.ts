import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { getDemoState } from "@/lib/demo/state";

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const state = await getDemoState(userId);

    if (!state) {
      return NextResponse.json(
        { error: "Demo user was not found. Run POST /api/seed first." },
        { status: 404 },
      );
    }

    return NextResponse.json(state);
  } catch (err) {
    console.error("[demo-state]", err);
    return NextResponse.json(
      { error: "Failed to load demo state" },
      { status: 500 },
    );
  }
}
