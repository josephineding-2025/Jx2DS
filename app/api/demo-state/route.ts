import { NextRequest, NextResponse } from "next/server";
import { DEMO_SQUAD_ID, DEMO_USER_ID } from "@/lib/demo/seed";
import { getDemoState } from "@/lib/demo/state";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") ?? DEMO_USER_ID;
    const squadId = searchParams.get("squadId") ?? DEMO_SQUAD_ID;
    const state = await getDemoState(userId, squadId);

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
