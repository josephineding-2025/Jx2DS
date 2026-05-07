# SnapIt — Development Plan

## Context
Solo 4-day hackathon build for the GXBank Youth Resilience Challenge. SnapIt is a mobile-first web app (Next.js) that acts as an AI-powered financial resilience companion for Malaysian youth. The plan is optimized for demo reliability over feature completeness — every decision prioritizes the 5-step Amirah demo path working flawlessly.

PRD: `/Users/choijs/projects/SnapIt/docs/PRD.md`

---

## Architectural Decisions

1. **No real auth** — `DemoUserProvider` hardcodes Amirah's UUID. Every query uses this fixed ID.
2. **API routes for all LLM calls** — `OPENROUTER_API_KEY` is server-side only, never `NEXT_PUBLIC_`.
3. **Real Supabase persistence** — voice/receipt writes real rows. Demo data persists across refreshes.
4. **Tailwind-first UI** — production UI is implemented with Tailwind utilities; global CSS is limited to app background, scrollbar hiding, and custom keyframes.
5. **Recharts over D3** — declarative API, 10x faster to build Cermin chart.
6. **Haiku for NLP, Sonnet for Vision** — cost/speed optimized per feature.
7. **Mobile-first web app shell** — no fake phone chrome/status bar; content is full viewport on mobile and max-width constrained on desktop.

---

## Folder Structure

```
SnapIt/
├── app/
│   ├── layout.tsx                  # Root layout + metadata
│   ├── globals.css                 # Tailwind import + small global helpers
│   ├── page.tsx                    # Server-loads demo state, renders SnapItApp
│   └── api/
│       ├── parse-voice/route.ts    # Claude Haiku NLP
│       ├── parse-receipt/route.ts  # Claude Sonnet Vision
│       ├── transactions/route.ts   # Persist parsed expense + debt records
│       ├── demo-state/route.ts     # One-shot UI data loader
│       ├── reconcile/route.ts      # Fuzzy debt matching
│       ├── arus/route.ts           # Bucket allocation
│       └── musim/route.ts          # Event savings calc
├── components/
│   └── kira/SnapItApp.tsx            # Tailwind-first app shell + all demo screens
├── lib/
│   ├── db.ts                       # Prisma 7 singleton
│   ├── claude/haiku.ts
│   ├── claude/sonnet.ts
│   ├── finance/projection.ts       # FV = PV × (1+r)^n
│   ├── finance/reconcile.ts        # Token overlap fuzzy match
│   ├── finance/musim.ts
│   └── demo/
│       ├── seed.ts                 # Amirah UUID + squad UUID constants
│       └── state.ts                # Aggregated UI state query
├── hooks/
│   └── useVoiceRecorder.ts         # Web Speech API abstraction
├── providers/DemoUserProvider.tsx
└── types/index.ts
```

---

## Supabase Schema (run in order)

