import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    if (!(await getAuthUserId())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId, enabled } = (await req.json()) as { eventId: string; enabled: boolean };

    if (!eventId || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "eventId and enabled are required" }, { status: 400 });
    }

    const updated = await prisma.musimEvent.update({
      where: { id: eventId },
      data: { autoSaveEnabled: enabled },
    });

    return NextResponse.json({ ok: true, autoSaveEnabled: updated.autoSaveEnabled });
  } catch (err) {
    console.error("[musim/toggle]", err);
    return NextResponse.json({ error: "Failed to toggle auto-save" }, { status: 500 });
  }
}
