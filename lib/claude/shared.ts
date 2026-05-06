import type { ParsedExpense } from '@/types'

export function stripFences(text: string): string {
  return text.replace(/```json\n?|\n?```/g, '').trim()
}

export const VALID_CATEGORIES = new Set([
  'Food & Drinks', 'Transport', 'Groceries', 'Entertainment',
  'Bills', 'Shopping', 'Health', 'Education', 'Others',
])

export function validateParsedExpense(raw: Record<string, unknown>): ParsedExpense {
  const amount = typeof raw.amount === 'number' && Number.isFinite(raw.amount) && raw.amount > 0
    ? raw.amount
    : undefined
  if (amount === undefined) throw new Error('Invalid or missing amount')

  const category = typeof raw.category === 'string' && VALID_CATEGORIES.has(raw.category)
    ? raw.category
    : 'Others'

  const participants = typeof raw.participants === 'number' && raw.participants >= 1
    ? Math.round(raw.participants)
    : 1

  const per_person = typeof raw.per_person === 'number' && Number.isFinite(raw.per_person) && raw.per_person > 0
    ? raw.per_person
    : participants > 0 ? Math.round((amount / participants) * 100) / 100 : amount

  const debt_records = Array.isArray(raw.debt_records)
    ? raw.debt_records
        .filter((d: Record<string, unknown>) => typeof d.name === 'string' && d.name.length > 0)
        .map((d: Record<string, unknown>) => ({
          name: String(d.name),
          amount: typeof d.amount === 'number' && Number.isFinite(d.amount) && d.amount > 0
            ? d.amount
            : per_person,
        }))
    : []

  const confidence = typeof raw.confidence === 'number' && raw.confidence >= 0 && raw.confidence <= 1
    ? raw.confidence
    : 0.5

  return {
    amount,
    currency: 'MYR',
    merchant: typeof raw.merchant === 'string' && raw.merchant.length > 0 ? raw.merchant : 'Unknown merchant',
    category,
    date: typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
      ? raw.date
      : new Date().toISOString().split('T')[0],
    participants,
    per_person,
    debt_records,
    confidence,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
  }
}