```sql
create extension if not exists "uuid-ossp";

create table users (
  id uuid primary key default uuid_generate_v4(),
  name text not null, email text unique,
  income numeric(10,2) default 0, salary_day int,
  squad_id uuid, created_at timestamptz default now()
);

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  amount numeric(10,2) not null, category text not null default 'Uncategorized',
  merchant text, date date not null default current_date,
  source text check (source in ('voice','receipt','manual','salary','transfer')) default 'manual',
  created_at timestamptz default now()
);
create index idx_transactions_user_date on transactions(user_id, date desc);

create table debt_records (
  id uuid primary key default uuid_generate_v4(),
  creditor_id uuid references users(id) on delete cascade,
  debtor_name text not null, amount numeric(10,2) not null,
  context text, transaction_id uuid references transactions(id),
  status text check (status in ('pending','settled','partial')) default 'pending',
  settled_at timestamptz, created_at timestamptz default now()
);
create index idx_debt_creditor_status on debt_records(creditor_id, status);

create table buckets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  name text not null, percentage int not null, balance numeric(10,2) default 0,
  type text check (type in ('savings','bills','flex')) not null,
  created_at timestamptz default now()
);

create table musim_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  event_name text not null, event_date date not null,
  estimated_cost numeric(10,2) not null, category text default 'festive',
  is_system boolean default false, created_at timestamptz default now()
);

create table squad (id uuid primary key default uuid_generate_v4(), name text not null, created_at timestamptz default now());
create table squad_members (squad_id uuid references squad(id) on delete cascade, user_id uuid references users(id) on delete cascade, primary key (squad_id, user_id));
create table squad_streaks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  squad_id uuid references squad(id) on delete cascade,
  current_streak int default 0, longest_streak int default 0,
  last_active date, savings_rate numeric(5,2) default 0, updated_at timestamptz default now()
);

create table shared_buckets (id uuid primary key default uuid_generate_v4(), squad_id uuid references squad(id) on delete cascade, name text not null, balance numeric(10,2) default 0, target_amount numeric(10,2), created_at timestamptz default now());
create table shared_bucket_members (bucket_id uuid references shared_buckets(id) on delete cascade, user_id uuid references users(id) on delete cascade, contribution numeric(10,2) default 0, primary key (bucket_id, user_id));

-- Disable RLS for MVP
alter table users disable row level security;
alter table transactions disable row level security;
alter table debt_records disable row level security;
alter table buckets disable row level security;
alter table musim_events disable row level security;
alter table squad disable row level security;
alter table squad_members disable row level security;
alter table squad_streaks disable row level security;
alter table shared_buckets disable row level security;
alter table shared_bucket_members disable row level security;
```

---

## Demo Seed Data (run after schema)

Fixed UUIDs for demo stability:
- Amirah: `00000000-0000-0000-0000-000000000001`
- Squad: `00000000-0000-0000-0000-000000000010`
- Shared bucket: `00000000-0000-0000-0000-000000000020`

