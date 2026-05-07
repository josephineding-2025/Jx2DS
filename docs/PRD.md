# SnapIt — Product Requirements Document

> **Tagline:** Your money, on autopilot.
> **Challenge:** GXBank Youth Resilience Challenge
> **Version:** 1.0 — Hackathon MVP

---

## 1. Problem Statement

Malaysian youth don't lack financial awareness — they lack a system that acts for them, so every good financial decision still requires willpower they don't reliably have.

**The evidence:**
- 67% of Malaysian youth aged 20–30 have zero emergency savings
- AKPK data shows debt among those under 35 has grown 40% since 2019
- 70% of PTPTN borrowers take more than 10 years to repay
- Current banking apps are rearview mirrors — they show what happened, not what will happen, and they never act on the user's behalf

**The villain:** Friction. Every point where a user must make a conscious financial decision is a point where discipline can fail.

**The insight:** Remove the friction, and good financial behaviour becomes the default — not the exception.

---

## 2. Solution Overview

**SnapIt** is an AI-powered financial resilience companion for Malaysian students and fresh graduates. It removes every friction point in financial management through:

1. **Zero-friction bookkeeping** — log expenses by voice or receipt photo in seconds
2. **Context-aware money intelligence** — automatically reconcile debts, split income into buckets, and plan for known seasonal expenses
3. **Social accountability** — a squad system that makes saving visible, social, and rewarding
4. **Autonomous micro-payments** — location and device-aware automation that removes real-world financial friction entirely

SnapIt is built on GXBank's transaction infrastructure and designed as a native feature extension — not a standalone app competing with GXBank, but a financial intelligence layer on top of it.

---

## 3. Target Audience

**Primary persona: Amirah**
- 23 years old, fresh graduate, working in KL
- Earns RM2,800/month, has RM400 PTPTN repayment
- Uses GrabFood, goes out with friends, splits bills regularly
- Wants to save but forgets, gets overwhelmed by manual tracking, and has no accountability system
- Checks her bank app reactively — only when she suspects she's overspent

**Secondary persona: Danish**
- 20 years old, university student in Cyberjaya
- Receives RM800/month allowance from parents + part-time income
- Pays for shared house expenses, takes turns covering friends' meals
- No savings habit, no budget, no visibility into where money goes

---

## 4. Core Features

### 4.1 Zero-Friction Bookkeeping

**Feature A: Voice Expense Logging**
- User presses mic and says: *"Paid RM85 at Nando's Midvalley for 4 people"*
- Web Speech API captures transcript
- NLP inference pipeline with intent normalization (Claude Haiku) extracts: amount, merchant, category, participant count, individual share
- Structured JSON written to transaction ledger
- Debt records auto-created for each named/unnamed participant

**Feature B: Receipt Photo Extraction**
- User photographs or uploads a receipt
- Multimodal document extraction with structured output enforcement (Claude Sonnet Vision)
- Extracts: merchant name, date, line items, total, tax
- User confirms or edits before saving
- If participants are tagged, individual shares are computed and debt records created

**Feature C: WhatsApp Receipt Forward** *(nice-to-have)*
- User forwards a receipt image from WhatsApp into SnapIt
- Triggers same multimodal extraction pipeline

**Feature D: Bank Statement Import** *(nice-to-have)*
- Photo or paste of bank statement
- Batch extraction and categorization of all transactions
- Duplicate detection against existing records

**LLM normalization output schema:**
```json
{
  "amount": 85.00,
  "currency": "MYR",
  "merchant": "Nando's Midvalley",
  "category": "Food & Drinks",
  "date": "2026-05-05",
  "participants": 4,
  "per_person": 21.25,
  "debt_records": [
    { "name": "Ali", "amount": 21.25 },
    { "name": "Siti", "amount": 21.25 },
    { "name": "unknown_1", "amount": 21.25 }
  ],
  "confidence": 0.97
}
```

---

### 4.2 Context-Aware Money Intelligence

