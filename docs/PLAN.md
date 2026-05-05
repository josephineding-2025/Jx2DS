# Kira — Development Plan

## Context
Solo 4-day hackathon build for the GXBank Youth Resilience Challenge. Kira is a mobile-first web app (Next.js) that acts as an AI-powered financial resilience companion for Malaysian youth. The plan is optimized for demo reliability over feature completeness — every decision prioritizes the 5-step Amirah demo path working flawlessly.

PRD: `/Users/choijs/projects/Kira/docs/PRD.md`

---

## Architectural Decisions

1. **No real auth** — `DemoUserProvider` hardcodes Amirah's UUID. Every query uses this fixed ID.
2. **API routes for all LLM calls** — `ANTHROPIC_API_KEY` is server-side only, never `NEXT_PUBLIC_`.
3. **Real Supabase persistence** — voice/receipt writes real rows. Demo data persists across refreshes.
4. **Framer Motion for all animations** — no CSS transitions. `AnimatePresence` for list mutations.
5. **Recharts over D3** — declarative API, 10x faster to build Cermin chart.
6. **Haiku for NLP, Sonnet for Vision** — cost/speed optimized per feature.

---

## Folder Structure

```
Kira/
├── app/
│   ├── layout.tsx                  # Root layout: fonts, providers
│   ├── globals.css
│   ├── (shell)/                    # Route group: tab shell
│   │   ├── layout.tsx              # DemoUserProvider + TabBar
│   │   ├── home/page.tsx
│   │   ├── duit/page.tsx
│   │   ├── arus/page.tsx
│   │   ├── kawan/page.tsx
│   │   └── cermin/page.tsx
│   └── api/
│       ├── parse-voice/route.ts    # Claude Haiku NLP
│       ├── parse-receipt/route.ts  # Claude Sonnet Vision
│       ├── reconcile/route.ts      # Fuzzy debt matching
│       ├── arus/route.ts           # Bucket allocation
│       └── musim/route.ts          # Event savings calc
├── components/
│   ├── ui/                         # shadcn primitives
│   ├── layout/
│   │   ├── TabBar.tsx
│   │   ├── GradientHeader.tsx      # Purple→magenta hero, reused everywhere
│   │   └── PageShell.tsx
│   ├── home/
│   │   ├── BalanceCard.tsx
│   │   ├── QuickActions.tsx        # 3 purple circles: Voice/Receipt/Request
│   │   ├── MusimStrip.tsx
│   │   ├── MusimEventCard.tsx
│   │   ├── TransactionFeed.tsx
│   │   └── TransactionRow.tsx
│   ├── voice/
│   │   ├── VoiceSheet.tsx
│   │   ├── VoiceWaveform.tsx       # Animated bars
│   │   ├── VoiceTranscript.tsx
│   │   └── VoiceConfirm.tsx
│   ├── receipt/
│   │   ├── ReceiptSheet.tsx
│   │   ├── ReceiptPreview.tsx
│   │   └── ReceiptConfirm.tsx
│   ├── duit/
│   │   ├── DuitTabs.tsx
│   │   ├── TransactionList.tsx
│   │   ├── DebtList.tsx
│   │   ├── DebtRow.tsx
│   │   └── SimulateTransferButton.tsx
│   ├── arus/
│   │   ├── SalaryHeader.tsx
│   │   ├── BucketGrid.tsx
│   │   ├── BucketCard.tsx
│   │   ├── BucketAnimator.tsx      # Most complex Framer Motion orchestration
│   │   └── SimulateSalaryButton.tsx
│   ├── kawan/
│   │   ├── SquadHeader.tsx
│   │   ├── LeaderboardList.tsx
│   │   ├── LeaderboardRow.tsx
│   │   ├── ChallengeCard.tsx
│   │   ├── SharedBucketCard.tsx
│   │   └── StreakBadge.tsx
│   └── cermin/
│       ├── CerminHeader.tsx
│       ├── ProjectionChart.tsx     # Recharts dual-line area chart
│       ├── SavingsSlider.tsx
│       ├── SpendingSliders.tsx
│       └── ProjectionDelta.tsx
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   ├── supabase/types.ts
│   ├── claude/haiku.ts
│   ├── claude/sonnet.ts
│   ├── finance/projection.ts       # FV = PV × (1+r)^n
│   ├── finance/reconcile.ts        # Token overlap fuzzy match
│   ├── finance/musim.ts
│   └── demo/seed.ts                # Amirah UUID + squad UUID constants
├── hooks/
│   ├── useVoiceRecorder.ts         # Web Speech API abstraction
│   ├── useProjection.ts
│   └── useDemoUser.ts
├── providers/DemoUserProvider.tsx
├── constants/
│   ├── musim.ts                    # Hardcoded 2026 Malaysian events
│   ├── categories.ts
│   └── squad.ts                    # Pre-seeded leaderboard data
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
| `POST /api/reconcile` | `{ senderName, amount, userId }` | `{ matched, debt_record_id, context, delta }` | None |
| `POST /api/arus` | `{ userId, amount }` | `{ allocations: [{bucket, percentage, amount}] }` | None |
| `GET /api/musim` | `?userId&from` | `{ events: [{event_name, days_remaining, daily_target}] }` | None |

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
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # safe for browser
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # server only
ANTHROPIC_API_KEY=sk-ant-api03-...            # server only — NEVER NEXT_PUBLIC_
NEXT_PUBLIC_DEMO_USER_ID=00000000-0000-0000-0000-000000000001
NEXT_PUBLIC_DEMO_SQUAD_ID=00000000-0000-0000-0000-000000000010
NEXT_PUBLIC_APP_URL=https://kira.vercel.app
```

