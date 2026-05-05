import OpenAI from 'openai'
import { ParsedExpense } from '@/types'

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

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
  const model = process.env.LLM_VISION_MODEL ?? 'anthropic/claude-sonnet-4-6'

  const res = await client.chat.completions.create({
    model,
    max_tokens: 512,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          { type: 'text', text: `Today is ${today}. Parse this receipt.` },
        ],
      },
    ],
  })

  const text = res.choices[0]?.message?.content ?? ''
  return JSON.parse(stripFences(text)) as ParsedExpense
}