**Feature A: Debt Tracking & Auto-Reconciliation (Event-Driven Reconciliation Engine)**
- When a transaction is logged with participants, debt records are created automatically with `direction = "owe_me"`; debts created via the "I Owe" flow use `direction = "i_owe"`
- In MVP, reconciliation is manually triggered: user enters sender name + amount in the "Owes Me" tab → engine fuzzy-matches against all pending `owe_me` debt records
- Match algorithm (`findBestDebtMatch`): name similarity > 0.7 (token overlap) AND amount within 10% of debt amount (minimum RM1 tolerance)
- On match within tolerance: debt marked `settled`, incoming amount credited to user's wallet (LedgerAccount)
- On partial match (below tolerance): debt marked `partial`, remaining balance decremented
- On no match: returns `matched: false` — no record created, user informed
- In production: GXBank incoming transfer webhook replaces the manual trigger, same reconciliation engine fires automatically
- Wallet screen has 4 tabs: Transactions, Owes Me, I Owe, Transfers
  - **Owes Me**: outstanding total, manual reconcile form, list of `owe_me` debt cards with "Request" shortcut (pre-fills the reconcile form)
  - **I Owe**: total you owe (amber), list of `i_owe` debt cards with "Pay" button → opens TransferSheet
  - **Transfers**: history of sent/received transfers with direction, counterparty, amount, date, note

**Feature B: Safe-to-Spend Autopilot — Flow (Automated Financial Orchestration Layer)**

Arus is an intelligent daily-budget autopilot that answers one question: *"How much can I spend today without blowing up my month?"*

**Core engine — `buildArusPlan()`:**
- Pure function that takes the user's full financial picture (buckets, debts, Musim events, recent transactions, income, salary day) and produces a real-time financial plan
- Computes **Safe-to-Spend Today**: `(Flex balance − shield shortfall) ÷ days until salary` — the single number that replaces budgeting willpower
  - The daily number spreads total runway across remaining days. Example: paying a RM16.30 debt with 18 days left reduces daily budget by RM0.90, not RM16.30 — the full hit is visible in the Runway metric
  - Shield shortfall = `max(0, shieldTarget − billsBucketBalance)`. If shield is already fully covered, the shortfall is 0 and paying a debt reduces daily budget directly (money left the flex bucket)
- Calculates **Debt Shield coverage**: what % of this cycle's obligations (bills + debts + Musim costs) are already funded — classified as Protected (≥90%), Watch (60-89%), or Tight (<60%)
- Generates **AI Split Recommendation**: savings/bills/flex percentages tuned to shield coverage and cash flow, with a human-readable reason
- Handles salary-day edge cases: month-end overflow (day 31 → Feb 28), leap years, missing/null salary day defaults

**Reactive updates — what triggers a recalculation:**
- Logging a spend (voice/receipt): deducts from bills bucket (Bills category) or flex bucket (all other categories) → safe-to-spend recalculates immediately
- Paying a debt (transfer): deducts from flex bucket AND marks debt settled — the two effects partially cancel (less shield obligation, less flex balance), net impact ≈ 0 when shield had shortfall; small decrease when shield was already covered
- Running salary autopilot: splits income across all 3 buckets → safe-to-spend recalculates
- Toggling Musim auto-save: changes `musimNeed` in the shield target → recalculates
- All recalculation is client-side via `useMemo` — zero additional API calls

