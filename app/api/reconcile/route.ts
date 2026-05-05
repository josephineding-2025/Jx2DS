import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { findBestDebtMatch } from '@/lib/finance/reconcile'

export async function POST(req: NextRequest) {
  try {
    const { senderName, amount, userId } = await req.json()
    if (!senderName || !amount || !userId) {
      return NextResponse.json({ error: 'senderName, amount, userId are required' }, { status: 400 })
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
      return NextResponse.json({ matched: false, debtRecordId: null, debtorName: null, context: null, delta: null, remainingBalance: null })
    }

    const delta = match.delta
    const newStatus = Math.abs(delta) <= 0.01 ? 'settled' : delta < 0 ? 'partial' : 'settled'

    await prisma.debtRecord.update({
      where: { id: match.id },
      data: {
        status: newStatus,
        settledAt: newStatus === 'settled' ? new Date() : null,
        ...(newStatus === 'partial' && { amount: { decrement: amount } }),
      },
    })

    return NextResponse.json({
      matched: true,
      debtRecordId: match.id,
      debtorName: match.debtorName,
      context: match.context,
      delta,
      remainingBalance: newStatus === 'partial' ? Number(pendingDebts.find(d => d.id === match.id)!.amount) - amount : 0,
    })
  } catch (err) {
    console.error('[reconcile]', err)
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
}