```sql
-- Users
insert into users (id, name, email, income, salary_day, squad_id) values
  ('00000000-0000-0000-0000-000000000001','Amirah Zahra','amirah@demo.kira',2800,25,'00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000002','Ali Haikal','ali@demo.kira',2400,25,'00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000003','Siti Nurhaliza','siti@demo.kira',3100,25,'00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000004','Hana Soraya','hana@demo.kira',2200,25,'00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000005','Danish Irfan','danish@demo.kira',800,1,'00000000-0000-0000-0000-000000000010');

insert into squad (id, name) values ('00000000-0000-0000-0000-000000000010','KL Kawan Crew');
insert into squad_members (squad_id, user_id) values
  ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000005');

-- Buckets
insert into buckets (user_id, name, percentage, balance, type) values
  ('00000000-0000-0000-0000-000000000001','Simpanan',20,1120,'savings'),
  ('00000000-0000-0000-0000-000000000001','Bil Tetap',30,420,'bills'),
  ('00000000-0000-0000-0000-000000000001','Flex',50,680,'flex');

-- Transactions (14 days of realistic Malaysian spending)
insert into transactions (user_id, amount, category, merchant, date, source) values
  ('00000000-0000-0000-0000-000000000001',-12.50,'Food & Drinks','Tealive TTDI',current_date-13,'manual'),
  ('00000000-0000-0000-0000-000000000001',-45.00,'Groceries','Jaya Grocer SS15',current_date-12,'manual'),
  ('00000000-0000-0000-0000-000000000001',-8.00,'Transport','Grab Car',current_date-12,'manual'),
  ('00000000-0000-0000-0000-000000000001',-85.00,'Food & Drinks','Nando''s Midvalley',current_date-10,'voice'),
  ('00000000-0000-0000-0000-000000000001',-32.00,'Entertainment','TGV Cinemas',current_date-9,'manual'),
  ('00000000-0000-0000-0000-000000000001',-15.00,'Food & Drinks','Makan@Masjid India',current_date-8,'manual'),
  ('00000000-0000-0000-0000-000000000001',-9.50,'Transport','RapidKL Touch n Go',current_date-7,'manual'),
  ('00000000-0000-0000-0000-000000000001',-22.00,'Food & Drinks','Restoran Sri Nirwana',current_date-6,'manual'),
  ('00000000-0000-0000-0000-000000000001',-400.00,'Bills','PTPTN Auto-Debit',current_date-5,'manual'),
  ('00000000-0000-0000-0000-000000000001',-65.00,'Bills','Celcom Postpaid',current_date-4,'manual'),
  ('00000000-0000-0000-0000-000000000001',-18.00,'Food & Drinks','KFC Damansara',current_date-3,'receipt'),
  ('00000000-0000-0000-0000-000000000001',-11.00,'Transport','Grab Car',current_date-2,'manual'),
  ('00000000-0000-0000-0000-000000000001',-28.00,'Food & Drinks','Sushi King',current_date-1,'manual');

-- Debt records (for reconciliation demo)
insert into debt_records (creditor_id, debtor_name, amount, context, status) values
  ('00000000-0000-0000-0000-000000000001','Ali',21.25,'Nando''s Midvalley','pending'),
  ('00000000-0000-0000-0000-000000000001','Siti',21.25,'Nando''s Midvalley','pending'),
  ('00000000-0000-0000-0000-000000000001','Hana',21.25,'Nando''s Midvalley','pending');

-- Squad streaks (leaderboard: Siti #1, Ali #2, Amirah #3, Hana #4, Danish #5)
insert into squad_streaks (user_id, squad_id, current_streak, longest_streak, last_active, savings_rate) values
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010',15,15,current_date,22.5),
  ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000010',12,18,current_date,28.3),
  ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000010',20,20,current_date,31.0),
  ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000010',7,14,current_date,18.0),
  ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000010',3,9,current_date-1,12.5);

-- Musim events
insert into musim_events (user_id, event_name, event_date, estimated_cost, category, is_system) values
  ('00000000-0000-0000-0000-000000000001','Hari Raya Aidilfitri','2026-03-30',500,'festive',true),
  ('00000000-0000-0000-0000-000000000001','Semester Fees (July)','2026-07-01',1800,'education',true),
  ('00000000-0000-0000-0000-000000000001','PTPTN Annual Review','2026-09-01',200,'debt',true),
  ('00000000-0000-0000-0000-000000000001','Year-End Festive','2026-12-15',400,'festive',true);

-- Shared bucket
insert into shared_buckets (id, squad_id, name, balance, target_amount) values
  ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000010','Bali Trip 2027',1350,5000);
insert into shared_bucket_members (bucket_id, user_id, contribution) values
  ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001',270),
  ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000002',270),
  ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000003',270),
  ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000004',270),
  ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000005',270);
```

---

## API Route Specs

| Route | Input | Output | LLM |
|---|---|---|---|
| `POST /api/parse-voice` | `{ transcript: string }` | Normalized transaction JSON | Haiku |
| `POST /api/parse-receipt` | `{ imageBase64, mimeType }` | Normalized transaction JSON | Sonnet Vision |
| `POST /api/transactions` | `{ userId, source, expense }` | Saved transaction + debt records | None |
| `GET /api/demo-state` | `?userId&squadId` | Aggregated user, txns, debts, buckets, musim, squad | None |
| `POST /api/reconcile` | `{ senderName, amount, userId }` | `{ matched, debtRecordId, debtorName, context, delta, remainingBalance }` | None |
| `POST /api/arus` | `{ userId, amount }` | `{ allocations: [{bucketId, bucketName, type, percentage, amount, newBalance}] }` | None |
| `GET /api/musim` | `?userId&from` | `{ events: [{eventName, daysRemaining, dailyTarget}] }` | None |