**Arus screen sections (top to bottom):**
1. **Safe-to-Spend Hero Card** — large daily budget number, days until salary, shield coverage %, total runway (safeToSpendUntilSalary). Cyan gradient card with Debt Shield status badge
2. **Salary Flow Animation** — animated purple orb with cyan/violet/amber drops flowing into 3 streams (Savings / Bills / Flex)
3. **Debt Shield Panel** — total obligations for this cycle, progress bar for coverage %, line-item commitments (bills shield, debt due, upcoming Musim events)
4. **AI Split Recommendation** — suggested savings/bills/flex % with reasoning. CTA: "Tune split" (opens manual split editor)
5. **Run salary autopilot** — triggers `POST /api/arus` salary split; plan recalculates reactively
6. **Split confirmation line** — single inline line below the button: `Savings RM X · Bills RM X · Flex RM X`, color-coded by bucket type. Live-updates after autopilot runs. Replaces the previous 3-card "Live Pockets" layout
7. **Smart Auto-Pay** — Bills bucket extension for automated real-world micro-payments. Configured as a read-only list of location + trigger rules. Demo entry: SS2 Damansara Parking (RM1.00/hr, CarPlay-disconnected trigger, from Bil Tetap). When triggered, a rich notification slides in from the top: "CarPlay disconnected · SS2 Damansara / Street parking paid · RM1.00 from Bil Tetap." Demonstrates that Kira's Bills bucket can act autonomously on location + device context — removing the friction that causes users to skip RM1 parking and incur RM30 fines. UI-only state (no API/DB).

**Integration with other features:**
- Reads from **Musim** (seasonal costs added to shield target) and **Wallet** (debts factored into shield)
- Any change to buckets, debts, transactions, or Musim events immediately recalculates the plan via `useMemo`

**Feature C: Seasonal Financial Awareness — Musim (Contextual Event-Driven Savings Automation)**
- Pre-loaded Malaysian financial events (`isSystem = true`):
  - Hari Raya Aidilfitri
  - Hari Raya Aidiladha
  - University semester fee cycles (Jan, Jul)
  - PTPTN repayment dates
  - Year-end festive season (Dec)
- Each event has an estimated cost (user-editable, defaults based on category)
- `calcMusimEvents()` computes `dailyTarget = estimatedCost / daysRemaining` in real time
- Displayed on the **Home screen** as a horizontal-scrolling row of Musim cards (top 3 upcoming events). Each card shows: event icon (by category), days remaining pill, event name, daily target (RM X/day), auto-save toggle, and a "Saved today" green badge when triggered

**Auto-save engine (`lib/finance/musim-autosave.ts`):**
- When the user toggles auto-save ON, an immediate first deduction fires — no waiting until tomorrow
- Each day at 00:00 MYT, a Vercel cron (`GET /api/cron/musim-autosave`, secured by `CRON_SECRET`) runs `processAllMusimAutoSaves()` across all users
- Per-event idempotency: `lastAutoSaveDate` field on `musim_events` gates the deduction to once per calendar day
- Money movement: `dailyTarget` is deducted from the **flex bucket** and credited to the **savings bucket**; a `Musim Auto-Save` transaction is written to the ledger with `source = "musim"`
- Partial deduction if flex balance is below `dailyTarget` — never errors, never overdrafts
- `POST /api/musim/autosave` exposes a manual trigger for the authenticated user (demo use)
- Arus plan includes active Musim costs in the Debt Shield target, reducing safe-to-spend accordingly

---

### 4.3 Social Accountability — Squad (Social Reinforcement Loop)

**Feature A: Multi-Squad System**
- A user can join multiple squads (e.g. "KL Kawan Crew" for work friends, "Cyberjaya Savers" for housemates)
- Each squad has its own leaderboard, challenges, and shared bucket — fully independent
- Squad switcher at the top of the Kawan tab lets the user toggle between squads instantly
- Each squad member's savings streak and savings rate (% of income) are visible within that squad — never raw amounts (privacy-first)
- Leaderboard ranked by savings rate, not net worth — levels the playing field
- Squad membership managed through the `squad_members` join table (many-to-many)

**Feature B: Streaks & Milestones**
- Streak is maintained per squad: completing a challenge day increments streak, breaking it resets to 0
- Milestone thresholds (e.g. Day 7, Day 14, Day 30) trigger a `milestone` flag in the API response, which the client shows as a flash notification
- Streak and savings rate are visible to all squad members on the leaderboard

