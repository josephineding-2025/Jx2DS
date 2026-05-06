import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import { calcMusimEvents } from '@/lib/finance/musim'

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')

    const events = await prisma.musimEvent.findMany({
      where: { userId },
      orderBy: { eventDate: 'asc' },
    })

    const fromDate = from ? new Date(from) : new Date()
    const calculated = calcMusimEvents(
      events.map(e => ({
        id: e.id,
        eventName: e.eventName,
        eventDate: e.eventDate,
        estimatedCost: Number(e.estimatedCost),
        category: e.category,
      })),
      fromDate
    )

    return NextResponse.json({ events: calculated })
  } catch (err) {
    console.error('[musim]', err)
    return NextResponse.json({ error: 'Failed to calculate Musim events' }, { status: 500 })
  }
}
