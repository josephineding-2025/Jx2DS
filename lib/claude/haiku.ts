import OpenAI from 'openai'
import type { ParsedExpense } from '@/types'

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

const SYSTEM_PROMPT = `You are a Malaysian expense parser. Return ONLY valid JSON — no markdown, no text before or after.
Use categories: "Food & Drinks", "Transport", "Groceries", "Entertainment", "Bills", "Shopping", "Health", "Others".
Currency is always MYR. The logged-in user does NOT appear in debt_records.
For unnamed participants use "unknown_1", "unknown_2" etc.
Return this exact schema:
{
  "amount": <number>,
  "currency": "MYR",
  "merchant": <string>,
  "category": <string>,
  "date": <YYYY-MM-DD>,
  "participants": <number including payer>,
  "per_person": <amount / participants>,
  "debt_records": [{"name": <string>, "amount": <per_person>}],
  "confidence": <0-1>
}`

function stripFences(text: string): string {
  return text.replace(/```json\n?|\n?```/g, '').trim()
}

export async function parseVoiceExpense(transcript: string): Promise<ParsedExpense> {
  const today = new Date().toISOString().split('T')[0]
  const model = process.env.LLM_NLP_MODEL ?? 'anthropic/claude-haiku-4-5'

  const res = await client.chat.completions.create({
    model,
    max_tokens: 512,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Today is ${today}. Parse this expense: "${transcript}"` },
    ],
  })

  const text = res.choices[0]?.message?.content ?? ''
  return JSON.parse(stripFences(text)) as ParsedExpense
}