**Feature C: Group Challenges**
- Each squad has one active challenge with a name, description, date range, and optional penalty amount
- Each member marks daily compliance: "Done today" (completed = true) or "I broke it" (completed = false)
- Breaking a challenge with a penalty amount automatically increments the squad's **shared bucket** balance by `penaltyAmount`
- Challenge UI shows: progress bar (my completed days / total days), 7-day dot grid for the current user, group completion rate, today's member count done vs total
- Leaderboard is ranked by savings rate (% of income saved), never raw amounts — privacy-first

**Feature D: Shared Bucket (Escrow-Like Group Fund)**
- Each squad has one shared bucket with a name, balance, and optional target amount
- Any member can contribute via the "Contribute" button → `POST /api/shared-bucket/contribute`
- Bucket shows: current balance, target amount, progress bar, member avatar stack
- Penalty amounts from broken challenges auto-credit into the squad's shared bucket
- *Note: In MVP, balance is real within the demo DB. Real multi-user transfer settlement is production scope.*

---


### 4.5 SnapIt Rewind — AI-Generated Monthly Financial Story

**Overview:**
A monthly AI-generated "story" in the style of Spotify Wrapped. Claude Sonnet reads the user's full raw transaction history for the month — not a pre-aggregated breakdown — and writes a personalised, narrative-driven financial report surfacing non-obvious behavioural patterns. Delivered as a sequence of swipeable full-screen cards, each revealing a different insight. Feels like a reward, not a report.

The LLM is the author, not a template-filler. Every card is written by Claude in natural language specific to the user's actual spending fingerprint — the same prompt given to two different users produces two entirely different stories.

---

**Card Sequence (5 cards, swipeable full-screen):**

**Card 1 — Your Month in Numbers**
- Hero stats: total spend, transactions logged, top merchant, days tracked
- Sub-headline generated by Claude: one punchy sentence framing the month
- E.g. *"April was your biggest spending month yet — but you also logged more than ever before."*

**Card 2 — Your Money Personality**
- Claude assigns a financial archetype for the month based on transaction patterns
- Archetypes: *The Weekend Warrior / The Loyal Regular / The Saver in Progress / The Impulse Sprinter / The Bill Slayer / The Social Spender*
- 2-line character description written by Claude, specific to the user's data
- E.g. *"You live for the weekend — 68% of your spend happens on Friday and Saturday. The week is yours, the weekend costs you."*

**Card 3 — Your Biggest Pattern**
- The single most interesting non-obvious behavioural pattern Claude detected
- Must be specific: merchant, day of week, time cluster, category drift — not generic "you spend a lot on food"
- E.g. *"You've been to Nando's 4 times this month — your most loyal merchant. That's RM340, or RM4,080/year if the habit holds."*

**Card 4 — The Hidden Cost**
- One recurring spend made visceral through annualisation or compounding
- Claude picks the spend most likely to surprise the user
- E.g. *"Your weekly bubble tea run is RM18/week. That's RM936/year — enough for a flight to Bali."*
- Framing always includes an equivalent (trip, gadget, milestone) to make the number real

**Card 5 — Your One Unlock**
- Single most impactful behavioural change for next month
- Includes: what to change, estimated monthly saving, and compound impact by age 30
- E.g. *"If you cut dining out by 30%, you'd save RM280/month. By 30, that's RM28,600 more."*

---

**AI Architecture:**

Claude Sonnet reads the raw transaction list (merchant, amount, category, date, day-of-week) and returns the full story as structured JSON in one call. No pre-aggregation — the model does its own pattern detection.

