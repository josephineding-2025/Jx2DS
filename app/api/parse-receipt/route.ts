import { NextRequest, NextResponse } from 'next/server'
import { parseReceiptImage } from '@/lib/claude/sonnet'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json()
    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: 'imageBase64 and mimeType are required' }, { status: 400 })
    }

    const parsed = await parseReceiptImage(imageBase64, mimeType)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[parse-receipt]', err)
    return NextResponse.json({ error: 'Failed to parse receipt' }, { status: 500 })
  }
}
