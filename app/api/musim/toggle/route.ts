import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { getMusimEventsState, toMusimEventState } from "@/lib/demo/state";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId, enabled } = (await req.json()) as { eventId: string; enabled: boolean };

    if (!eventId || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "eventId and enabled are required" }, { status: 400 });
    }

    const updated = await prisma.musimEvent.updateManyAndReturn({
      where: { id: eventId, userId },
      data: { autoSaveEnabled: enabled },
    });

    if (updated.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      autoSaveEnabled: updated[0].autoSaveEnabled,
      event: toMusimEventState(updated[0]),
      musimEvents: await getMusimEventsState(userId),
    });
  } catch (err) {
    console.error("[musim/toggle]", err);
    return NextResponse.json({ error: "Failed to toggle auto-save" }, { status: 500 });
  }
}