**API: `POST /api/rewind`**
```
Request:
{
  "userId": "xxx"
}

Flow:
1. Query expense transactions from the last 30 days (amount < 0 only — income excluded)
2. Enrich each transaction with day-of-week
3. Require minimum 3 transactions — returns 422 otherwise
4. Send raw list + user income + current month label to Claude Sonnet
5. Claude returns structured story JSON (no caching — generated fresh each call)

Claude input:
{
  "income": 2800,
  "month": "April 2026",
  "transactions": [
    { "merchant": "Nando's Midvalley", "amount": 85, "category": "Food & Drinks", "date": "2026-04-02", "day": "Wednesday" },
    { "merchant": "Grab", "amount": 12, "category": "Transport", "date": "2026-04-03", "day": "Thursday" },
    ...
  ]
}

Claude output schema:
{
  "cards": [
    {
      "type": "numbers",
      "headline": "April was your biggest spending month yet.",
      "stats": {
        "total_spend": 2240,
        "transactions": 34,
        "top_merchant": "Nando's Midvalley",
        "days_tracked": 28
      }
    },
    {
      "type": "personality",
      "archetype": "The Weekend Warrior",
      "description": "You live for the weekend — 68% of your spend happens on Friday and Saturday. The week is yours, the weekend costs you."
    },
    {
      "type": "pattern",
      "headline": "You have a Nando's habit.",
      "body": "You've been to Nando's 4 times this month — your most loyal merchant. That's RM340, or RM4,080/year if the habit holds.",
      "merchant": "Nando's Midvalley",
      "visit_count": 4,
      "total_amount": 340
    },
    {
      "type": "hidden_cost",
      "headline": "Your bubble tea habit has a price.",
      "body": "Your weekly bubble tea run is RM18/week. That's RM936/year — enough for a flight to Bali.",
      "weekly_amount": 18,
      "annual_amount": 936,
      "equivalent": "a flight to Bali"
    },
    {
      "type": "unlock",
      "headline": "One change. RM28,600 by 30.",
      "body": "If you cut dining out by 30%, you'd save RM280/month. Compounded over 7 years at 4% p.a., that's RM28,600 more by the time you're 30.",
      "action": "Cut dining out by 30%",
      "monthly_saving": 280,
      "cermin_slider_key": "food",
      "cermin_impact_rm": 28600
    }
  ]
}
```

---

**UI: Full-Screen Swipeable Story**

- Entry point: "SnapIt Rewind" banner on the Home screen (`[YOUR MONTH IN REVIEW →]`)
- Opens as a full-screen overlay on top of the app (z-index above tabs)
- Each card fills the screen — swipe left/right to navigate, tap X to exit
- Progress dots at top (5 dots, active one highlighted)
- Background: deep gradient that shifts per card type (purple → magenta → cyan → amber → green)
- Typography: large, bold, emotional — not dashboard-style
- Card 5 shows the compound impact number directly — no further navigation required

```
┌─────────────────────────────────────────┐
│  ● ● ○ ○ ○                          [×]│
│                                         │
│                                         │
│  YOUR MONEY                             │
│  PERSONALITY                            │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   🏄  The Weekend Warrior         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  You live for the weekend — 68% of      │
│  your spend happens on Friday and       │
│  Saturday. The week is yours, the       │
│  weekend costs you.                     │
│                                         │
│         swipe to continue →             │
└─────────────────────────────────────────┘
```

---

**Technical Vocabulary (pitch-consistent):**

| Implementation | Official Term |
|---|---|
| Claude reading raw transaction list | Holistic longitudinal behavioural transaction analysis |
| Archetype assignment | AI-driven financial persona classification |
| Non-obvious pattern detection | Unsupervised behavioural pattern extraction |
| Hidden cost annualisation | Visceral compound-cost reframing |
| Monthly story generation | Narrative financial intelligence report |

---

## 5. UI Design Language

### Philosophy
SnapIt mirrors GXBank's visual identity so it reads as a natural feature extension — not a competing app. Judges from GXBank should feel at home immediately.

### Color Tokens
```
Background:       #0A0A14  (GXBank dark base)
Card surface:     #16162A  (elevated cards)
Card surface 2:   #1E1E30  (nested/secondary cards)

Hero gradient:    #4C1D95 → #831843  (GXBank signature purple-to-magenta, top of every key screen)
Primary CTA:      #7C3AED  (purple — all circular action buttons)
Primary light:    #A78BFA  (hover/pressed states)

Savings accent:   #22D3EE  (cyan — used for savings buckets, Flow safe-to-spend hero)
Positive:         #4ADE80  (green — credit transactions, settled debts)
Alert badge:      #EC4899  (hot pink — Musim countdowns, streak milestones, NEW labels)
Warning:          #F59E0B  (amber — overbudget nudges, risk alerts)

Text primary:     #FFFFFF
Text secondary:   #9CA3AF
Text muted:       #6B7280
```

