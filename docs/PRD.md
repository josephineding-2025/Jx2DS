# Kira — Product Requirements Document

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

**Kira** is an AI-powered financial resilience companion for Malaysian students and fresh graduates. It removes every friction point in financial management through:

1. **Zero-friction bookkeeping** — log expenses by voice or receipt photo in seconds
2. **Context-aware money intelligence** — automatically reconcile debts, split income into buckets, and plan for known seasonal expenses
3. **Social accountability** — a squad system that makes saving visible, social, and rewarding
4. **Behavioural simulation** — a future-self projection that makes the cost of bad habits visceral and real

Kira is built on GXBank's transaction infrastructure and designed as a native feature extension — not a standalone app competing with GXBank, but a financial intelligence layer on top of it.

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
- User forwards a receipt image from WhatsApp into Kira
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
- When a transaction is logged with participants, debt records are created automatically
- When an incoming transfer is detected (manual trigger in MVP; GXBank webhook in production), the reconciliation engine fuzzy-matches sender name + amount against outstanding debt records
- On match: debt record is marked settled, user is notified with context ("Ali paid back his share of Nando's")
- On partial payment: remaining balance updated, user notified
- On no match: logged as unattributed income for user to categorize

**Feature B: Salary Autopilot — Arus (Automated Financial Orchestration Layer)**
- User configures split percentages once: e.g. 20% savings / 30% bills / 50% flex
- When salary is detected (pattern-matched by amount + recurring sender), orchestration layer triggers
- Animated bucket-split UI shows money flowing into each bucket
- Each bucket has a balance and spending limit
- Overspending a bucket triggers a nudge (not a block — behavioural, not punitive)

**Feature C: Seasonal Financial Awareness — Musim (Contextual Event-Driven Savings Automation)**
- Pre-loaded Malaysian financial events:
  - Hari Raya Aidilfitri
  - Hari Raya Aidiladha
  - University semester fee cycles (Jan, Jul)
  - PTPTN repayment dates
  - Year-end festive season (Dec)
- Each event has an estimated cost (user-editable, defaults based on category)
- System calculates daily micro-savings amount needed and activates automatically
- Displayed as a countdown card on the home screen: *"Raya in 58 days — RM8.62/day auto-saved"*

---

### 4.3 Social Accountability — Kawan Duit (Social Reinforcement Loop)

**Feature A: Squad System**
- User invites 3–5 friends to a squad
- Each squad member's savings streak and savings rate (% of income) are visible — never raw amounts (privacy-first)
- Leaderboard ranked by savings rate, not net worth — levels the playing field

**Feature B: Streaks & Milestones**
- A "streak" is maintained when the user logs at least one transaction per day and stays within their flex bucket
- Milestone events (Day 7, Day 14, Day 30, RM1K saved) trigger squad-visible celebrations
- Squad members can react with emoji
- Broken streak triggers a nudge visible to the squad (opt-in)

**Feature C: Group Challenges**
- Squad creates a 30-day challenge (e.g. "No bubble tea week", "Save RM50 this week")
- Each member marks daily compliance
- Leaderboard updates in real time
- Completion rate shown as a group stat

**Feature D: Shared Bucket (Escrow-Like Group Fund)**
- Squad can create a named shared bucket (e.g. "Bali Trip 2027", "Weekly Lunch Fund")
- Each member pre-transfers a fixed amount into the bucket
- When one member pays for the group, they submit the amount → system auto-deducts each member's share from the shared bucket and credits the payer
- Full transaction history visible to all members
- *Note: In MVP, bucket balance is simulated. Real transfer integration is production scope.*

---

### 4.4 Future Self Projection — Cermin (Longitudinal Behavioural Financial Simulation)

- Displays two projected financial states at age 30: "Current You" vs "Optimised You"
- User adjusts sliders: savings rate, spending by category (food, transport, entertainment)
- Compound growth formula recalculates in real time: `FV = PV × (1 + r)^n`
- Assumes 4% annual return (ASB / fixed deposit baseline for Malaysian context)
- Visual: split projection graph, RM difference highlighted prominently
- Motivational framing: *"This one change is worth RM24,400 by the time you're 30."*

---

## 5. UI Design Language

### Philosophy
Kira mirrors GXBank's visual identity so it reads as a natural feature extension — not a competing app. Judges from GXBank should feel at home immediately.

