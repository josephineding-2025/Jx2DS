# Kira — Implementation Status Report

> Audit date: 2026-05-05  
> Based on: PRD, user flow description, and full codebase inspection

---

## Summary

The project has solid structural bones — all five tabs render, all API routes exist, the DB schema covers every model, and the core AI parsing pipeline (voice + receipt) works end-to-end. However several features have critical logic bugs or are placeholder UI that doesn't connect to real data, and the demo path has two blockers that will break the presentation if not fixed.

---

## Feature 1 — Voice & Receipt Bookkeeping

### Expected flow
1. User taps "Voice Log" → mic button opens bottom sheet → speaks: *"Paid RM85 at Nando's for 4 people"*
2. Haiku parses → returns: amount, merchant, category, participants, per-person share, debt records
3. `ParsedExpenseCard` shows result — user reviews the breakdown (who owes what)
4. User taps "Confirm and save" → transaction + debt records written to DB → tab switches to Duit
5. Receipt flow: same result, triggered from photo upload instead of speech

### Current state
- Voice parse → save is **fully wired end-to-end** ✅
- Receipt parse → save is **fully wired end-to-end** ✅
- Both sheets render `ParsedExpenseCard` with participants listed ✅

### Gaps and bugs

**[BUG] No field editing before save**  
`ParsedExpenseCard` is read-only. If Haiku misparses the amount or assigns the wrong participant, there is no way to correct it before saving. Users are forced to accept or dismiss and retry from scratch.  
**Fix:** Add inline edit for `amount`, `merchant`, `category`, and debt participant amounts on the `ParsedExpenseCard`. A simple text input swap on tap is sufficient.

**[GAP] Debt direction is one-way — user is always the creditor**  
The current system only models "others owe the user". The user's intended flow includes the opposite: *"Jojo paid RM20, my share is RM10 — I owe Jojo."*  
When the user logs a meal where someone else paid, there is no way to record that they are the debtor.  
**Fix:** Add a `direction` field to `ParsedExpense` and `DebtRecord` (`"owe_me" | "i_owe"`). When the voice/receipt parsing detects that someone else paid, create a payable record. Surface "I Owe" records in the Duit tab alongside "Owes Me" records.

**[GAP] No `remarks` field on transactions**  
The user wants Musim reminders personalized from past spending context — e.g., *"Save for Valentine's dinner at Oversea Restaurant"* comes from a past transaction remark. Currently, transactions have no remarks/notes column.  
**Fix:** Add `notes text` column to the `transactions` table (Prisma migration). Expose a notes input in both voice and receipt confirm flows.

---

## Feature 2 — Debt Reconciliation (Duit Tab)

