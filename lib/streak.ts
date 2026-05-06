import { prisma } from "@/lib/db";

export async function updateStreak(
  userId: string,
  squadId: string,
  broke: boolean,
): Promise<{ newStreak: number; milestone: number | null }> {
  const streak = await prisma.squadStreak.findFirst({ where: { userId, squadId } });
  if (!streak) return { newStreak: 0, milestone: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (broke) {
    await prisma.squadStreak.update({
      where: { id: streak.id },
      data: { currentStreak: 0, lastActive: today, updatedAt: new Date() },
    });
    return { newStreak: 0, milestone: null };
  }

  const last = streak.lastActive ? new Date(streak.lastActive) : null;
  if (last) last.setHours(0, 0, 0, 0);

  // Already counted today
  if (last?.getTime() === today.getTime()) {
    return { newStreak: streak.currentStreak, milestone: null };
  }

  const newStreak =
    last?.getTime() === yesterday.getTime() ? streak.currentStreak + 1 : 1;
  const newLongest = Math.max(newStreak, streak.longestStreak);
  const milestone = ([7, 14, 30] as number[]).includes(newStreak) ? newStreak : null;

  await prisma.squadStreak.update({
    where: { id: streak.id },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActive: today,
      updatedAt: new Date(),
    },
  });

  return { newStreak, milestone };
}
