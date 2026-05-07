import { prisma } from "@/lib/db";
import { calcMusimEvents } from "@/lib/finance/musim";

export type AutoSaveResult = {
  processed: number;
  skipped: number;
  totalDeducted: number;
  events: Array<{ eventName: string; amount: number; skipped?: boolean; reason?: string }>;
};

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Process Musim auto-saves for a single user.
 * Deducts each event's daily target from the flex bucket and credits savings.
 * Idempotent per day — skips events already processed today.
 */
export async function processMusimAutoSavesForUser(userId: string): Promise<AutoSaveResult> {
  const today = todayDate();

  const [events, buckets] = await Promise.all([
    prisma.musimEvent.findMany({
      where: { userId, autoSaveEnabled: true },
    }),
    prisma.bucket.findMany({ where: { userId } }),
  ]);

  const flexBucket = buckets.find((b) => b.type === "flex");
  const savingsBucket = buckets.find((b) => b.type === "savings");

  if (!flexBucket || !savingsBucket) {
    return { processed: 0, skipped: events.length, totalDeducted: 0, events: [] };
  }

  const calculated = calcMusimEvents(
    events.map((e) => ({
      id: e.id,
      eventName: e.eventName,
      eventDate: e.eventDate,
      estimatedCost: Number(e.estimatedCost),
      category: e.category,
      autoSaveEnabled: e.autoSaveEnabled,
    })),
    today,
  );

  const result: AutoSaveResult = { processed: 0, skipped: 0, totalDeducted: 0, events: [] };
  let currentFlexBalance = Number(flexBucket.balance);

  for (const event of events) {
    const calc = calculated.find((c) => c.id === event.id);

    // Skip if already processed today
    if (event.lastAutoSaveDate) {
      const lastSave = new Date(event.lastAutoSaveDate);
      if (
        lastSave.getFullYear() === today.getFullYear() &&
        lastSave.getMonth() === today.getMonth() &&
        lastSave.getDate() === today.getDate()
      ) {
        result.skipped++;
        result.events.push({ eventName: event.eventName, amount: 0, skipped: true, reason: "already saved today" });
        continue;
      }
    }

    if (!calc || calc.daysRemaining <= 0) {
      result.skipped++;
      result.events.push({ eventName: event.eventName, amount: 0, skipped: true, reason: "event passed" });
      continue;
    }

    const dailyTarget = Math.round(calc.dailyTarget * 100) / 100;

    if (currentFlexBalance < 0.01) {
      result.skipped++;
      result.events.push({ eventName: event.eventName, amount: 0, skipped: true, reason: "insufficient flex balance" });
      continue;
    }

    // Deduct up to daily target, capped by available flex balance
    const deductAmount = Math.min(dailyTarget, currentFlexBalance);
    const deductRounded = Math.round(deductAmount * 100) / 100;

    await prisma.$transaction([
      prisma.bucket.update({
        where: { id: flexBucket.id },
        data: { balance: { decrement: deductRounded } },
      }),
      prisma.bucket.update({
        where: { id: savingsBucket.id },
        data: { balance: { increment: deductRounded } },
      }),
      prisma.transaction.create({
        data: {
          userId,
          amount: -deductRounded,
          category: "Musim Auto-Save",
          merchant: event.eventName,
          source: "musim",
          notes: `Auto-save for ${event.eventName} (${calc.daysRemaining} days remaining)`,
        },
      }),
      prisma.musimEvent.update({
        where: { id: event.id },
        data: { lastAutoSaveDate: today },
      }),
    ]);

    currentFlexBalance -= deductRounded;
    result.processed++;
    result.totalDeducted = Math.round((result.totalDeducted + deductRounded) * 100) / 100;
    result.events.push({ eventName: event.eventName, amount: deductRounded });
  }

  return result;
}

/**
 * Process Musim auto-saves for all users with at least one enabled event.
 * Used by the daily cron job.
 */
export async function processAllMusimAutoSaves(): Promise<{ usersProcessed: number; totalDeducted: number }> {
  const userIds = await prisma.musimEvent
    .findMany({
      where: { autoSaveEnabled: true },
      select: { userId: true },
      distinct: ["userId"],
    })
    .then((rows) => rows.map((r) => r.userId));

  let totalDeducted = 0;
  for (const userId of userIds) {
    const result = await processMusimAutoSavesForUser(userId);
    totalDeducted += result.totalDeducted;
  }

  return { usersProcessed: userIds.length, totalDeducted };
}
