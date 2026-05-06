import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { formatSenToMyr, parseMyrToSen, splitSenByPercentages } from '@/lib/finance/money'

export async function POST(req: NextRequest) {
  try {
    const { userId, amount } = await req.json()
    if (!userId || !amount) {
      return NextResponse.json({ error: 'userId and amount are required' }, { status: 400 })
    }

    const buckets = await prisma.bucket.findMany({ where: { userId } })
    if (!buckets.length) {
      return NextResponse.json({ error: 'No buckets configured for user' }, { status: 404 })
    }

    const amountSen = parseMyrToSen(String(amount))
    const amountMyr = Number(formatSenToMyr(amountSen))
    const percentages = buckets.map(bucket => bucket.percentage)
    const shares = splitSenByPercentages(amountSen, percentages)

    const allocations = []
    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i]
      const allocated = Number(formatSenToMyr(shares[i]))
      const updated = await prisma.bucket.update({
        where: { id: bucket.id },
        data: { balance: { increment: allocated } },
      })
      allocations.push({
        bucketId: bucket.id,
        bucketName: bucket.name,
        type: bucket.type,
        percentage: bucket.percentage,
        amount: allocated,
        newBalance: Number(updated.balance),
      })
    }

    await prisma.transaction.create({
      data: {
        userId,
        amount: amountMyr,
        category: 'Income',
        merchant: 'Salary',
        source: 'salary',
      },
    })

    // Credit the user's wallet
    await prisma.ledgerAccount.update({
      where: { userId },
      data: { balanceSen: { increment: amountSen } },
    })

    return NextResponse.json({ allocations })
  } catch (err) {
    console.error('[arus]', err)
    return NextResponse.json({ error: 'Arus allocation failed' }, { status: 500 })
  }
}