**Haiku system prompt (exact):**
```
You are a Malaysian expense parser. Return ONLY valid JSON — no markdown, no text before or after. 
Use categories: "Food & Drinks", "Transport", "Groceries", "Entertainment", "Bills", "Shopping", "Health", "Others". 
Currency is always MYR. The logged-in user does NOT appear in debt_records. 
For unnamed participants use "unknown_1", "unknown_2" etc.
```
Strip markdown fences before `JSON.parse`: `text.replace(/\`\`\`json\n?|\n?\`\`\`/g, '').trim()`

**Reconcile fuzzy match:**
```typescript
function nameSimilarity(a: string, b: string): number {
  const tokensA = a.toLowerCase().split(/\s+/);
  const tokensB = b.toLowerCase().split(/\s+/);
  const intersection = tokensA.filter(t => tokensB.includes(t));
  return intersection.length / Math.max(tokensA.length, tokensB.length);
}
// Match threshold: score > 0.7 AND amount within ±10% or ±RM1
```

**Cermin formula:**
```typescript
function buildSeries(monthlyContrib: number, currentSavings: number) {
  const r = 0.04 / 12;
  return Array.from({ length: 84 }, (_, i) => ({
    age: (23 + i / 12).toFixed(1),
    value: Math.round(currentSavings * Math.pow(1+r, i) + monthlyContrib * ((Math.pow(1+r, i)-1) / r))
  }));
}
```

---

## Environment Variables

```bash
# .env.local
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
OPENROUTER_API_KEY="sk-or-v1-..."             # server only — NEVER NEXT_PUBLIC_
LLM_NLP_MODEL="anthropic/claude-haiku-4-5"
LLM_VISION_MODEL="anthropic/claude-sonnet-4-6"
NEXT_PUBLIC_DEMO_USER_ID=00000000-0000-0000-0000-000000000001
NEXT_PUBLIC_DEMO_SQUAD_ID=00000000-0000-0000-0000-000000000010
NEXT_PUBLIC_APP_URL=https://kira.vercel.app
```

---

## Day-by-Day Checklist

### Status Update — 2026-05-05 (Session 1)
- [x] Migrated `docs/kira-ui` mock into real Next/React UI at `components/kira/SnapItApp.tsx`
- [x] Converted implementation to Tailwind-first styling; `app/globals.css` now only holds Tailwind import, global background, scrollbar helper, and keyframes
- [x] Removed mock phone chrome/status bar; app is now mobile-first web UI with max-width desktop constraint
- [x] Added `GET /api/demo-state` for aggregated UI data
- [x] Added `POST /api/transactions` to persist confirmed parsed voice/receipt expenses and debt records
- [x] Updated reconcile to create a transfer transaction and settle demo-tolerant matches such as Ali RM21 vs RM21.25
- [x] Updated seed Hari Raya date from past 2026 event to 2027-03-10
- [x] Fixed Web Speech API TypeScript definitions
- [x] Ignored standalone `docs/kira-ui` Babel mock files in ESLint
- [x] Removed `next/font` Google fetch dependency so builds do not need network access
- [x] Verification passed: `pnpm lint`, `pnpm exec tsc --noEmit --pretty false`, `pnpm build`

### Status Update — 2026-05-05 (Session 2 — Full Fix Pass)

**Schema & Migration**
- [x] Added `notes String?` to `Transaction` model
- [x] Added `direction String @default("owe_me")` to `DebtRecord` model
- [x] Added `autoSaveEnabled Boolean @default(false)` to `MusimEvent` model
- [x] Added `Challenge` model with `id, squadId, name, description, startDate, endDate, penaltyAmount, createdAt`
- [x] Added `ChallengeCompletion` model with composite PK `(challengeId, userId, date)` and `completed Boolean`
- [x] Migration applied: `20260505085844_add_challenges_notes_direction`

**Types**
- [x] `types/index.ts` updated: `notes` on Transaction, `direction` on DebtRecord, `autoSaveEnabled` on MusimEvent, `Challenge` and `ChallengeCompletion` interfaces added

