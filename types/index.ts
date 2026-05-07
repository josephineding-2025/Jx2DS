export interface ParsedExpense {
  amount: number
  currency: string
  merchant: string
  category: string
  date: string
  participants: number
  per_person: number
  debt_records: { name: string; amount: number; debtorId?: string }[]
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
  debtorId: string | null
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

export interface Squad {
  id: string
  name: string
}

export interface SquadMember {
  userId: string
  name: string
  currentStreak: number
  longestStreak: number
  lastActive: string | null
  savingsRate: number
  isCurrentUser: boolean
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

export interface RewindNumbersCard {
  type: 'numbers'
  emoji: string
  visual_stat: string
  visual_label: string
  headline: string
  stats: {
    total_spend: number
    transactions: number
    top_merchant: string
    days_tracked: number
  }
}

export interface RewindPersonalityCard {
  type: 'personality'
  emoji: string
  visual_stat: string
  visual_label: string
  archetype: string
  description: string
}

export interface RewindPatternCard {
  type: 'pattern'
  emoji: string
  visual_stat: string
  visual_label: string
  headline: string
  body: string
  merchant?: string
  visit_count?: number
  total_amount?: number
}

export interface RewindHiddenCostCard {
  type: 'hidden_cost'
  emoji: string
  visual_stat: string
  visual_label: string
  headline: string
  body: string
  annual_amount: number
  equivalent: string
}

export interface RewindUnlockCard {
  type: 'unlock'
  emoji: string
  visual_stat: string
  visual_label: string
  headline: string
  body: string
  monthly_saving: number
  cermin_slider_key: 'food' | 'transport' | 'savings' | null
  cermin_impact_rm: number
}

export type RewindCard =
  | RewindNumbersCard
  | RewindPersonalityCard
  | RewindPatternCard
  | RewindHiddenCostCard
  | RewindUnlockCard

export interface RewindStory {
  month: string
  cards: [RewindNumbersCard, RewindPersonalityCard, RewindPatternCard, RewindHiddenCostCard, RewindUnlockCard]
}