### Component Rules
- **Border radius:** 20–24px on all cards — no sharp edges
- **Action buttons:** 56px purple circles with white Lucide icons (matches GXBank exactly)
- **Transaction rows:** `[Icon circle 40px] [Title + subtitle] [Amount right-aligned]`
- **Dividers:** None — use spacing only (GXBank convention)
- **Amounts:** 700 weight, tabular nums, green for credit, white for debit
- **Badges:** Hot pink pill, uppercase, 11px — for NEW, OWES, countdown labels

### Signature Patterns Per Screen
| Screen | GXBank Pattern Used |
|---|---|
| Home, Flow | Purple-magenta gradient header |
| All action buttons (Voice, Receipt, Request) | Purple circles — identical to GXBank's Add/Scan/Send |
| Flow safe-to-spend hero | Cyan gradient hero card — mirrors GXBank balance display |
| Flow debt shield | Commitment list with coverage progress — mirrors GXBank Pockets layout |
| Wallet transaction list | Date-grouped rows — mirrors GXBank account detail |
| Squad tab | Blob/wave background — mirrors GXBank Rewards page |
| Savings balances | Cyan accent — mirrors GXBank "Up to 3.55% p.a." chip |

### Tailwind Config
```js
// tailwind.config.js — gx color palette
colors: {
  gx: {
    bg:          '#0A0A14',
    surface:     '#16162A',
    surface2:    '#1E1E30',
    purple:      '#7C3AED',
    purpleLight: '#A78BFA',
    cyan:        '#22D3EE',
    green:       '#4ADE80',
    pink:        '#EC4899',
    amber:       '#F59E0B',
    gradFrom:    '#4C1D95',
    gradTo:      '#831843',
  }
}
```

### Animation
- **Flow salary split:** Money flows from center orb into 3 streams (Framer Motion), then safe-to-spend number scales up
- **Flow shield status:** Progress bar animates from current to new coverage after salary split
- **Smart Auto-Pay notification:** Rich banner slides in from top, auto-dismisses after 4.5s
- **Transaction logged:** Card slides up from bottom, snaps into list
- **Debt settled:** Row fades with green checkmark pulse
- **Streak milestone:** Confetti burst → squad notification slides in

---

## 6. Technical Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│         Next.js 14 (App Router)                  │
│         Tailwind CSS + shadcn/ui                 │
│         Framer Motion (animations)               │
│         Web Speech API (voice capture)           │
└──────────────────┬──────────────────────────────┘
                   │ API Routes
