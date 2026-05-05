export interface ParsedExpense {
  amount: number
  currency: string
  merchant: string
  category: string
  date: string
  participants: number
  per_person: number
  debt_records: { name: string; amount: number }[]
  confidence: number
  notes?: string
}

export interface Transaction {
  id: string
  userId: string
  amount: number
  category: string
  merchant: string | null
  date: string
  source: string
  notes: string | null
  createdAt: string
}

export interface DebtRecord {
  id: string
  creditorId: string
  debtorName: string
  amount: number
  context: string | null
  transactionId: string | null
  status: 'pending' | 'settled' | 'partial'
  direction: 'owe_me' | 'i_owe'
  settledAt: string | null
  createdAt: string
}

export interface Bucket {
  id: string
  userId: string
  name: string
  percentage: number
  balance: number
  type: 'savings' | 'bills' | 'flex'
}

export interface MusimEvent {
  id: string
  userId: string
  eventName: string
  eventDate: string
  estimatedCost: number
  category: string
  isSystem: boolean
  autoSaveEnabled: boolean
}

export interface SquadMember {
  userId: string
  name: string
  currentStreak: number
  savingsRate: number
}

export interface ReconcileResult {
  matched: boolean
  debtRecordId: string | null
  debtorName: string | null
  context: string | null
  delta: number | null
  remainingBalance: number | null
}

export interface ArusAllocation {
  bucketId: string
  bucketName: string
  type: string
  percentage: number
  amount: number
  newBalance: number
}

export interface Challenge {
  id: string
  squadId: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  penaltyAmount: number
  completions: ChallengeCompletion[]
}

export interface ChallengeCompletion {
  challengeId: string
  userId: string
  date: string
  completed: boolean
}