---

## Day-by-Day Checklist

### Day 1 — Scaffold + Voice + Receipt
- [ ] `npx create-next-app@latest kira --typescript --tailwind --app`
- [ ] Install: `framer-motion recharts @anthropic-ai/sdk @supabase/supabase-js lucide-react`
- [ ] `npx shadcn@latest init` + add: button, card, dialog, sheet, slider, tabs
- [ ] Configure `tailwind.config.ts` with GX color palette
- [ ] Build: `GradientHeader`, `TabBar`, `PageShell`, `(shell)/layout.tsx`
- [ ] Create Supabase project → run schema SQL → run seed SQL
- [ ] Build `useVoiceRecorder.ts` (Web Speech API, works Chrome/Safari only)
- [ ] Build `VoiceSheet`, `VoiceWaveform`, `VoiceTranscript`, `VoiceConfirm`
- [ ] Implement `POST /api/parse-voice` (Haiku call → JSON → Supabase write)
- [ ] Build `ReceiptSheet`, `ReceiptPreview` (Canvas resize to 1024px before encode)
- [ ] Implement `POST /api/parse-receipt` (Sonnet Vision → same JSON schema)
- [ ] Build `ReceiptConfirm`
- [ ] Build `BalanceCard`, `QuickActions` for Home tab
- [ ] **Day 1 gate:** Voice → transaction + debts in Supabase ✓ Receipt → transaction ✓

### Day 2 — Reconcile + Arus + Musim
- [ ] Build `lib/finance/reconcile.ts` (token overlap scorer)
- [ ] Implement `POST /api/reconcile`
- [ ] Build `DuitTabs`, `TransactionList`, `DebtList`, `DebtRow`
- [ ] Build `SimulateTransferButton` → reconcile → Supabase Realtime update → animate settled row
- [ ] Build `SalaryHeader`, `BucketCard`, `BucketGrid`
- [ ] Implement `POST /api/arus`
- [ ] Build `BucketAnimator` (Framer Motion sequence: pulse → lines extend → fill bars animate)
- [ ] Build `SimulateSalaryButton`
- [ ] Define `constants/musim.ts` with 2026 dates
- [ ] Implement `GET /api/musim` (pure calculation, no DB)
- [ ] Build `MusimStrip`, `MusimEventCard`
- [ ] **Day 2 gate:** Full demo steps 1–4 work in sequence ✓

### Day 3 — Cermin + Kawan + Polish Pass 1
- [ ] Build `lib/finance/projection.ts` (`buildSeries` function)
- [ ] Build `ProjectionChart` (Recharts AreaChart, two Area lines, `animationDuration={300}`)
- [ ] Build `SavingsSlider`, `SpendingSliders`, `ProjectionDelta`
- [ ] Build `CerminHeader`
- [ ] Build Kawan tab: `SquadHeader`, `LeaderboardList`, `LeaderboardRow`, `StreakBadge`
- [ ] Build `ChallengeCard`, `SharedBucketCard` (static, pre-seeded)
- [ ] Build `DemoUserProvider.tsx` — loads Amirah's data, exposes via context
- [ ] Complete `TransactionFeed`, `TransactionRow` with category icon map
- [ ] Run full demo path end-to-end → fix any crashes
- [ ] **Day 3 gate:** All 5 tabs navigable, full demo completes without crash ✓

### Day 4 — Polish + Demo Hardening + Deploy
- [ ] Audit every screen vs GXBank screenshots: radius, button sizes, font weights
- [ ] Add page transitions (`AnimatePresence` + `motion.div` opacity+y)
- [ ] Verify 390px mobile viewport — fix any overflow
- [ ] Add `tabular-nums` to all monetary values
- [ ] Add loading skeletons to data-fetching screens
- [ ] Build hidden "Demo Reset" button (swipe left on TabBar logo) — resets debts to pending, buckets to pre-salary
- [ ] Test voice phrase "Paid RM85 at Nando's Midvalley for 4 people" 5× — adjust system prompt if needed
- [ ] Pre-grant microphone permission in the demo browser before presenting
- [ ] `vercel deploy --prod` → verify all API routes work in production
- [ ] Set all env vars in Vercel dashboard
- [ ] Run full demo 3× timing each step
- [ ] Record backup video of demo
- [ ] **Day 4 gate:** Demo runs in <90s, deployed, backup recording exists ✓

---

## Implementation Gotchas

- **Voice API browser support:** Chrome/Edge desktop, Safari iOS 16+. Add `window.SpeechRecognition` check on mount, show toast if unsupported. Demo in Chrome.
- **Receipt image size:** Resize client-side with Canvas to max 1024px longest edge before base64 encoding. Cuts Sonnet latency from ~8s to ~3s.
- **Haiku JSON fences:** Always strip ` ```json ``` ` before `JSON.parse`.
- **Arus number animation:** Use Framer Motion `useMotionValue` + `animate()`, not `innerHTML`. Format with `toLocaleString('en-MY')`.
- **Musim dates:** Hardcode 2026 values. Update `constants/musim.ts` the morning of the demo if date math drifts.
- **Supabase Realtime on debt rows:** Subscribe to `debt_records` changes in `DebtRow.tsx`. Status change → green flash animation without page refresh.
- **For demo receipt:** Pre-photograph a real Malaysian receipt (KFC/McDonald's). Know exactly what it extracts. Never OCR a receipt live during pitch.

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

4. Home tab → Musim strip shows "Hari Raya in 58 days — RM8.62/day"

5. Cermin tab → drag savings slider +RM200 → chart redraws → RM4,200 jumps to RM28,600
   Kawan tab → Amirah shows Day 15 streak, ranked in leaderboard
```
