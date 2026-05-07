import { NextRequest, NextResponse } from "next/server";
import { processAllMusimAutoSaves } from "@/lib/finance/musim-autosave";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processAllMusimAutoSaves();
    console.log("[cron/musim-autosave]", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/musim-autosave]", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
