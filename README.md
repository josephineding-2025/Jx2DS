# SnapIt — AI-Powered Financial Resilience Companion

> **Live Demo:** [https://jx2ds.vercel.app/login](https://jx2ds.vercel.app/login)

**Your money, on autopilot.**

SnapIt is an AI-powered financial companion for Malaysian students and fresh graduates. Built for the GXBank Youth Resilience Challenge, it removes friction from financial decision-making so users build good habits without relying on willpower.

## Features

### Zero-Friction Bookkeeping

- **Voice Logging** — speak your expense ("Paid RM85 at Nando's for 4 people") → Claude Haiku NLP extracts amount, merchant, category, and auto-creates debt splits
- **Receipt Scanning** — photo upload → Claude Sonnet Vision reads named diners, handles Malaysian receipts (SST, Malay text)

### Context-Aware Money Intelligence

- **Safe-to-Spend Autopilot (Arus)** — calculates daily spendable after shielding bills, debts, and upcoming seasonal costs
- **Debt Shield** — protects essential commitments before showing "fun money"
- **Smart Debt Reconciliation** — fuzzy-matches incoming transfers to outstanding debts (name similarity + amount tolerance)

### Seasonal Awareness (Musim)

- Pre-loaded Malaysian events (Hari Raya, PTPTN, semester fees)
- Daily auto-save from Flex → Savings toward upcoming costs
- Vercel cron triggers idempotent daily deductions at 00:00 MYT

### Social Accountability (Kawan)

- **Squads** — join groups with shared challenges and streaks
- **Privacy-first leaderboard** — ranked by savings rate %, not raw amounts
- **Shared Bucket** — group escrow fund; challenge penalties auto-contribute
- **Daily compliance tracking** — 7-day dot grid, group completion rate

### AI Monthly Story (Rewind)

- Claude Sonnet reads 30 days of transactions → 5-card swipeable narrative
- Assigns money archetypes (The Weekend Warrior, The Saver, etc.)
- Annualizes recurring costs ("bubble tea = RM936/year"), surfaces hidden patterns

---

## Tech Stack

| Layer      | Technology                                                          |
| ---------- | ------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router)                                             |
| UI         | React 19, Tailwind CSS 4, Framer Motion                             |
| Database   | PostgreSQL via Supabase                                             |
| ORM        | Prisma 7                                                            |
| Auth       | Supabase Auth (SSR middleware)                                      |
| AI / LLM   | OpenRouter → DeepSekk V4 Flash (NLP), GPT 5.4 mini (Vision + Story) |
| Charts     | Recharts                                                            |
| Deployment | Vercel (with cron jobs)                                             |
| Language   | TypeScript 5                                                        |

---

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase project (PostgreSQL + Auth)
- OpenRouter API key

### Installation

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
DATABASE_URL=postgresql://...         # Supabase pooled connection
DIRECT_URL=postgresql://...           # Supabase direct (for migrations)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...         # Server-only, for seed script
OPENROUTER_API_KEY=sk-or-v1-...
LLM_NLP_MODEL=anthropic/claude-haiku-4-5
LLM_VISION_MODEL=anthropic/claude-sonnet-4-6
NEXT_PUBLIC_DEMO_USER_ID=00000000-0000-0000-0000-000000000001
NEXT_PUBLIC_DEMO_SQUAD_ID=00000000-0000-0000-0000-000000000010
```

### Database Setup

```bash
npx prisma migrate deploy   # Run migrations
npx prisma generate         # Generate Prisma client
```

### Run

```bash
pnpm dev       # Development server at http://localhost:3000
pnpm build     # Production build
pnpm start     # Run production build
pnpm lint      # Lint
```

### Seed Demo Data

Hit `GET /api/seed` once after setup to create the demo user, buckets, squads, transactions, and debts.

---

## Project Structure

```
app/
  api/          # 16 API routes (voice, receipt, arus, musim, kawan, transfer, rewind, etc.)
  (auth)/       # Auth layout group
components/
  kira/
    screens/    # HomeScreen, ArusScreen, DuitScreen, KawanScreen
    sheets/     # VoiceSheet, ReceiptSheet, TransferSheet, etc.
lib/
  claude/       # LLM integrations (haiku, sonnet, rewind)
  finance/      # Core logic (arus, musim, reconcile, transfer, projection)
  demo/         # Demo state hydration & seeding
prisma/
  schema.prisma # 15-table schema
docs/
  PRD.md        # Full product requirements
  DEMO_SCRIPT.md
```

---

## API Reference

| Endpoint                        | Method     | Description                                   |
| ------------------------------- | ---------- | --------------------------------------------- |
| `/api/parse-voice`              | POST       | Voice → Haiku NLP → ParsedExpense             |
| `/api/parse-receipt`            | POST       | Receipt image → Sonnet Vision → ParsedExpense |
| `/api/transactions`             | POST       | Save expense + create debt records            |
| `/api/reconcile`                | POST       | Fuzzy-match transfer to debt                  |
| `/api/transfer`                 | POST       | P2P transfer with ledger entries              |
| `/api/arus`                     | POST/PATCH | Salary split / update bucket %                |
| `/api/musim`                    | GET        | Seasonal events + daily targets               |
| `/api/musim/toggle`             | POST       | Enable/disable auto-save                      |
| `/api/cron/musim-autosave`      | GET        | Daily cron — process all auto-saves           |
| `/api/kawan`                    | POST       | Mark challenge day complete/broken            |
| `/api/shared-bucket/contribute` | POST       | Contribute to squad shared fund               |
| `/api/rewind`                   | POST       | Generate monthly story                        |
| `/api/demo-state`               | GET        | Hydrate full client state                     |
| `/api/seed`                     | GET        | Create demo user + seed data                  |