### Expected flow
1. User has outstanding debt records from a shared meal
2. When a friend pays back, the system fuzzy-matches sender name + amount against pending debts
3. Matched debt is marked settled; user sees a contextual confirmation: *"Ali paid back his share of Nando's"*
4. Longer term (user's vision): a personal **escrow bucket** is pre-funded; when user owes someone, the system auto-transfers from the escrow bucket without any manual step

### Current state
- Fuzzy match reconcile engine (`lib/finance/reconcile.ts`) works correctly ✅
- `POST /api/reconcile` marks debt settled and creates a transfer transaction ✅

### Gaps and bugs

**[CRITICAL BUG] Reconcile button is hardcoded to "Ali RM21"**  
`reconcileAli()` in `KiraApp.tsx:141-160` always posts `{ senderName: "Ali", amount: 21 }`. There is no UI for entering a different sender or amount.  
During the demo this works for step 2, but it means the reconciliation feature appears completely un-generalizable.  
**Fix:** Replace the hardcoded button with a small form inside the Duit/Owes Me tab: two inputs (sender name, amount) and a "Match payment" button. Keep a "Demo: Ali RM21" shortcut for the demo path.

**[GAP] Duit tab subtitle says "Owes Me" — no "I Owe" section**  
If bidirectional debt is added (see Feature 1 gap), the Duit tab needs a third segment or sub-section for payables (debts the user owes to others).  
**Fix:** Add a third segment option `"I Owe"` to `DuitScreen`. Fetch and display `direction: "i_owe"` records with a distinct color (amber/red).

**[GAP] Escrow bucket concept not present**  
The user's vision: pre-fund an escrow bucket once → system auto-settles debts from it without the user having to manually trigger anything. Currently this is entirely absent.  
**Fix (MVP scope):** Add a visual "Debt Escrow" balance display in the Duit tab showing a simulated pre-funded amount. When reconcile fires, show a deduction animation from the escrow balance. The actual transfer mechanics can remain simulated, but the concept must be visible to tell the story.

---

## Feature 3 — Arus (Salary Autopilot)

### Expected flow
1. Salary arrives → system detects source as "salary" → auto-split fires
2. Animated visualization: money flows from central circle down into 3 bucket cards
3. Each bucket's balance updates with a fill animation
4. Smart rules (round-up, bill autopay) execute automatically

### Current state
- Salary split logic is correct — `POST /api/arus` allocates by `bucket.percentage` ✅
- SVG flow lines animate (dashed-line march from center to buckets) ✅
- Central circle has a scale pulse on simulate ✅

### Gaps and bugs

**[CRITICAL BUG] Bucket progress bar does not reflect real balance — no fill animation**  
`BucketCard` at line 1163 calculates progress as:
```typescript
const fill = Math.max(18, Math.min(96, bucket.percentage * 1.8));
```
This is a **fixed constant** based on the bucket's configured percentage. It does not change when the bucket's `balance` changes. After simulating salary, the buckets show updated balances (numbers change) but the progress bars stay identical — the visual "fill" never animates.

**Fix:** Replace the constant formula with an actual utilization calculation:
```typescript
// max balance = income * (percentage / 100)
const maxBalance = userIncome * (bucket.percentage / 100);
const fill = Math.max(6, Math.min(96, (bucket.balance / maxBalance) * 100));
```
To get the income value, pass `data.user.income` from `KiraApp` down through `ArusScreen` to `BucketCard`. Then wrap the `Progress` value in a Framer Motion `animate` to transition from old fill to new fill.

**[BUG] Salary amount in the Arus header is hardcoded**  
The central circle displays `"RM 2,800"` as a static string (line 481). If the demo is ever run with a different user or different income, it will be wrong.  
**Fix:** Pass `data.user.income` into `ArusScreen` and display it dynamically.

**[GAP] Bill autopay / pre-authorized payments**  
The user described pre-authorizing bill payments (utilities, parking, recurring subscriptions). The "Smart rule active" card in Arus shows "Round-up RM 0.85 to savings" but this is static display only — it's not connected to any logic.  
**Fix (MVP scope):** Add a section in the Arus tab showing 2–3 pre-authorized bills (PTPTN, Celcom) as static cards with amounts, due dates, and "Auto-pay from Bills bucket" labels. For demo purposes this is display-only but it communicates the concept clearly.

---

## Feature 4 — Musim (Seasonal Savings)

### Expected flow
1. On home screen, a horizontal carousel shows upcoming Malaysian events (Hari Raya, semester fees, PTPTN)
2. Each card shows: event name, days remaining, daily savings target
3. Optionally, a contextual reminder is personalized: *"Hari Raya in 58 days — Save RM8.62/day to cover your usual Raya spending"*
4. User can enable auto-savings: a fixed daily/weekly amount transfers automatically into a Musim bucket

### Current state
- `GET /api/musim` calculates correct days remaining and daily target ✅
- `MusimCard` renders on the Home screen carousel ✅
- All 4 seed events are loaded from DB ✅

### Gaps and bugs

**[BUG] Musim progress bar calculation is arbitrary**  
`MusimCard` at line 1061:
```typescript
const progress = Math.max(8, Math.min(92, 100 - event.daysRemaining / 4));
```
This formula produces nonsense values — for 58 days remaining it shows `100 - 58/4 = 85.5%` complete, implying the event is nearly here. The actual "progress" should represent how much has been saved toward the goal, not a made-up transformation of days remaining.  
**Fix:** Either (a) calculate `savedAmount / estimatedCost * 100` if a Musim savings balance is tracked, or (b) simply remove the progress bar and replace it with a bold days-remaining count. Option (b) is correct for MVP.

**[GAP] No personalization from transaction context**  
The user's vision: the system surfaces remark-aware reminders like *"Valentine's in 30 days — save RM200 for dinner at Oversea Restaurant"* because it recognized past transactions at that merchant with a specific person tagged.  
This requires the `notes` column on transactions (see Feature 1) and a matching pass during Musim calculation.  
**Fix (MVP):** At minimum, show the estimated cost in context: *"Hari Raya in 58 days — you spent RM480 last year (estimated)"*. The data for this is already in the seed. A single sentence of context copy transforms the card significantly.

**[GAP] No auto-savings toggle**  
The Musim cards have no action — no way to enable auto-savings. The concept is described in the PRD but there is no UI or backend for it.  
**Fix (MVP scope):** Add a toggle on each Musim card: "Auto-save RM8.62/day". When enabled, show a green active state. The actual deduction can be simulated, but the toggle state should persist in `musim_events` (add `auto_save_enabled boolean` column).

---

## Feature 5 — Cermin (Future Self Projection)

### Expected flow
1. User opens Cermin tab → sees two projected lines to age 30
2. **On first open: both "Current You" and "Optimised You" lines are identical** — they start at the same trajectory
3. User drags the savings slider up by RM200/month → "Optimised You" line diverges upward
4. Delta callout updates in real time: *"This change is worth +RM24,400 by age 30"*
5. Demo sequence: open → RM4,200 current → drag slider → RM28,600 optimised

### Current state
- `buildProjection()` formula is correct ✅
- Chart renders with dual lines ✅
- Sliders update chart in real time ✅

### Gaps and bugs

**[CRITICAL BUG] Sliders start at non-zero values — chart opens with massive gap**  
`CerminScreen` at lines 603–605:
```typescript
const [monthlySavings, setMonthlySavings] = useState(200);
const [foodCut, setFoodCut] = useState(150);
const [transportCut, setTransportCut] = useState(80);
```
`monthlyDelta` starts at `200 + 150 + 80 = 430`. This means on first render, `buildProjection(50, 480, 4200, 23, 85)` already shows a large gap between the two lines. The entire narrative of *"here's where you're headed, now watch what one change does"* is broken — the user opens Cermin and immediately sees the optimised state.

**Fix:** Change all three defaults to `0`:
```typescript
const [monthlySavings, setMonthlySavings] = useState(0);
const [foodCut, setFoodCut] = useState(0);
const [transportCut, setTransportCut] = useState(0);
```
Both lines start identical. The user drags the savings slider to RM200 and the gap opens dramatically — exactly as the demo path describes.

**[MINOR] "Current You" terminal value doesn't match demo path**  
With sliders at 0, `buildProjection(50, 50, 4200, 23, 85)` produces a "current" terminal value. Verify that this outputs approximately RM4,200 at month 84 with the current `projection.ts` formula. If not, adjust the `currentBalance` seed value passed to `buildProjection` until it matches the demo expectation.

---

## Feature 6 — Kawan (Social Accountability)

### Expected flow
1. Squad tab opens to leaderboard — members ranked by savings rate, not net worth
2. Each row shows: rank, name, current streak, savings rate
3. An active challenge is displayed with day-by-day tracking
4. If a member breaks a challenge, a fixed penalty transfers to the group escrow bucket
5. The shared bucket shows collective savings progress toward a goal (e.g., Bali trip)

### Current state
- Leaderboard reads from `squad_streaks` in DB and renders correctly ✅
- Shared bucket card shows balance, target, member avatars ✅

### Gaps and bugs

**[BUG] Challenge card is fully hardcoded — not from DB**  
The "No Bubble Tea Week" card in `KawanScreen` (line 542–561) is completely static:
- Title, description, progress value (57), and day-tracker (4/5 completed) are all hardcoded strings/numbers
- No database table or API route backs this feature
- Resetting demo state has no effect on this card

**Fix:** Add a `challenges` table to the schema:
```sql
create table challenges (
  id uuid primary key default uuid_generate_v4(),
  squad_id uuid references squad(id),
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  penalty_amount numeric(10,2) default 0,
  created_at timestamptz default now()
);
create table challenge_completions (
  challenge_id uuid references challenges(id),
  user_id uuid references users(id),
  date date not null,
  completed boolean default false,
  primary key (challenge_id, user_id, date)
);
```
Seed a "No Bubble Tea Week" challenge for the demo squad. Add `GET /api/kawan` (or include in `/api/demo-state`) to return the active challenge with per-member daily completion. Render the day tracker from real data.

**[GAP] Challenge penalty mechanic is absent**  
The user's vision: breaking a challenge rule forces a fixed transfer into the group escrow bucket. There is no model, no UI, and no trigger for this.  
**Fix (MVP scope):** Add a "Mark as broken" button on the challenge card for the current user. Pressing it: (1) creates a `challenge_completions` record with `completed: false`, (2) increments the `shared_buckets.balance` by `penalty_amount`, (3) shows a toast: *"RM5 added to the penalty pot."* Keep it simulated — no real transfer.

**[BUG] "Contribute" button in shared bucket card is a no-op**  
Line 594: `<span className="ml-auto text-xs font-black text-[#A78BFA]">Contribute</span>` — this is a `<span>`, not a button, and has no click handler.  
**Fix:** Convert to a `<button>` and wire it to a simple sheet that shows the member's current contribution and lets them "contribute" a fixed amount (simulated, updates `shared_bucket_members.contribution` and `shared_buckets.balance`).

**[MINOR] No milestone celebrations**  
PRD specifies Day 7, Day 14, Day 30, RM1K saved as milestone triggers for squad-visible celebrations (confetti burst, notification slide-in). None of this is implemented.  
**Fix (nice-to-have):** On page load, check if `currentStreak` is 7, 14, or 30 for the current user and trigger a one-shot confetti animation using `canvas-confetti` or a simple CSS keyframe burst.

---

## Feature 7 — Home Screen

### Gaps and bugs

**[BUG] "+RM 184 this week" is hardcoded**  
Line 355: `<span className="text-[#4ADE80]">+RM 184 this week</span>` — this number never changes regardless of actual transactions.  
**Fix:** Compute weekly delta from `data.transactions` filtered to the past 7 days: sum of credit transactions minus debit transactions. Update the display accordingly.

**[BUG] Greeting is hardcoded to "Good morning" regardless of time of day**  
Line 334: always says "Good morning, Amirah".  
**Fix:** Derive greeting from `new Date().getHours()`: morning (<12), afternoon (12–17), evening (≥18).

**[BUG] Savings rate calculation is misleading**  
Line 324–326: `saveRate = savings.balance / user.income`. This computes the savings *bucket balance* as a fraction of monthly income — but the bucket balance grows with each salary simulation, making it meaningless. A savings rate should be `savings.percentage` (the configured allocation %).  
**Fix:** Use `savings.percentage` directly as the savings rate display.

**[GAP] "Request" quick action button does nothing**  
Line 362: `onClick={() => {}}` — the Request button has no handler.  
**Fix:** Wire it to a simple bottom sheet that shows a mock "Request payment" form with a friend selector and amount field. For the demo, it doesn't need to do a real DB write — displaying the concept is enough.

---

## Priority Matrix

### Blockers (fix before demo)

| # | Issue | File | Fix |
|---|---|---|---|
| 1 | Cermin sliders start non-zero → chart shows wrong state | `KiraApp.tsx:603-605` | Change all 3 `useState` defaults to `0` |
| 2 | Bucket progress bar is a constant, doesn't animate fill | `KiraApp.tsx:1163` | Compute fill from `balance / maxBalance`, animate with Framer Motion |
| 3 | Reconcile button hardcoded to "Ali RM21" | `KiraApp.tsx:141-160` | Add name + amount inputs, keep demo shortcut |

### High priority (demo quality)

| # | Issue | Fix |
|---|---|---|
| 4 | Challenge card is fully static/hardcoded | Add `challenges` DB table, seed data, wire to real API |
| 5 | Musim progress bar formula is wrong | Replace with days-remaining countdown display |
| 6 | Salary amount in Arus is hardcoded RM 2,800 | Pass `user.income` dynamically |
| 7 | "+RM 184 this week" is hardcoded | Compute from transactions in last 7 days |
| 8 | Savings rate % is wrong formula | Use `savings.percentage` |

### Medium priority (feature completeness)

| # | Issue | Fix |
|---|---|---|
| 9 | No field editing on ParsedExpenseCard | Add inline editable fields |
| 10 | Debt is one-directional (creditor only) | Add `direction` to DebtRecord, "I Owe" section in Duit |
| 11 | "Contribute" in shared bucket is a `<span>` no-op | Convert to button + contribution sheet |
| 12 | Bill autopay section missing from Arus | Add static pre-auth bill cards |
| 13 | No Musim auto-savings toggle | Add toggle + `auto_save_enabled` column |
| 14 | "Request" button is empty | Wire to mock request-payment sheet |

### Nice-to-have (polish)

| # | Issue | Fix |
|---|---|---|
| 15 | Challenge penalty mechanic absent | "Mark broken" button → deducts from escrow |
| 16 | No milestone celebrations | Confetti on Day 7/14/30 streak |
| 17 | Greeting doesn't adjust to time of day | Derive from `getHours()` |
| 18 | No transaction remarks/notes field | Add `notes` column, expose in confirm flows |
| 19 | Escrow bucket concept not visible in Duit | Add "Debt Escrow" balance card |

---

## Schema Changes Required

```sql
-- 1. Transaction remarks
alter table transactions add column notes text;

-- 2. Challenge tables
create table challenges (
  id uuid primary key default uuid_generate_v4(),
  squad_id uuid references squad(id) on delete cascade,
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  penalty_amount numeric(10,2) default 0,
  created_at timestamptz default now()
);
create table challenge_completions (
  challenge_id uuid references challenges(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  date date not null,
  completed boolean default false,
  primary key (challenge_id, user_id, date)
);

-- 3. Musim auto-savings flag
alter table musim_events add column auto_save_enabled boolean default false;

-- 4. Debt direction (for bidirectional debt)
alter table debt_records add column direction text
  check (direction in ('owe_me', 'i_owe')) default 'owe_me';
```

---

## Minimal Path to a Working Demo

If time is short, fix only items 1–3 from the blockers list. Everything else can remain as-is and the demo path will work. The priority order is:

1. **Fix Cermin slider defaults** — 1 line of code each, immediate visual impact
2. **Fix Arus bucket progress animation** — requires passing `user.income` down + updating fill formula + Framer Motion animate
3. **Add general reconcile form** — replace hardcoded `reconcileAli` with name/amount inputs

These three changes are the difference between a demo that tells the story cleanly and one that requires explaining away visible inconsistencies to the judges.