**Seed**
- [x] `POST /api/seed`: seeds 1 Challenge ("No Bubble Tea Week", 7-day, penaltyAmount RM5) + 4 completed ChallengeCompletion rows (days −4 to −1)
- [x] `DELETE /api/seed`: resets sharedBucket balance + challenge completions back to initial state
- [x] Debt seed rows now explicitly include `direction: "owe_me"`

**Data Layer**
- [x] `lib/demo/state.ts`: parallel query for active challenge with nested completions; `direction` on debts; `autoSaveEnabled` on musim events; `challenge` added to return shape
- [x] `lib/finance/musim.ts`: `autoSaveEnabled` threaded through `MusimCalc` interface

**New API Routes**
- [x] `POST /api/transactions`: now persists `notes` field
- [x] `POST /api/kawan`: upserts ChallengeCompletion as broken, increments SharedBucket.balance by penaltyAmount
- [x] `POST /api/musim/toggle`: updates `autoSaveEnabled` on a MusimEvent
- [x] `POST /api/shared-bucket/contribute`: increments SharedBucketMember.contribution + SharedBucket.balance

**SnapItApp.tsx — Full Rewrite (~1800 lines)**
- [x] `greeting()` helper: Good morning / afternoon / evening based on hour
- [x] HomeScreen: savings rate from `bucket.percentage`, computed weekly delta, request button wired to sheet
- [x] DuitScreen: 3-segment control (Transactions / Owes Me / I Owe), reconcile form with name+amount inputs + "Demo: Ali RM21" prefill, escrow concept card, I Owe filters `direction === "i_owe"`
- [x] ArusScreen: dynamic salary display from `data.user.income`, pre-authorised payments section (PTPTN + Celcom static cards)
- [x] KawanScreen: challenge wired from DB — day tracker circles, "I broke it today" penalty button, Contribute is a real button opening ContributeSheet
- [x] CerminScreen: all three slider defaults changed from `(200, 150, 80)` → `(0, 0, 0)` so chart starts with identical lines
- [x] BucketCard: `AnimatedProgress` component (Framer Motion spring), fill formula uses `balance / (income × percentage/100)`
- [x] MusimCard: removed broken progress bar, added auto-save toggle (calls `/api/musim/toggle`)
- [x] ParsedExpenseCard: amount, merchant, and debt amounts are all inline-editable
- [x] Segmented: dynamic `gridTemplateColumns` — no longer hardcoded to 2 columns
- [x] New `RequestSheet` component (mock payment request flow)
- [x] New `ContributeSheet` component (preset RM50/100/200 + custom amount)
- [x] Verification passed: `pnpm exec tsc --noEmit` (zero errors), `pnpm lint` (zero warnings)

### Day 1 — Scaffold + Backend ✅ COMPLETE
- [x] Scaffold Next.js 16 with pnpm, TypeScript, Tailwind, App Router
- [x] Install: `framer-motion recharts openai lucide-react @prisma/adapter-pg pg`
- [x] Prisma 7 schema — all 9 models (users, transactions, debt_records, buckets, musim_events, squad, squad_members, squad_streaks, shared_buckets, shared_bucket_members)
- [x] `prisma migrate dev --name init` — tables created in Supabase Postgres
- [x] `POST /api/seed` + `DELETE /api/seed` — full seed + demo reset
- [x] Seed run — Amirah + squad + transactions + debts + musim events in DB
- [x] `lib/claude/haiku.ts` — OpenRouter NLP parser (model from `LLM_NLP_MODEL` env)
- [x] `lib/claude/sonnet.ts` — OpenRouter Vision parser (model from `LLM_VISION_MODEL` env)
- [x] `lib/finance/reconcile.ts` — fuzzy name + amount matching
- [x] `lib/finance/musim.ts` — days remaining + daily savings calc
- [x] `lib/finance/projection.ts` — compound growth `FV = PV × (1+r)^n`
- [x] `hooks/useVoiceRecorder.ts` — Web Speech API abstraction
- [x] `providers/DemoUserProvider.tsx` — hardcoded Amirah UUID context
- [x] `POST /api/parse-voice` — transcript → OpenRouter → ParsedExpense JSON ✓
- [x] `POST /api/parse-receipt` — base64 image → OpenRouter Vision → ParsedExpense JSON ✓
- [x] `POST /api/reconcile` — fuzzy match + Prisma update ✓
- [x] `POST /api/arus` — salary split → bucket balance update ✓
- [x] `GET /api/musim` — countdown + daily targets ✓
- [x] `app/test/page.tsx` — minimal test UI at `/test`
- [x] **Day 1 gate:** All 5 backend routes verified via `/test` ✓

