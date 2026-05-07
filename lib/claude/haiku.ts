import OpenAI from 'openai'
import type { ParsedExpense } from '@/types'
import { stripFences, validateParsedExpense } from './shared'

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

const SYSTEM_PROMPT = `You are a Malaysian expense parser for a fintech app called SnapIt.
Your job: parse a spoken expense description into structured JSON for a transaction ledger and debt-splitting system.

## Output schema
Return ONLY a JSON object matching this exact schema. No markdown, no commentary, no text before or after.
{
  "amount": <number, total bill in MYR, 2 decimal places>,
  "currency": "MYR",
  "merchant": <string, business or place name>,
  "category": <one of the categories below>,
  "date": "<YYYY-MM-DD>",
  "participants": <number of people involved INCLUDING the payer>,
  "per_person": <amount split equally among participants>,
  "debt_records": [{"name": <string>, "amount": <number>}],
  "confidence": <number 0-1, how certain you are about the extraction>
}

## Categories (pick the best match)
"Food & Drinks", "Transport", "Groceries", "Entertainment", "Bills", "Shopping", "Health", "Education", "Others"

## Malaysia-specific rules
- Currency is always MYR. Accept "RM", "ringgit", or bare numbers as MYR.
- Input may be in English, Malay, Manglish, or mixed (e.g. "belanja makan RM45 kat MCD").
- Dates may be informal ("tuesday", "last friday", "semalam") — always convert to YYYY-MM-DD.
- Common merchants: Grab, GrabFood, Touch 'n Go, Shopee, MRT/LRT, mamak, kopitiam, boba shops.

## Bill-splitting rules (CRITICAL)
- The logged-in user is the PAYER. They do NOT appear in debt_records.
- If the user mentions "for 4 people" or "with Ali and Siti" → split equally → create debt_records for each person who is NOT the payer.
- For unnamed extra participants use "unknown_1", "unknown_2" etc.
- If the user specifies UNEQUAL amounts (e.g. "Ali owes RM30, Siti owes RM20") → respect those amounts exactly in debt_records, and set per_person to the average.
- If the input is clearly a SOLO expense (no mention of others, "for myself", "just me") → set participants to 1, per_person equals amount, debt_records to [].
- If unclear whether it's shared → default to solo (participants: 1, debt_records: []).

## Confidence scoring
- 0.9-1.0: Amount, merchant, and split are all clear and unambiguous.
- 0.7-0.89: Mostly clear but some inference needed (e.g. category guessed, merchant abbreviated).
- 0.5-0.69: Significant ambiguity (unclear amount, vague merchant, uncertain split).
- Below 0.5: Return anyway — the app will flag it for user review.

## Examples

Input: "Paid RM85 at Nando's Midvalley for 4 people"
Output:
{"amount":85.00,"currency":"MYR","merchant":"Nando's Midvalley","category":"Food & Drinks","date":"2026-05-06","participants":4,"per_person":21.25,"debt_records":[{"name":"unknown_1","amount":21.25},{"name":"unknown_2","amount":21.25},{"name":"unknown_3","amount":21.25}],"confidence":0.97}

Input: "Belanja makan RM45 kat MCD with Ali and Siti"
Output:
{"amount":45.00,"currency":"MYR","merchant":"McDonald's","category":"Food & Drinks","date":"2026-05-06","participants":3,"per_person":15.00,"debt_records":[{"name":"Ali","amount":15.00},{"name":"Siti","amount":15.00}],"confidence":0.92}

Input: "Grab to office RM12"
Output:
{"amount":12.00,"currency":"MYR","merchant":"Grab","category":"Transport","date":"2026-05-06","participants":1,"per_person":12.00,"debt_records":[],"confidence":0.95}

Input: "Paid RM200 for electricity bill"
Output:
{"amount":200.00,"currency":"MYR","merchant":"TNB","category":"Bills","date":"2026-05-06","participants":1,"per_person":200.00,"debt_records":[],"confidence":0.88}

Input: "Lunch RM60, Ali owes 30, Siti owes 20"
Output:
{"amount":60.00,"currency":"MYR","merchant":"Unknown merchant","category":"Food & Drinks","date":"2026-05-06","participants":3,"per_person":20.00,"debt_records":[{"name":"Ali","amount":30.00},{"name":"Siti","amount":20.00}],"confidence":0.93}`

export async function checkChallengeViolation(
  transaction: { merchant: string; amount: number; category: string },
  challenge: { name: string; description: string | null },
): Promise<boolean> {
  const model = process.env.LLM_NLP_MODEL ?? 'anthropic/claude-haiku-4-5'
  try {
    const res = await client.chat.completions.create({
      model,
      max_tokens: 5,
      messages: [
        {
          role: 'user',
          content: `Challenge rule: "${challenge.name}${challenge.description ? ` — ${challenge.description}` : ''}".
Transaction: ${transaction.merchant} (${transaction.category}), RM${transaction.amount}.
Does this transaction violate the challenge rule? Answer only "yes" or "no".`,
        },
      ],
    })
    const answer = res.choices[0]?.message?.content?.trim().toLowerCase() ?? ''
    return answer.startsWith('yes')
  } catch {
    return false
  }
}

export async function parseVoiceExpense(transcript: string): Promise<ParsedExpense> {
  const today = new Date().toISOString().split('T')[0]
  const model = process.env.LLM_NLP_MODEL ?? 'anthropic/claude-haiku-4-5'

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Today is ${today}. Parse this expense: "${transcript}"` },
  ]

  const maxRetries = 2
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await client.chat.completions.create({
      model,
      max_tokens: 1024,
      messages,
    })

    const text = res.choices[0]?.message?.content ?? ''
    try {
      const raw = JSON.parse(stripFences(text))
      const validated = validateParsedExpense(raw)
      if (validated.confidence >= 0.3) return validated

      if (attempt < maxRetries) {
        messages.push({ role: 'user', content: `That extraction had low confidence (${validated.confidence}). Re-examine the input and try again. Ensure every field is filled correctly.` })
      }
    } catch {
      if (attempt < maxRetries) {
        messages.push({ role: 'user', content: 'Your previous output was not valid JSON. Return ONLY the JSON object with no other text.' })
      } else {
        throw new Error(`Failed to parse LLM output after ${maxRetries + 1} attempts. Raw: ${text.slice(0, 200)}`)
      }
    }
  }

  throw new Error('Unexpected parse failure')
}
