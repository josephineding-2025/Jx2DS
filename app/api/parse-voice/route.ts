import { NextRequest, NextResponse } from 'next/server'
import { parseVoiceExpense } from '@/lib/claude/haiku'

export async function POST(req: NextRequest) {
  try {
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