┌──────────────────▼──────────────────────────────┐
│                  BACKEND                         │
│         Next.js API Routes                       │
│                                                  │
│  /api/parse-voice            → Claude Haiku (NLP)                  │
│  /api/parse-receipt          → Claude Sonnet Vision                 │
│  /api/transactions           → Log expense, debit bucket + wallet   │
│  /api/reconcile              → Fuzzy-match incoming payment          │
│  /api/arus (POST)            → Salary split into buckets            │
│  /api/arus (PATCH)           → Update bucket percentages            │
│  /api/transfer               → Send money, debit flex bucket        │
│  /api/transfer/history       → Fetch transfer history               │
│  /api/musim (GET)            → Compute Musim dailyTargets           │
│  /api/musim/toggle           → Enable/disable auto-save             │
│  /api/musim/autosave         → Manual auto-save trigger             │
│  /api/cron/musim-autosave    → Daily cron (00:00 MYT)               │
│  /api/kawan                  → Challenge completion + streak update  │
│  /api/shared-bucket/contribute → Add to squad shared bucket         │
│  /api/rewind                 → Claude Sonnet (story AI)             │
│  /api/demo-state             → Fetch full client state              │
│  /api/seed                   → Seed demo account                    │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              DATA + AI LAYER                     │
│  Supabase (PostgreSQL + Auth + Realtime)         │
│  Claude API (Haiku: NLP / Sonnet: Vision)        │
└─────────────────────────────────────────────────┘
```

**Database Schema (core tables):**
```
users              — id, name, email, income, salary_day
transactions       — id, user_id, amount, category, merchant, date, source (voice/receipt/manual/transfer/musim/salary/salary_savings), notes
debt_records       — id, creditor_id, debtor_id (FK, nullable), debtor_name (nullable), amount, context, transaction_id, status (pending/partial/settled), direction (owe_me/i_owe), settled_at
buckets            — id, user_id, name, percentage, balance, type (savings/bills/flex)
musim_events       — id, user_id, event_name, event_date, estimated_cost, category, is_system, auto_save_enabled, last_auto_save_date
squad              — id, name
squad_members      — squad_id, user_id (many-to-many join)
squad_streaks      — id, user_id, squad_id, current_streak, longest_streak, last_active, savings_rate
shared_buckets     — id, squad_id, name, balance, target_amount (nullable)
shared_bucket_members — bucket_id, user_id, contribution
challenges         — id, squad_id, name, description, start_date, end_date, penalty_amount
challenge_completions — challenge_id, user_id, date, completed
ledger_accounts    — id, type, currency, user_id (unique), balance_sen (BigInt)
ledger_entries     — id, transfer_id, account_id, side (DEBIT/CREDIT), amount_sen, currency
transfers          — id, from_user_id, to_user_id, amount_sen (BigInt), currency, status (POSTED), idempotency_key, debt_record_id (unique FK, nullable), note, posted_at
```

**Money handling:**
- All bucket balances and transaction amounts stored as `Decimal(10,2)` in MYR
- All wallet/transfer amounts stored as `BigInt` in sen (1 MYR = 100 sen) to avoid floating-point drift
- Helper functions: `parseMyrToSen`, `formatSenToMyr`, `splitSenByPercentages` in `lib/finance/money.ts`

---

## 7. Technical Vocabulary (Pitch-Consistent)

These terms must be used consistently across the codebase, demo narration, and pitch deck:

| Implementation | Official Term |
|---|---|
| Voice → Claude → JSON | NLP inference pipeline with intent normalization |
| Receipt → Claude Vision | Multimodal document extraction with structured output enforcement |
| Debt auto-match | Event-driven reconciliation engine with fuzzy entity matching |
| Salary auto-split | Automated financial orchestration layer |
| Safe-to-spend daily budget | Intelligent daily runway calculation with obligation-first reservation (total runway ÷ days until salary) |
| Debt shield coverage | Obligation coverage assessment with triage classification |
| AI split recommendation | Context-aware allocation optimisation with behavioural framing |
| Debt payment → flex deduction | Symmetric bucket settlement: outgoing transfer debits flex bucket to prevent safe-to-spend inflation |
| Squad streaks | Social reinforcement loop with gamified commitment mechanics |
| Musim | Contextual event-driven savings automation |
| Musim daily deduction | Idempotent flex-to-savings transfer gated by `lastAutoSaveDate`, executed by Vercel cron at 00:00 MYT |
| Shared bucket | Escrow-like distributed group fund with auto-settlement |
| SnapIt Rewind story generation | Narrative financial intelligence report via holistic transaction analysis |
| Archetype assignment | AI-driven financial persona classification |
| Smart Auto-Pay trigger | Location + device-aware autonomous micro-payment from Bills bucket |

---

## 8. Demo Path (Locked — The Amirah Flow)

```
SETUP: Demo account pre-loaded as "Amirah, 23, KL. First salary month."

STEP 1 — VOICE INPUT (Feature 1A)
  Press mic → speak: "Paid RM85 at Nando's Midvalley for 4 people"
  NLP pipeline fires → transaction logged
  3 debt records created: Ali RM21.25 / Siti RM21.25 / Hana RM21.25
  Duration: ~15 seconds

