import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateRewind } from '@/lib/claude/rewind'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function POST(req: NextRequest) {
  try {
    const { userId } = (await req.json()) as { userId?: string }
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const since = new Date()
    since.setDate(since.getDate() - 30)

    const [user, rawTxs] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { income: true } }),
      prisma.transaction.findMany({
        where: { userId, date: { gte: since }, amount: { lt: 0 } },
        select: { merchant: true, amount: true, category: true, date: true },
        orderBy: { date: 'asc' },
      }),
    ])

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (rawTxs.length < 3) {
      return NextResponse.json({ error: 'Not enough transactions to generate a rewind' }, { status: 422 })
    }

    const transactions = rawTxs.map((tx) => ({
      merchant: tx.merchant ?? 'Unknown',
      amount: Math.abs(Number(tx.amount)),
      category: tx.category,
      date: tx.date.toISOString().split('T')[0],
      day: DAY_NAMES[tx.date.getDay()],
    }))

    const month = new Date().toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
    const story = await generateRewind({ income: Number(user.income), month, transactions })

    return NextResponse.json(story)
  } catch (err) {
    console.error('[rewind]', err)
    return NextResponse.json({ error: 'Failed to generate rewind' }, { status: 500 })
  }
}