### Color Tokens
```
Background:       #0A0A14  (GXBank dark base)
Card surface:     #16162A  (elevated cards)
Card surface 2:   #1E1E30  (nested/secondary cards)

Hero gradient:    #4C1D95 → #831843  (GXBank signature purple-to-magenta, top of every key screen)
Primary CTA:      #7C3AED  (purple — all circular action buttons)
Primary light:    #A78BFA  (hover/pressed states)

Savings accent:   #22D3EE  (cyan — used for savings buckets, Arus, Cermin positive line)
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
| Home, Arus, Cermin | Purple-magenta gradient header |
| All action buttons (Voice, Receipt, Request) | Purple circles — identical to GXBank's Add/Scan/Send |
| Arus buckets | Dual card grid — mirrors GXBank Pockets layout |
| Duit transaction list | Date-grouped rows — mirrors GXBank account detail |
| Kawan squad tab | Blob/wave background — mirrors GXBank Rewards page |
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
- **Arus salary split:** Money flows from center circle into 3 buckets (Framer Motion)
- **Transaction logged:** Card slides up from bottom, snaps into list
- **Debt settled:** Row fades with green checkmark pulse
- **Cermin slider:** Chart redraws with spring curve on every slider change
- **Streak milestone:** Confetti burst → squad notification slides in

---

## 6. Technical Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│         Next.js 14 (App Router)                  │
│         Tailwind CSS + shadcn/ui                 │
│         Framer Motion (animations)               │
│         Recharts (Cermin projection)             │
│         Web Speech API (voice capture)           │
└──────────────────┬──────────────────────────────┘
                   │ API Routes
┌──────────────────▼──────────────────────────────┐
│                  BACKEND                         │
│         Next.js API Routes                       │
│                                                  │
│  /api/parse-voice    → Claude Haiku              │
│  /api/parse-receipt  → Claude Sonnet (Vision)    │
│  /api/reconcile      → Reconciliation engine     │
│  /api/arus           → Bucket orchestration      │
│  /api/musim          → Event savings calculator  │
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
users           — id, name, income, salary_day, squad_id
transactions    — id, user_id, amount, category, merchant, date, source (voice/receipt/manual)
debt_records    — id, creditor_id, debtor_name, amount, context, status, settled_at
buckets         — id, user_id, name, percentage, balance, type (savings/bills/flex)
musim_events    — id, user_id, event_name, event_date, estimated_cost, daily_target
squad           — id, name, members[]
squad_streaks   — id, user_id, squad_id, current_streak, last_active, savings_rate
shared_buckets  — id, squad_id, name, balance, members[], transactions[]
```

---

## 7. Technical Vocabulary (Pitch-Consistent)

These terms must be used consistently across the codebase, demo narration, and pitch deck:

| Implementation | Official Term |
|---|---|
| Voice → Claude → JSON | NLP inference pipeline with intent normalization |
| Receipt → Claude Vision | Multimodal document extraction with structured output enforcement |
| Debt auto-match | Event-driven reconciliation engine with fuzzy entity matching |
| Salary auto-split | Automated financial orchestration layer |
| Cermin projection | Longitudinal behavioural financial simulation |
| Squad streaks | Social reinforcement loop with gamified commitment mechanics |
| Musim | Contextual event-driven savings automation |
| Shared bucket | Escrow-like distributed group fund with auto-settlement |

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

STEP 3 — ARUS SALARY SPLIT (Feature 2B)
  Tap "Simulate salary received" → RM2,800 from employer
  Animated split: RM560 → Savings / RM840 → Bills / RM1,400 → Flex
  Buckets update with fill animation
  Duration: ~15 seconds

STEP 4 — MUSIM (Feature 2C)
  Banner appears: "Hari Raya in 58 days"
  Tap → plan detail: RM8.62/day auto-savings activated
  Duration: ~10 seconds

STEP 5 — CERMIN + SQUAD (Features 3 + 4)
  Open Cermin → graph shows RM4,200 at age 30 (current trajectory)
  Drag savings slider +RM200/month → graph updates → RM28,600
  Switch to Squad tab → Day 15 streak → friends react 🔥
  Duration: ~20 seconds

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
| **Day 3** | Cermin + Squad + Shared Bucket UI | Social and visualization layer complete |
| **Day 4** | Polish + Demo path + Pitch | Flawless demo path, pitch deck done, rehearsed x3 |

**70% checkpoint: Day 3 evening** — one person stops coding and switches to pitch full-time.

---

## 11. Judging Rubric Alignment

| Rubric Element | How Kira Addresses It |
|---|---|
| **Overall Appearance** | Mobile-first UI with polished fintech aesthetic, animated transitions, pre-seeded realistic data |
| **Creativity / Innovation** | First app to combine zero-friction LLM bookkeeping + event-driven reconciliation + social reinforcement in Malaysian market |
| **Functionality** | Full demo path works end-to-end: voice → log → reconcile → split → plan → visualize → social |
| **Impact** | Targets 3M+ GXBank users; data flywheel moat; directly addresses 67% of Malaysian youth with zero savings |
| **Relevance to Audience** | Built for Malaysian context: ringgit, PTPTN, Raya, ASB — not a generic Western savings app |
