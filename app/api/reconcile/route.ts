import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import { getDebtsState, getTransactionsState, getWalletBalanceSen } from '@/lib/demo/state'
import { parseMyrToSen, sanitizeMyr } from '@/lib/finance/money'
import { findBestDebtMatch } from '@/lib/finance/reconcile'

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { senderName, amount } = await req.json()
    if (!senderName || !amount) {
      return NextResponse.json({ error: 'senderName and amount are required' }, { status: 400 })
    }

    const pendingDebts = await prisma.debtRecord.findMany({
      where: { creditorId: userId, status: 'pending' },
      select: { id: true, debtorName: true, amount: true, context: true },
    })

    const debtsForMatch = pendingDebts.map(d => ({
      id: d.id,
      debtorName: d.debtorName,
      amount: Number(d.amount),
      context: d.context,
    }))

    const match = findBestDebtMatch(senderName, amount, debtsForMatch)

    if (!match) {
      return NextResponse.json({
        matched: false,
        debtRecordId: null,
        debtorName: null,
        context: null,
        delta: null,
        remainingBalance: null,
      })
    }

    const sanitizedAmount = sanitizeMyr(amount)
    const delta = match.delta
    const tolerance = Math.max(1, match.amount * 0.1)
    const newStatus = sanitizedAmount >= match.amount - tolerance ? 'settled' : 'partial'

    await prisma.$transaction([
      prisma.debtRecord.update({
        where: { id: match.id },
        data: {
          status: newStatus,
          settledAt: newStatus === 'settled' ? new Date() : null,
          ...(newStatus === 'partial' && { amount: { decrement: sanitizedAmount } }),
        },
      }),
      prisma.transaction.create({
        data: {
          userId,
          amount: sanitizedAmount,
          category: 'Transfer',
          merchant: match.debtorName,
          source: 'transfer',
        },
      }),
      // Credit the user's wallet for the received repayment
      prisma.ledgerAccount.update({
        where: { userId },
        data: { balanceSen: { increment: parseMyrToSen(String(amount)) } },
      }),
    ])

    const [debts, transactions, walletBalanceSen] = await Promise.all([
      getDebtsState(userId),
      getTransactionsState(userId),
      getWalletBalanceSen(userId),
    ])

    return NextResponse.json({
      matched: true,
      debtRecordId: match.id,
      debtorName: match.debtorName,
      context: match.context,
      delta,
      remainingBalance: newStatus === 'partial' ? Number(pendingDebts.find(d => d.id === match.id)!.amount) - sanitizedAmount : 0,
      debts,
      transactions,
      walletBalanceSen,
    })
  } catch (err) {
    console.error('[reconcile]', err)
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
}
