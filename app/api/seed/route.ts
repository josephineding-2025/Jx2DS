import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth'
import { prisma } from '@/lib/db'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_USER_IDS = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
]
const DEMO_SQUAD_ID = '00000000-0000-0000-0000-000000000010'
const DEMO_SQUAD_2_ID = '00000000-0000-0000-0000-000000000011'
const DEMO_SHARED_BUCKET_ID = '00000000-0000-0000-0000-000000000020'
const DEMO_SHARED_BUCKET_2_ID = '00000000-0000-0000-0000-000000000021'
const DEMO_CHALLENGE_ID = '00000000-0000-0000-0000-000000000030'
const DEMO_CHALLENGE_2_ID = '00000000-0000-0000-0000-000000000031'

const SQUAD_1_MEMBERS = DEMO_USER_IDS
const SQUAD_2_MEMBERS = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000005',
]

const walletBalances: Record<string, number> = {
  '00000000-0000-0000-0000-000000000001': 222000,
  '00000000-0000-0000-0000-000000000002': 180000,
  '00000000-0000-0000-0000-000000000003': 240000,
  '00000000-0000-0000-0000-000000000004': 150000,
  '00000000-0000-0000-0000-000000000005': 60000,
}

export async function POST() {
  try {
    if (!(await getAuthUserId())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d }
    const startOfWeek = daysAgo(4)

    const allSquadIds = [DEMO_SQUAD_ID, DEMO_SQUAD_2_ID]
    const allBucketIds = [DEMO_SHARED_BUCKET_ID, DEMO_SHARED_BUCKET_2_ID]
    const allChallengeIds = [DEMO_CHALLENGE_ID, DEMO_CHALLENGE_2_ID]

    // Reset all demo data (order matters for FK constraints)
    await prisma.ledgerEntry.deleteMany({ where: { account: { userId: { in: DEMO_USER_IDS } } } })
    await prisma.ledgerAccount.deleteMany({ where: { userId: { in: DEMO_USER_IDS } } })
    await prisma.transfer.deleteMany({ where: { OR: [{ fromUserId: { in: DEMO_USER_IDS } }, { toUserId: { in: DEMO_USER_IDS } }] } })
    await prisma.challengeCompletion.deleteMany({ where: { challengeId: { in: allChallengeIds } } })
    await prisma.challenge.deleteMany({ where: { id: { in: allChallengeIds } } })
    await prisma.sharedBucketMember.deleteMany({ where: { bucketId: { in: allBucketIds } } })
    await prisma.sharedBucket.deleteMany({ where: { id: { in: allBucketIds } } })
    await prisma.squadStreak.deleteMany({ where: { squadId: { in: allSquadIds } } })
    await prisma.squadMember.deleteMany({ where: { squadId: { in: allSquadIds } } })
    await prisma.squad.deleteMany({ where: { id: { in: allSquadIds } } })
    await prisma.debtRecord.deleteMany({ where: { creditorId: DEMO_USER_ID } })
    await prisma.bucket.deleteMany({ where: { userId: DEMO_USER_ID } })
    await prisma.musimEvent.deleteMany({ where: { userId: DEMO_USER_ID } })
    await prisma.transaction.deleteMany({ where: { userId: { in: DEMO_USER_IDS } } })
    await prisma.user.deleteMany({ where: { id: { in: DEMO_USER_IDS } } })

    await prisma.user.createMany({
      data: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Amirah Zahra', email: 'amirah@demo.kira', income: 2800, salaryDay: 25 },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Ali Haikal', email: 'ali@demo.kira', income: 2400, salaryDay: 25 },
        { id: '00000000-0000-0000-0000-000000000003', name: 'Siti Nurhaliza', email: 'siti@demo.kira', income: 3100, salaryDay: 25 },
        { id: '00000000-0000-0000-0000-000000000004', name: 'Hana Soraya', email: 'hana@demo.kira', income: 2200, salaryDay: 25 },
        { id: '00000000-0000-0000-0000-000000000005', name: 'Danish Irfan', email: 'danish@demo.kira', income: 800, salaryDay: 1 },
      ],
    })

    await prisma.ledgerAccount.createMany({
      data: DEMO_USER_IDS.map(uid => ({
        type: 'USER_WALLET',
        userId: uid,
        balanceSen: BigInt(walletBalances[uid]),
        currency: 'MYR',
      })),
    })

    // Squad 1: "KL Kawan Crew" — all 5 members
    await prisma.squad.create({ data: { id: DEMO_SQUAD_ID, name: 'KL Kawan Crew' } })
    await prisma.squadMember.createMany({
      data: SQUAD_1_MEMBERS.map(uid => ({ squadId: DEMO_SQUAD_ID, userId: uid })),
    })

    // Squad 2: "Cyberjaya Savers" — Amirah, Siti, Danish
    await prisma.squad.create({ data: { id: DEMO_SQUAD_2_ID, name: 'Cyberjaya Savers' } })
    await prisma.squadMember.createMany({
      data: SQUAD_2_MEMBERS.map(uid => ({ squadId: DEMO_SQUAD_2_ID, userId: uid })),
    })

    await prisma.bucket.createMany({
      data: [
        { userId: DEMO_USER_ID, name: 'Simpanan', percentage: 20, balance: 1120, type: 'savings' },
        { userId: DEMO_USER_ID, name: 'Bil Tetap', percentage: 30, balance: 420, type: 'bills' },
        { userId: DEMO_USER_ID, name: 'Flex', percentage: 50, balance: 680, type: 'flex' },
      ],
    })

    await prisma.transaction.createMany({
      data: [
        { userId: DEMO_USER_ID, amount: -12.50, category: 'Food & Drinks', merchant: 'Tealive TTDI', date: daysAgo(13), source: 'manual' },
        { userId: DEMO_USER_ID, amount: -45.00, category: 'Groceries', merchant: 'Jaya Grocer SS15', date: daysAgo(12), source: 'manual' },
        { userId: DEMO_USER_ID, amount: -8.00, category: 'Transport', merchant: 'Grab Car', date: daysAgo(12), source: 'manual' },
        { userId: DEMO_USER_ID, amount: -85.00, category: 'Food & Drinks', merchant: "Nando's Midvalley", date: daysAgo(10), source: 'voice' },
        { userId: DEMO_USER_ID, amount: -32.00, category: 'Entertainment', merchant: 'TGV Cinemas', date: daysAgo(9), source: 'manual' },
        { userId: DEMO_USER_ID, amount: -15.00, category: 'Food & Drinks', merchant: 'Makan@Masjid India', date: daysAgo(8), source: 'manual' },
        { userId: DEMO_USER_ID, amount: -9.50, category: 'Transport', merchant: 'RapidKL Touch n Go', date: daysAgo(7), source: 'manual' },
        { userId: DEMO_USER_ID, amount: -22.00, category: 'Food & Drinks', merchant: 'Restoran Sri Nirwana', date: daysAgo(6), source: 'manual' },
        { userId: DEMO_USER_ID, amount: -400.00, category: 'Bills', merchant: 'PTPTN Auto-Debit', date: daysAgo(5), source: 'manual' },
        { userId: DEMO_USER_ID, amount: -65.00, category: 'Bills', merchant: 'Celcom Postpaid', date: daysAgo(4), source: 'manual' },
        { userId: DEMO_USER_ID, amount: -18.00, category: 'Food & Drinks', merchant: 'KFC Damansara', date: daysAgo(3), source: 'receipt' },
        { userId: DEMO_USER_ID, amount: -11.00, category: 'Transport', merchant: 'Grab Car', date: daysAgo(2), source: 'manual' },
        { userId: DEMO_USER_ID, amount: -28.00, category: 'Food & Drinks', merchant: 'Sushi King', date: daysAgo(1), source: 'manual' },
      ],
    })

    await prisma.debtRecord.createMany({
      data: [
        { creditorId: DEMO_USER_ID, debtorName: 'Ali', amount: 21.25, context: "Nando's Midvalley", status: 'pending', direction: 'owe_me' },
        { creditorId: DEMO_USER_ID, debtorName: 'Siti', amount: 21.25, context: "Nando's Midvalley", status: 'pending', direction: 'owe_me' },
        { creditorId: DEMO_USER_ID, debtorName: 'Hana', amount: 21.25, context: "Nando's Midvalley", status: 'pending', direction: 'owe_me' },
      ],
    })

    // Squad 1 streaks
    await prisma.squadStreak.createMany({
      data: [
        { userId: '00000000-0000-0000-0000-000000000001', squadId: DEMO_SQUAD_ID, currentStreak: 15, longestStreak: 15, lastActive: today, savingsRate: 22.5 },
        { userId: '00000000-0000-0000-0000-000000000002', squadId: DEMO_SQUAD_ID, currentStreak: 12, longestStreak: 18, lastActive: today, savingsRate: 28.3 },
        { userId: '00000000-0000-0000-0000-000000000003', squadId: DEMO_SQUAD_ID, currentStreak: 20, longestStreak: 20, lastActive: today, savingsRate: 31.0 },
        { userId: '00000000-0000-0000-0000-000000000004', squadId: DEMO_SQUAD_ID, currentStreak: 7, longestStreak: 14, lastActive: today, savingsRate: 18.0 },
        { userId: '00000000-0000-0000-0000-000000000005', squadId: DEMO_SQUAD_ID, currentStreak: 3, longestStreak: 9, lastActive: daysAgo(1), savingsRate: 12.5 },
      ],
    })

    // Squad 2 streaks
    await prisma.squadStreak.createMany({
      data: [
        { userId: '00000000-0000-0000-0000-000000000001', squadId: DEMO_SQUAD_2_ID, currentStreak: 8, longestStreak: 10, lastActive: today, savingsRate: 19.0 },
        { userId: '00000000-0000-0000-0000-000000000003', squadId: DEMO_SQUAD_2_ID, currentStreak: 14, longestStreak: 14, lastActive: today, savingsRate: 35.0 },
        { userId: '00000000-0000-0000-0000-000000000005', squadId: DEMO_SQUAD_2_ID, currentStreak: 5, longestStreak: 7, lastActive: today, savingsRate: 10.0 },
      ],
    })

    await prisma.musimEvent.createMany({
      data: [
        { userId: DEMO_USER_ID, eventName: 'Hari Raya Aidilfitri', eventDate: new Date('2027-03-10'), estimatedCost: 500, category: 'festive', isSystem: true },
        { userId: DEMO_USER_ID, eventName: 'Semester Fees (July)', eventDate: new Date('2026-07-01'), estimatedCost: 1800, category: 'education', isSystem: true },
        { userId: DEMO_USER_ID, eventName: 'PTPTN Annual Review', eventDate: new Date('2026-09-01'), estimatedCost: 200, category: 'debt', isSystem: true },
        { userId: DEMO_USER_ID, eventName: 'Year-End Festive', eventDate: new Date('2026-12-15'), estimatedCost: 400, category: 'festive', isSystem: true },
      ],
    })

    // Squad 1 shared bucket
    await prisma.sharedBucket.create({
      data: {
        id: DEMO_SHARED_BUCKET_ID,
        squadId: DEMO_SQUAD_ID,
        name: 'Bali Trip 2027',
        balance: 1350,
        targetAmount: 5000,
        members: {
          create: SQUAD_1_MEMBERS.map(uid => ({ userId: uid, contribution: 270 })),
        },
      },
    })

    // Squad 2 shared bucket
    await prisma.sharedBucket.create({
      data: {
        id: DEMO_SHARED_BUCKET_2_ID,
        squadId: DEMO_SQUAD_2_ID,
        name: 'Weekly Lunch Fund',
        balance: 450,
        targetAmount: 1000,
        members: {
          create: SQUAD_2_MEMBERS.map(uid => ({ userId: uid, contribution: 150 })),
        },
      },
    })

    // Squad 1 challenge
    await prisma.challenge.create({
      data: {
        id: DEMO_CHALLENGE_ID,
        squadId: DEMO_SQUAD_ID,
        name: 'No Bubble Tea Week',
        description: 'Skip boba, pool the savings',
        startDate: startOfWeek,
        endDate: daysAgo(-2),
        penaltyAmount: 5,
        completions: {
          create: [
            { userId: DEMO_USER_ID, date: daysAgo(4), completed: true },
            { userId: DEMO_USER_ID, date: daysAgo(3), completed: true },
            { userId: DEMO_USER_ID, date: daysAgo(2), completed: true },
            { userId: DEMO_USER_ID, date: daysAgo(1), completed: true },
          ],
        },
      },
    })

    // Squad 2 challenge
    await prisma.challenge.create({
      data: {
        id: DEMO_CHALLENGE_2_ID,
        squadId: DEMO_SQUAD_2_ID,
        name: 'Save RM50 This Week',
        description: 'Cut non-essential spending for 7 days',
        startDate: startOfWeek,
        endDate: daysAgo(-2),
        penaltyAmount: 10,
        completions: {
          create: [
            { userId: DEMO_USER_ID, date: daysAgo(4), completed: true },
            { userId: DEMO_USER_ID, date: daysAgo(3), completed: true },
            { userId: DEMO_USER_ID, date: daysAgo(2), completed: false },
          ],
        },
      },
    })

    return NextResponse.json({ ok: true, message: 'Demo data seeded successfully' })
  } catch (err) {
    console.error('[seed]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Reset just the demo-sensitive state without wiping transactions
export async function DELETE() {
  try {
    if (!(await getAuthUserId())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const DEMO_CHALLENGE_ID = '00000000-0000-0000-0000-000000000030'
    const DEMO_CHALLENGE_2_ID = '00000000-0000-0000-0000-000000000031'
    const today = new Date()
    const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d }

    await prisma.debtRecord.updateMany({
      where: { creditorId: DEMO_USER_ID },
      data: { status: 'pending', settledAt: null },
    })
    await prisma.bucket.updateMany({
      where: { userId: DEMO_USER_ID, type: 'savings' },
      data: { balance: 1120 },
    })
    await prisma.bucket.updateMany({
      where: { userId: DEMO_USER_ID, type: 'bills' },
      data: { balance: 420 },
    })
    await prisma.bucket.updateMany({
      where: { userId: DEMO_USER_ID, type: 'flex' },
      data: { balance: 680 },
    })
    await prisma.sharedBucket.updateMany({
      where: { id: DEMO_SHARED_BUCKET_ID },
      data: { balance: 1350 },
    })
    await prisma.sharedBucket.updateMany({
      where: { id: DEMO_SHARED_BUCKET_2_ID },
      data: { balance: 450 },
    })
    // Reset challenge completions to initial state
    await prisma.challengeCompletion.deleteMany({ where: { challengeId: { in: [DEMO_CHALLENGE_ID, DEMO_CHALLENGE_2_ID] } } })
    await prisma.challengeCompletion.createMany({
      data: [
        { challengeId: DEMO_CHALLENGE_ID, userId: DEMO_USER_ID, date: daysAgo(4), completed: true },
        { challengeId: DEMO_CHALLENGE_ID, userId: DEMO_USER_ID, date: daysAgo(3), completed: true },
        { challengeId: DEMO_CHALLENGE_ID, userId: DEMO_USER_ID, date: daysAgo(2), completed: true },
        { challengeId: DEMO_CHALLENGE_ID, userId: DEMO_USER_ID, date: daysAgo(1), completed: true },
        { challengeId: DEMO_CHALLENGE_2_ID, userId: DEMO_USER_ID, date: daysAgo(4), completed: true },
        { challengeId: DEMO_CHALLENGE_2_ID, userId: DEMO_USER_ID, date: daysAgo(3), completed: true },
        { challengeId: DEMO_CHALLENGE_2_ID, userId: DEMO_USER_ID, date: daysAgo(2), completed: false },
      ],
    })
    // Reset wallet balances to initial amounts
    for (const uid of DEMO_USER_IDS) {
      await prisma.ledgerAccount.updateMany({
        where: { userId: uid },
        data: { balanceSen: BigInt(walletBalances[uid]) },
      })
    }
    return NextResponse.json({ ok: true, message: 'Demo state reset' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
