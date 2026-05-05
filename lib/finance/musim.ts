export interface MusimCalc {
  id: string
  eventName: string
  eventDate: string
  estimatedCost: number
  daysRemaining: number
  dailyTarget: number
  category: string
}

export function calcMusimEvents(
  events: { id: string; eventName: string; eventDate: Date; estimatedCost: number; category: string }[],
  fromDate: Date = new Date()
): MusimCalc[] {
  return events
    .map(e => {
      const msPerDay = 1000 * 60 * 60 * 24
      const daysRemaining = Math.ceil((e.eventDate.getTime() - fromDate.getTime()) / msPerDay)
      const dailyTarget = daysRemaining > 0 ? e.estimatedCost / daysRemaining : 0
      return {
        id: e.id,
        eventName: e.eventName,
        eventDate: e.eventDate.toISOString().split('T')[0],
        estimatedCost: Number(e.estimatedCost),
        daysRemaining,
        dailyTarget: Math.round(dailyTarget * 100) / 100,
        category: e.category,
      }
    })
    .filter(e => e.daysRemaining > 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
}
