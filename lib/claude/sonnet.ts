import Anthropic from '@anthropic-ai/sdk'
import { ParsedExpense } from '@/types'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a Malaysian receipt parser. Extract structured data from receipt images. Return ONLY valid JSON — no markdown, no text before or after.
Use categories: "Food & Drinks", "Transport", "Groceries", "Entertainment", "Bills", "Shopping", "Health", "Others".
Currency is MYR. If you see RM prefix, strip it.
Return this exact schema:
{
  "amount": <total amount as number>,
  "currency": "MYR",
  "merchant": <merchant name>,
  "category": <category>,
  "date": <YYYY-MM-DD, use today if not visible>,
  "participants": 1,
  "per_person": <same as amount>,
  "debt_records": [],
  "confidence": <0-1>
}`

function stripFences(text: string): string {
  return text.replace(/```json\n?|\n?```/g, '').trim()
}

export async function parseReceiptImage(
  imageBase64: string,
  mimeType: string
): Promise<ParsedExpense> {
  const today = new Date().toISOString().split('T')[0]

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBase64 },
          },
          { type: 'text', text: `Today is ${today}. Parse this receipt.` },
        ],
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  return JSON.parse(stripFences(text)) as ParsedExpense
}
