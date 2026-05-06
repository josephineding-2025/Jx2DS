import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import { getBucketsState, getTransactionsState, getWalletBalanceSen } from '@/lib/demo/state'
import { formatSenToMyr, parseMyrToSen, splitSenByPercentages } from '@/lib/finance/money'

type BucketPatch = { id: string; percentage: number }

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { buckets: patches } = await req.json() as { buckets: BucketPatch[] }
    if (!Array.isArray(patches) || patches.length === 0) {
      return NextResponse.json({ error: 'buckets array is required' }, { status: 400 })
    }

    const total = patches.reduce((sum, p) => sum + p.percentage, 0)
    if (total !== 100) {
      return NextResponse.json({ error: 'Percentages must sum to 100' }, { status: 400 })
    }

    const existing = await prisma.bucket.findMany({ where: { userId } })
    const existingIds = new Set(existing.map(b => b.id))
    for (const patch of patches) {
      if (!existingIds.has(patch.id)) {
        return NextResponse.json({ error: `Bucket ${patch.id} not found` }, { status: 404 })
      }
    }

    await prisma.$transaction(
      patches.map(patch =>
        prisma.bucket.update({
          where: { id: patch.id },
          data: { percentage: patch.percentage },
        })
      )
    )

    const buckets = await getBucketsState(userId)
    return NextResponse.json({ buckets })
  } catch (err) {
    console.error('[arus PATCH]', err)
    return NextResponse.json({ error: 'Failed to update bucket config' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount } = await req.json()
    if (!amount) {
      return NextResponse.json({ error: 'amount is required' }, { status: 400 })
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

    const [updatedBuckets, transactions, walletBalanceSen] = await Promise.all([
      getBucketsState(userId),
      getTransactionsState(userId),
      getWalletBalanceSen(userId),
    ])

    return NextResponse.json({
      allocations,
      buckets: updatedBuckets,
      transactions,
      walletBalanceSen,
    })
  } catch (err) {
    console.error('[arus]', err)
    return NextResponse.json({ error: 'Arus allocation failed' }, { status: 500 })
  }
}
