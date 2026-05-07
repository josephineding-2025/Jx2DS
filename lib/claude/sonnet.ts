import OpenAI from 'openai'
import type { ParsedExpense } from '@/types'
import { stripFences, validateParsedExpense } from './shared'

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

const SYSTEM_PROMPT = `You are a Malaysian receipt parser for a fintech app called SnapIt.
Your job: extract structured financial data from receipt/invoice images into JSON for a transaction ledger and debt-splitting system.

## Output schema
Return ONLY a JSON object matching this exact schema. No markdown, no commentary, no text before or after.
{
  "amount": <number, grand total in MYR, 2 decimal places>,
  "currency": "MYR",
  "merchant": <string, business or establishment name>,
  "category": <one of the categories below>,
  "date": "<YYYY-MM-DD from receipt, or today>",
  "participants": <number of people if receipt suggests group dining/purchase, else 1>,
  "per_person": <amount divided by participants>,
  "debt_records": <array of {name, amount} if group expense, else []>,
  "confidence": <number 0-1, how certain you are about the extraction>
}

## Categories (pick the best match)
"Food & Drinks", "Transport", "Groceries", "Entertainment", "Bills", "Shopping", "Health", "Education", "Others"

## Receipt extraction rules
- Extract the GRAND TOTAL (after tax/service charge) as "amount". If only subtotal is visible, use that.
- Strip "RM" prefix. All amounts are numbers with dot decimals.
- Merchant name: use the most prominent business name on the receipt. If a logo or header says "OLDTOWN WHITE COFFEE" use that, not abbreviated forms.
- Category: infer from merchant type and items. Restaurants/cafes → "Food & Drinks", pharmacies → "Health", etc.
- Date: use the receipt date. If unreadable or missing, use today's date.
- SST (Sales and Service Tax), service charge, and rounding are already in the total — do NOT add them again.

## Malaysia-specific rules
- Currency is always MYR. Accept RM, ringgit, or bare numbers as MYR.
- Common Malaysian receipt merchants: Grab, Foodpanda, Shopee, Touch 'n Go, mamak stalls, kopitiams (OldTown, Papparich, etc.), boba shops (Tealive, Chatime), petrol stations (Petronas, Shell), supermarkets (Mydin, Giant, Tesco).
- Dates on Malaysian receipts are usually DD/MM/YYYY or DD-MM-YYYY.
- SST is 6% or 8%. Service charge is typically 10% at restaurants.

## Bill splitting (CRITICAL)
You MUST detect group expenses from the receipt. Look for ALL of these signals:

1. **Named diners** (HIGHEST PRIORITY): Many Malaysian restaurant receipts list items grouped under each person's name with a per-person subtotal (e.g. "Choi — RM16.30", "Josephine Ding — RM10.90"). When you see this pattern:
   - The receipt was paid by the APP USER who is NOT one of the named diners. They paid for everyone on the receipt.
   - Put ALL named diners into debt_records using their EXACT names and EXACT per-person subtotals from the receipt.
   - Do NOT skip any named diner. Every person listed on the receipt owes their amount to the payer.
   - participants = number of named diners (the people whose food was paid for).
   - per_person = amount / participants (informational average).

2. **Anonymous group clues**: Multiple main dishes, "pax: 4", multiple drinks, table numbers, "2x" or quantity > 1 on mains — but NO named diners.
   - Use "unknown_1", "unknown_2" etc. for unnamed participants
   - Split the grand total equally among participants
   - participants = estimated number of people (exclude the payer)

3. **Solo indicators**: Single meal, single drink, personal items, grocery run, petrol.
   - Set participants to 1 and debt_records to []

IMPORTANT: Named diners take absolute priority. If you see names with subtotals, ALL of them go into debt_records.

## Examples

A restaurant receipt with named diners "Choi — RM16.30" and "Josephine Ding — RM10.90", total RM27.25. The app user paid for both:
{"amount":27.25,"currency":"MYR","merchant":"Restaurant","category":"Food & Drinks","date":"2026-05-05","participants":2,"per_person":13.63,"debt_records":[{"name":"Choi","amount":16.30},{"name":"Josephine Ding","amount":10.90}],"confidence":0.95}

A restaurant receipt showing "Nando's", total RM85.00, 4 main dishes, 4 drinks (no named diners):
{"amount":85.00,"currency":"MYR","merchant":"Nando's","category":"Food & Drinks","date":"2026-05-06","participants":4,"per_person":21.25,"debt_records":[{"name":"unknown_1","amount":21.25},{"name":"unknown_2","amount":21.25},{"name":"unknown_3","amount":21.25}],"confidence":0.85}

A single Grab ride receipt:
{"amount":12.50,"currency":"MYR","merchant":"Grab","category":"Transport","date":"2026-05-06","participants":1,"per_person":12.50,"debt_records":[],"confidence":0.98}

A grocery receipt from Mydin, total RM67.30, multiple household items:
{"amount":67.30,"currency":"MYR","merchant":"Mydin","category":"Groceries","date":"2026-05-06","participants":1,"per_person":67.30,"debt_records":[],"confidence":0.93}`

export async function parseReceiptImage(
  imageBase64: string,
  mimeType: string
): Promise<ParsedExpense> {
  const today = new Date().toISOString().split('T')[0]
  const model = process.env.LLM_VISION_MODEL ?? 'anthropic/claude-sonnet-4-6'

  const messages: Array<{ role: 'system' | 'user'; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
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
  ]

  const maxRetries = 2
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await client.chat.completions.create({
      model,
      max_tokens: 1024,
      messages: messages as Parameters<typeof client.chat.completions.create>[0]['messages'],
    })

    const text = res.choices[0]?.message?.content ?? ''
    try {
      const raw = JSON.parse(stripFences(text))
      const validated = validateParsedExpense(raw)
      if (validated.confidence >= 0.3) return validated

      if (attempt < maxRetries) {
        messages.push({ role: 'user', content: `That extraction had low confidence (${validated.confidence}). Re-examine the receipt image and try again. Ensure every field is filled correctly.` })
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