STEP 2 — AUTO-RECONCILE (Feature 2A)
  Tap "Simulate incoming transfer" → RM21 from Ali
  Reconciliation engine matches to Ali's debt record
  Status updated to settled ✓, context shown: "Ali — Nando's Midvalley"
  Duration: ~10 seconds

STEP 3 — FLOW SAFE-TO-SPEND (Feature 2B)
  Open Flow tab → Safe-to-Spend shows RM28.61/day
  Debt Shield shows 72% coverage (Watch zone) — RM585 needed, RM420 funded
  Tap "Run salary autopilot" → RM2,800 splits: RM560 savings / RM840 bills / RM1,400 flex
  Inline split line updates live: "Savings RM560 · Bills RM840 · Flex RM1,400"
  Safe-to-Spend recalculates → shield coverage jumps to Protected
  AI recommends 20/25/55 split → "Tune split" to adjust manually
  Duration: ~20 seconds

STEP 3B — SMART AUTO-PAY (Feature 2B extension)
  Scroll to bottom of Arus → Smart Auto-Pay config card visible
  Presenter taps the green dot → rich banner slides from top:
    "CarPlay disconnected · SS2 Damansara"
    "Street parking paid · RM1.00 from Bil Tetap"
  Banner auto-dismisses after 4.5 seconds
  Duration: ~5 seconds

STEP 4 — MUSIM (Feature 2C)
  Banner appears: "Hari Raya in 58 days"
  Tap → plan detail: RM8.62/day auto-savings activated
  Duration: ~10 seconds

STEP 5 — SQUAD (Feature 3)
  Switch to Squad tab → squad switcher shows "KL Kawan Crew" + "Cyberjaya Savers"
  Tap "KL Kawan Crew" → Day 15 streak → 5-member leaderboard → friends react 🔥
  Tap "Cyberjaya Savers" → different leaderboard, different challenge ("Save RM50 This Week")
  Shared bucket switches too: "Bali Trip 2027" → "Weekly Lunch Fund"
  Duration: ~15 seconds

TOTAL DEMO TIME: ~70 seconds
```

---

## 9. Out of Scope (MVP)

- Real GXBank API / banking integration (simulated in demo)
- Real-time multi-user sync for squad (pre-seeded data)
- Actual money movement for shared bucket (UI only)
- Push notifications (in-app only)
- Native mobile app (mobile-first web app)
- User authentication flow (demo uses pre-logged-in state)
- Error states and edge cases (happy path only)

---

## 10. 4-Day Build Plan

| Day | Focus | Goal |
|---|---|---|
| **Day 1** | Foundation + Voice/Receipt input | Voice → transaction and receipt → transaction working end-to-end |
| **Day 2** | Debt reconciliation + Arus + Musim | Full intelligence layer functional |
| **Day 3** | Squad + Shared Bucket + Smart Auto-Pay UI | Social layer and automation demo complete |
| **Day 4** | Polish + Demo path + Pitch | Flawless demo path, pitch deck done, rehearsed x3 |

**70% checkpoint: Day 3 evening** — one person stops coding and switches to pitch full-time.

---

## 11. Judging Rubric Alignment

| Rubric Element | How SnapIt Addresses It |
|---|---|
| **Overall Appearance** | Mobile-first UI with polished fintech aesthetic, animated transitions, pre-seeded realistic data |
| **Creativity / Innovation** | First app to combine zero-friction LLM bookkeeping + event-driven reconciliation + social reinforcement in Malaysian market |
| **Functionality** | Full demo path works end-to-end: voice → log → reconcile → split → plan → auto-pay → social → rewind |
| **Impact** | Targets 3M+ GXBank users; data flywheel moat; directly addresses 67% of Malaysian youth with zero savings |
| **Relevance to Audience** | Built for Malaysian context: ringgit, PTPTN, Raya, ASB — not a generic Western savings app |