**Tech decisions made:**
- Switched `@anthropic-ai/sdk` → `openai` (OpenRouter-compatible)
- Switched Supabase JS client → Prisma 7 + `@prisma/adapter-pg`
- LLM model IDs configurable via `LLM_NLP_MODEL` / `LLM_VISION_MODEL` env vars
- `.env.example` documents all required variables

### Day 2 — Wire Backend → UI ✅ COMPLETE
- [x] Connect `POST /api/parse-voice` to VoiceSheet → save transaction + debt_records to DB on confirm
- [x] Connect `POST /api/parse-receipt` to ReceiptSheet → save on confirm
- [x] Build `DuitTabs` — Transactions tab + Owes Me tab
- [x] `TransactionList` — fetch from DB, date-grouped rows
- [x] `DebtList` / `DebtRow` — fetch pending debts, live status
- [x] `SimulateTransferButton` → `POST /api/reconcile` → refresh settled row
- [x] Connect `POST /api/arus` to Arus tab `SimulateSalaryButton` → bucket updates
- [x] Connect Musim data to Home tab `MusimStrip` via `GET /api/demo-state`
- [x] `BalanceCard` — sum of bucket balances from DB
- [x] **Day 2 gate:** Demo steps 1–4 are wired through real UI and Prisma-backed routes ✓

### Day 3 — Cermin + Kawan + Polish Pass 1 ✅ COMPLETE
- [x] `ProjectionChart` — Recharts AreaChart using `lib/finance/projection.ts`
- [x] `SavingsSlider` / `SpendingSliders` → real-time chart redraw
- [x] `ProjectionDelta` — RM difference callout
- [x] Kawan tab — leaderboard from `squad_streaks`, streak badges
- [x] `ChallengeCard` wired to DB — day tracker, penalty button, contribute sheet
- [x] `SharedBucketCard` with real contribute flow (`POST /api/shared-bucket/contribute`)
- [x] `TransactionFeed` / `TransactionRow` with category icon map
- [x] All 5 tabs navigable in the real app shell
- [x] Bidirectional debt: "I Owe" segment added to Duit tab
- [x] Cermin slider defaults fixed — chart starts with identical lines
- [x] Animated bucket progress bars (Framer Motion spring)
- [x] ParsedExpenseCard inline editing (amount, merchant, debt splits)
- [ ] Full timed demo rehearsal end-to-end without crash
- [ ] **Day 3 gate:** Full demo completes without crash in a rehearsed run

### Day 4 — Polish + Demo Hardening + Deploy
- [x] Audit primary screen styling: border radius, button sizes, font weights, tabular-nums
- [x] Add page transitions (`AnimatePresence` + `motion.div` opacity+y)
- [x] Remove mock phone chrome/status bar for true mobile-first web layout
- [x] Demo Reset button → `DELETE /api/seed`
- [x] Production build passes locally
- [ ] Seed the demo: `POST /api/seed` → verify challenge rows created correctly
- [ ] Run full demo path end-to-end (6 steps) — verify no crash
- [ ] Verify 390px mobile viewport — fix any overflow
- [ ] Test voice phrase 5× — tune system prompt if needed
- [ ] Pre-grant microphone permission in demo browser
- [ ] `vercel deploy --prod` → verify all API routes in production
- [ ] Set all env vars in Vercel dashboard
- [ ] Run full demo 3× timing each step
- [ ] Record backup video of demo
- [ ] **Day 4 gate:** Demo runs in <90s, deployed, backup recording exists

