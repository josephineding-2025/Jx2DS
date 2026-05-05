import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_SQUAD_ID = '00000000-0000-0000-0000-000000000010'
const DEMO_SHARED_BUCKET_ID = '00000000-0000-0000-0000-000000000020'

export async function POST() {
  try {
    // Reset all demo data
    await prisma.sharedBucketMember.deleteMany({ where: { bucketId: DEMO_SHARED_BUCKET_ID } })
    await prisma.sharedBucket.deleteMany({ where: { id: DEMO_SHARED_BUCKET_ID } })
    await prisma.squadStreak.deleteMany({ where: { squadId: DEMO_SQUAD_ID } })
    await prisma.squadMember.deleteMany({ where: { squadId: DEMO_SQUAD_ID } })
    await prisma.squad.deleteMany({ where: { id: DEMO_SQUAD_ID } })
    await prisma.debtRecord.deleteMany({ where: { creditorId: DEMO_USER_ID } })
    await prisma.bucket.deleteMany({ where: { userId: DEMO_USER_ID } })
    await prisma.musimEvent.deleteMany({ where: { userId: DEMO_USER_ID } })
    await prisma.transaction.deleteMany({ where: { userId: DEMO_USER_ID } })
    await prisma.user.deleteMany({ where: { id: { in: ['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005'] } } })

    const today = new Date()
    const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d }

    await prisma.user.createMany({
      data: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Amirah Zahra', email: 'amirah@demo.kira', income: 2800, salaryDay: 25, squadId: DEMO_SQUAD_ID },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Ali Haikal', email: 'ali@demo.kira', income: 2400, salaryDay: 25, squadId: DEMO_SQUAD_ID },
        { id: '00000000-0000-0000-0000-000000000003', name: 'Siti Nurhaliza', email: 'siti@demo.kira', income: 3100, salaryDay: 25, squadId: DEMO_SQUAD_ID },
        { id: '00000000-0000-0000-0000-000000000004', name: 'Hana Soraya', email: 'hana@demo.kira', income: 2200, salaryDay: 25, squadId: DEMO_SQUAD_ID },
        { id: '00000000-0000-0000-0000-000000000005', name: 'Danish Irfan', email: 'danish@demo.kira', income: 800, salaryDay: 1, squadId: DEMO_SQUAD_ID },
      ],
    })

    await prisma.squad.create({ data: { id: DEMO_SQUAD_ID, name: 'KL Kawan Crew' } })
    await prisma.squadMember.createMany({
      data: ['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005'].map(uid => ({ squadId: DEMO_SQUAD_ID, userId: uid })),
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
        { creditorId: DEMO_USER_ID, debtorName: 'Ali', amount: 21.25, context: "Nando's Midvalley", status: 'pending' },
        { creditorId: DEMO_USER_ID, debtorName: 'Siti', amount: 21.25, context: "Nando's Midvalley", status: 'pending' },
        { creditorId: DEMO_USER_ID, debtorName: 'Hana', amount: 21.25, context: "Nando's Midvalley", status: 'pending' },
      ],
    })

    await prisma.squadStreak.createMany({
      data: [
        { userId: '00000000-0000-0000-0000-000000000001', squadId: DEMO_SQUAD_ID, currentStreak: 15, longestStreak: 15, lastActive: today, savingsRate: 22.5 },
        { userId: '00000000-0000-0000-0000-000000000002', squadId: DEMO_SQUAD_ID, currentStreak: 12, longestStreak: 18, lastActive: today, savingsRate: 28.3 },
        { userId: '00000000-0000-0000-0000-000000000003', squadId: DEMO_SQUAD_ID, currentStreak: 20, longestStreak: 20, lastActive: today, savingsRate: 31.0 },
        { userId: '00000000-0000-0000-0000-000000000004', squadId: DEMO_SQUAD_ID, currentStreak: 7, longestStreak: 14, lastActive: today, savingsRate: 18.0 },
        { userId: '00000000-0000-0000-0000-000000000005', squadId: DEMO_SQUAD_ID, currentStreak: 3, longestStreak: 9, lastActive: daysAgo(1), savingsRate: 12.5 },
      ],
    })

    await prisma.musimEvent.createMany({
      data: [
        { userId: DEMO_USER_ID, eventName: 'Hari Raya Aidilfitri', eventDate: new Date('2026-03-30'), estimatedCost: 500, category: 'festive', isSystem: true },
        { userId: DEMO_USER_ID, eventName: 'Semester Fees (July)', eventDate: new Date('2026-07-01'), estimatedCost: 1800, category: 'education', isSystem: true },
        { userId: DEMO_USER_ID, eventName: 'PTPTN Annual Review', eventDate: new Date('2026-09-01'), estimatedCost: 200, category: 'debt', isSystem: true },
        { userId: DEMO_USER_ID, eventName: 'Year-End Festive', eventDate: new Date('2026-12-15'), estimatedCost: 400, category: 'festive', isSystem: true },
      ],
    })

    await prisma.sharedBucket.create({
      data: {
        id: DEMO_SHARED_BUCKET_ID,
        squadId: DEMO_SQUAD_ID,
        name: 'Bali Trip 2027',
        balance: 1350,
        targetAmount: 5000,
        members: {
          create: ['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005'].map(uid => ({ userId: uid, contribution: 270 })),
        },
      },
    })

    return NextResponse.json({ ok: true, message: 'Demo data seeded successfully' })
  } catch (err) {
    console.error('[seed]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Reset just the demo-sensitive state (debts + buckets) without wiping transactions
export async function DELETE() {
  try {
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
    return NextResponse.json({ ok: true, message: 'Demo state reset' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
