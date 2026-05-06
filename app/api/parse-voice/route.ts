import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth'
import { parseVoiceExpense } from '@/lib/claude/haiku'

export async function POST(req: NextRequest) {
  try {
    if (!(await getAuthUserId())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transcript } = await req.json()
    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'transcript is required' }, { status: 400 })
    }

    const parsed = await parseVoiceExpense(transcript)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[parse-voice]', err)
    return NextResponse.json({ error: 'Failed to parse transcript' }, { status: 500 })
  }
}