---

## Implementation Gotchas

- **Voice API browser support:** Chrome/Edge desktop, Safari iOS 16+. `useVoiceRecorder` checks on mount and returns `state: 'unsupported'`. Demo in Chrome.
- **Receipt image size:** Canvas resize to max 1024px before base64 encode (in `app/test/page.tsx` and future ReceiptSheet). Cuts vision latency ~3×.
- **LLM JSON fences:** `stripFences()` in both lib/claude files strips ` ```json ``` ` before `JSON.parse`.
- **OpenRouter models:** Swap any model via `LLM_NLP_MODEL` / `LLM_VISION_MODEL` env vars — no code change needed.
- **Arus number animation:** Use Framer Motion `useMotionValue` + `animate()`, not `innerHTML`. Format with `toLocaleString('en-MY')`.
- **Musim dates:** Hari Raya seed is now `2027-03-10`; keep checking dates before final demo because seasonal events are time-sensitive.
- **Prisma singleton:** `lib/db.ts` reuses `globalForPrisma.prisma` to avoid connection exhaustion in Next.js dev hot-reload.
- **UI state loading:** Real UI uses `GET /api/demo-state` as a single aggregated data source, then refreshes after mutations.
- **Persisting parsed expenses:** `POST /api/parse-voice` and `POST /api/parse-receipt` only parse; `POST /api/transactions` persists confirmed expenses and debt rows.
- **Standalone prototype:** `docs/kira-ui/**` remains as source reference only and is ignored by ESLint.
- **Build networking:** `next/font` was removed so local builds do not need to fetch Google Fonts.
- **Turbopack sandbox:** `pnpm build` may need permission to run the Next/Turbopack helper process in this environment.
- **Demo receipt:** `/Users/choijs/Downloads/receipt.jpeg` confirmed working — use this or any similar Malaysian restaurant receipt.
- **Demo reset:** `DELETE /api/seed` resets debt statuses + bucket balances without wiping transaction history.

---

## Verification (Demo Path)

```
1. Press mic → say "Paid RM85 at Nando's Midvalley for 4 people"
   Expected: VoiceConfirm shows RM85, 3 debt records (Ali/Siti/Hana RM21.25 each)
   Tap Save → rows appear in Duit → Owes Me tab

2. Duit tab → Owes Me → SimulateTransferButton → enter "Ali" RM21
   Expected: Ali's row animates green ✓ and fades, "settled" status in Supabase

3. Home tab → SimulateSalaryButton → RM2,800
   Expected: BucketAnimator fires → Savings fills cyan (RM560), Bills purple (RM840), Flex amber (RM1,400)

4. Home tab → Musim strip shows upcoming events from `/api/demo-state`
   Expected: Hari Raya 2027 / semester / PTPTN cards show positive day counts and daily targets

5. Cermin tab → drag savings slider +RM200 → chart redraws → RM4,200 jumps to RM28,600
   Kawan tab → Amirah shows Day 15 streak, ranked in leaderboard
```

## Latest Verification — 2026-05-05 (Session 2)

```bash
pnpm exec tsc --noEmit --pretty false         # pass — zero type errors after full SnapItApp rewrite
pnpm lint                                      # pass — zero errors, zero warnings
```

**Pending verification (do before deploy):**
```
POST /api/seed                                 # seed challenge + completions
GET  /api/demo-state?userId=...&squadId=...   # check challenge field present
Demo step 1: voice → parse → save → Duit tab
Demo step 2: reconcile form → enter Ali RM21 → row goes green
Demo step 3: Arus → simulate salary → buckets animate
Demo step 4: Home → Musim strip shows positive day counts
Demo step 5: Cermin → sliders from 0 → chart gap opens
Demo step 6: Kawan → challenge day tracker, penalty button
```
