import { parseMyrToSen, formatSenToMyr } from '@/lib/finance/money'

export interface MusimCalc {
  id: string
  eventName: string
  eventDate: string
  estimatedCost: number
  daysRemaining: number
  dailyTarget: number
  category: string
  autoSaveEnabled: boolean
  savedToday: boolean
}

export function calcMusimEvents(
  events: { id: string; eventName: string; eventDate: Date; estimatedCost: number; category: string; autoSaveEnabled?: boolean; lastAutoSaveDate?: Date | null }[],
  fromDate: Date = new Date()
): MusimCalc[] {
  const today = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())

  return events
    .map(e => {
      const msPerDay = 1000 * 60 * 60 * 24
      const daysRemaining = Math.ceil((e.eventDate.getTime() - fromDate.getTime()) / msPerDay)
      const estimatedSen = parseMyrToSen(String(e.estimatedCost))
      const dailyTargetSen = daysRemaining > 0 ? estimatedSen / BigInt(daysRemaining) : 0n
      const dailyTarget = Number(formatSenToMyr(dailyTargetSen))

      let savedToday = false
      if (e.lastAutoSaveDate) {
        const last = new Date(e.lastAutoSaveDate)
        savedToday =
          last.getFullYear() === today.getFullYear() &&
          last.getMonth() === today.getMonth() &&
          last.getDate() === today.getDate()
      }

      return {
        id: e.id,
        eventName: e.eventName,
        eventDate: e.eventDate.toISOString().split('T')[0],
        estimatedCost: Number(formatSenToMyr(estimatedSen)),
        daysRemaining,
        dailyTarget,
        category: e.category,
        autoSaveEnabled: e.autoSaveEnabled ?? false,
        savedToday,
      }
    })
    .filter(e => e.daysRemaining > 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
}
