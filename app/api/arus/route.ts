import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

    const allocations = []
    for (const bucket of buckets) {
      const allocated = (amount * bucket.percentage) / 100
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
        amount,
        category: 'Income',
        merchant: 'Salary',
        source: 'salary',
      },
    })

    return NextResponse.json({ allocations })
  } catch (err) {
    console.error('[arus]', err)
    return NextResponse.json({ error: 'Arus allocation failed' }, { status: 500 })
  }
}
