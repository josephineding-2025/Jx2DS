import { decimalToSen, formatSenToMyr, isNonNegativeSen, parseMyrToSen, subtractSen } from '@/lib/finance/money'

function nameSimilarity(a: string, b: string): number {
  const tokensA = a.toLowerCase().split(/\s+/)
  const tokensB = b.toLowerCase().split(/\s+/)
  const intersection = tokensA.filter(t => tokensB.includes(t))
  return intersection.length / Math.max(tokensA.length, tokensB.length)
}

export function findBestDebtMatch(
  senderName: string,
  amount: number,
  debts: { id: string; debtorName: string; amount: number; context: string | null }[]
): { id: string; debtorName: string; amount: number; context: string | null; delta: number } | null {
  let best: {
    id: string
    debtorName: string
    amount: number
    context: string | null
    score: number
    delta: number
  } | null = null
  const senderSen = parseMyrToSen(String(amount))

  for (const debt of debts) {
    const nameScore = nameSimilarity(senderName, debt.debtorName)
    const debtSen = decimalToSen(debt.amount)
    const tenPercentSen = debtSen / 10n
    const tolerance = tenPercentSen > 100n ? tenPercentSen : 100n
    const deltaSen = subtractSen(senderSen, debtSen)
    const diff = isNonNegativeSen(deltaSen) ? deltaSen : subtractSen(debtSen, senderSen)
    const amountMatch = diff <= tolerance

    if (nameScore > 0.7 && amountMatch) {
      if (!best || nameScore > best.score) {
        best = {
          id: debt.id,
          debtorName: debt.debtorName,
          amount: debt.amount,
          context: debt.context,
          score: nameScore,
          delta: Number(formatSenToMyr(deltaSen)),
        }
      }
    }
  }

  if (!best) return null
  return { id: best.id, debtorName: best.debtorName, amount: best.amount, context: best.context, delta: best.delta }
}
