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

  for (const debt of debts) {
    const nameScore = nameSimilarity(senderName, debt.debtorName)
    const amountDiff = Math.abs(amount - debt.amount)
    const amountMatch = amountDiff <= Math.max(1, debt.amount * 0.1)

    if (nameScore > 0.7 && amountMatch) {
      if (!best || nameScore > best.score) {
        best = {
          id: debt.id,
          debtorName: debt.debtorName,
          amount: debt.amount,
          context: debt.context,
          score: nameScore,
          delta: amount - debt.amount,
        }
      }
    }
  }

  if (!best) return null
  return { id: best.id, debtorName: best.debtorName, amount: best.amount, context: best.context, delta: best.delta }
}
