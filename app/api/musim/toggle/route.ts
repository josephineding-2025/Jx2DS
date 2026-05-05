import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
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
