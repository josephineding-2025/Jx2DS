import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { prisma } from "../lib/db";

const JINSENG_ID = "00000000-0000-0000-0000-000000000100";
const JOSEPHINE_ID = "00000000-0000-0000-0000-000000000101";
const SQUAD_ID = "00000000-0000-0000-0000-000000000010";
const SQUAD_2_ID = "00000000-0000-0000-0000-000000000011";
const SQUAD_NAME = "KL Kawan Crew";
const SQUAD_2_NAME = "Cyberjaya Savers";
const SHARED_BUCKET_ID = "00000000-0000-0000-0000-000000000020";
const SHARED_BUCKET_2_ID = "00000000-0000-0000-0000-000000000021";
const CHALLENGE_ID = "00000000-0000-0000-0000-000000000030";
const CHALLENGE_2_ID = "00000000-0000-0000-0000-000000000031";

const PRESET_USERS = [
  {
    id: JINSENG_ID,
    email: "jinseng@kira.app",
    password: "kira2026",
    name: "Jin Seng",
    income: 3500,
    salaryDay: 25,
  },
  {
    id: JOSEPHINE_ID,
    email: "josephine@kira.app",
    password: "kira2026",
    name: "Josephine Ding",
    income: 4200,
    salaryDay: 25,
  },
] as const;

const USER_IDS = [JINSENG_ID, JOSEPHINE_ID];

const WALLET_BALANCES_SEN: Record<string, bigint> = {
  [JINSENG_ID]: BigInt(280000), // RM 2,800.00
  [JOSEPHINE_ID]: BigInt(350000), // RM 3,500.00
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function findAuthUserByEmailOrId(
  supabase: SupabaseClient,
  email: string,
  id: string,
) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;

    const user = data.users.find(
      (candidate) => candidate.email === email || candidate.id === id,
    );
    if (user) return user;

    const hasMore = data.nextPage !== null && data.users.length > 0;
    if (!hasMore) return null;
    page += 1;
  }
}

async function createOrGetAuthUser(
  supabase: SupabaseClient,
  presetUser: (typeof PRESET_USERS)[number],
) {
  const existing = await findAuthUserByEmailOrId(
    supabase,
    presetUser.email,
    presetUser.id,
  );
  if (existing) {
    if (existing.id !== presetUser.id) {
      console.warn(
        `[AUTH] ${presetUser.email} exists with different id ${existing.id} (preset: ${presetUser.id})`,
      );
    } else {
      console.log(`[AUTH] ${presetUser.email} already exists (${existing.id})`);
    }
    return existing;
  }

  const createPayload: Parameters<typeof supabase.auth.admin.createUser>[0] & {
    id?: string;
  } = {
    id: presetUser.id,
    email: presetUser.email,
    password: presetUser.password,
    email_confirm: true,
  };

  const { data, error } = await supabase.auth.admin.createUser(createPayload);
  if (error) {
    throw new Error(
      `Failed to create auth user ${presetUser.email}: ${error.message}`,
    );
  }

  if (!data.user) {
    throw new Error(`Supabase returned no user for ${presetUser.email}`);
  }

  console.log(`[AUTH] created ${presetUser.email} (${data.user.id})`);
  return data.user;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  requireEnv("DATABASE_URL");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // ── 1. Create auth accounts + DB user rows ──
  const authMappings: Array<{ email: string; authId: string }> = [];

  for (const presetUser of PRESET_USERS) {
    const authUser = await createOrGetAuthUser(supabase, presetUser);

    await prisma.user.upsert({
      where: { id: authUser.id },
      update: {
        name: presetUser.name,
        email: presetUser.email,
        income: presetUser.income,
        salaryDay: presetUser.salaryDay,
      },
      create: {
        id: authUser.id,
        name: presetUser.name,
        email: presetUser.email,
        income: presetUser.income,
        salaryDay: presetUser.salaryDay,
      },
    });

    authMappings.push({ email: presetUser.email, authId: authUser.id });
    console.log(
      `[DB] upsert users row for ${presetUser.email} (${authUser.id})`,
    );
  }

  const jinSengAuth = authMappings.find((m) => m.email === "jinseng@kira.app")!;
  const josephineAuth = authMappings.find((m) => m.email === "josephine@kira.app")!;
  const jsId = jinSengAuth.authId;
  const joId = josephineAuth.authId;
  const userIds = [jsId, joId];

  // ── 2. Clean slate for financial data ──
  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };

  const allSquadIds = [SQUAD_ID, SQUAD_2_ID];
  const allBucketIds = [SHARED_BUCKET_ID, SHARED_BUCKET_2_ID];
  const allChallengeIds = [CHALLENGE_ID, CHALLENGE_2_ID];

  await prisma.ledgerEntry.deleteMany({
    where: { account: { userId: { in: userIds } } },
  });
  await prisma.ledgerAccount.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.transfer.deleteMany({
    where: {
      OR: [{ fromUserId: { in: userIds } }, { toUserId: { in: userIds } }],
    },
  });
  await prisma.challengeCompletion.deleteMany({
    where: { challengeId: { in: allChallengeIds } },
  });
  await prisma.challenge.deleteMany({ where: { id: { in: allChallengeIds } } });
  await prisma.sharedBucketMember.deleteMany({
    where: { bucketId: { in: allBucketIds } },
  });
  await prisma.sharedBucket.deleteMany({ where: { id: { in: allBucketIds } } });
  await prisma.squadStreak.deleteMany({ where: { squadId: { in: allSquadIds } } });
  await prisma.squadMember.deleteMany({ where: { squadId: { in: allSquadIds } } });
  await prisma.squad.deleteMany({ where: { id: { in: allSquadIds } } });
  await prisma.debtRecord.deleteMany({
    where: { creditorId: { in: userIds } },
  });
  await prisma.bucket.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.musimEvent.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.transaction.deleteMany({
    where: { userId: { in: userIds } },
  });
  console.log("[DB] cleaned existing financial data");

  // ── 3. Squads ──
  await prisma.squad.upsert({
    where: { id: SQUAD_ID },
    update: { name: SQUAD_NAME },
    create: { id: SQUAD_ID, name: SQUAD_NAME },
  });
  for (const uid of userIds) {
    await prisma.squadMember.upsert({
      where: { squadId_userId: { squadId: SQUAD_ID, userId: uid } },
      update: {},
      create: { squadId: SQUAD_ID, userId: uid },
    });
  }

  // Squad 2: both members (Jin Seng + Josephine)
  await prisma.squad.upsert({
    where: { id: SQUAD_2_ID },
    update: { name: SQUAD_2_NAME },
    create: { id: SQUAD_2_ID, name: SQUAD_2_NAME },
  });
  for (const uid of userIds) {
    await prisma.squadMember.upsert({
      where: { squadId_userId: { squadId: SQUAD_2_ID, userId: uid } },
      update: {},
      create: { squadId: SQUAD_2_ID, userId: uid },
    });
  }
  console.log(`[DB] ensured squads ${SQUAD_NAME} + ${SQUAD_2_NAME}`);

  // ── 4. Ledger accounts (wallets) ──
  for (const uid of userIds) {
    await prisma.ledgerAccount.upsert({
      where: { userId: uid },
      update: { balanceSen: WALLET_BALANCES_SEN[uid === jsId ? JINSENG_ID : JOSEPHINE_ID] },
      create: {
        type: "USER_WALLET",
        userId: uid,
        balanceSen: WALLET_BALANCES_SEN[uid === jsId ? JINSENG_ID : JOSEPHINE_ID],
        currency: "MYR",
      },
    });
  }
  console.log("[DB] created ledger wallets");

  // ── 5. Buckets (split rules) ──
  await prisma.bucket.createMany({
    data: [
      // Jin Seng
      { userId: jsId, name: "Simpanan", percentage: 20, balance: 1400, type: "savings" },
      { userId: jsId, name: "Bil Tetap", percentage: 30, balance: 525, type: "bills" },
      { userId: jsId, name: "Flex", percentage: 50, balance: 875, type: "flex" },
      // Josephine
      { userId: joId, name: "Simpanan", percentage: 25, balance: 2100, type: "savings" },
      { userId: joId, name: "Bil Tetap", percentage: 30, balance: 630, type: "bills" },
      { userId: joId, name: "Flex", percentage: 45, balance: 1470, type: "flex" },
    ],
  });
  console.log("[DB] created buckets");

  // ── 6. Transactions ──
  await prisma.transaction.createMany({
    data: [
      // Jin Seng's transactions
      { userId: jsId, amount: -12.50, category: "Food & Drinks", merchant: "Tealive TTDI", date: daysAgo(13), source: "manual" },
      { userId: jsId, amount: -45.00, category: "Groceries", merchant: "Jaya Grocer SS15", date: daysAgo(12), source: "manual" },
      { userId: jsId, amount: -8.00, category: "Transport", merchant: "Grab Car", date: daysAgo(12), source: "manual" },
      { userId: jsId, amount: -85.00, category: "Food & Drinks", merchant: "Nando's Midvalley", date: daysAgo(10), source: "voice" },
      { userId: jsId, amount: -32.00, category: "Entertainment", merchant: "TGV Cinemas", date: daysAgo(9), source: "manual" },
      { userId: jsId, amount: -15.00, category: "Food & Drinks", merchant: "Makan@Masjid India", date: daysAgo(8), source: "manual" },
      { userId: jsId, amount: -9.50, category: "Transport", merchant: "RapidKL Touch n Go", date: daysAgo(7), source: "manual" },
      { userId: jsId, amount: -22.00, category: "Food & Drinks", merchant: "Restoran Sri Nirwana", date: daysAgo(6), source: "manual" },
      { userId: jsId, amount: -400.00, category: "Bills", merchant: "PTPTN Auto-Debit", date: daysAgo(5), source: "manual" },
      { userId: jsId, amount: -65.00, category: "Bills", merchant: "Celcom Postpaid", date: daysAgo(4), source: "manual" },
      { userId: jsId, amount: -18.00, category: "Food & Drinks", merchant: "KFC Damansara", date: daysAgo(3), source: "receipt" },
      { userId: jsId, amount: -11.00, category: "Transport", merchant: "Grab Car", date: daysAgo(2), source: "manual" },
      { userId: jsId, amount: -28.00, category: "Food & Drinks", merchant: "Sushi King", date: daysAgo(1), source: "manual" },

      // Josephine's transactions
      { userId: joId, amount: -38.00, category: "Groceries", merchant: "Village Grocer KLCC", date: daysAgo(14), source: "manual" },
      { userId: joId, amount: -15.00, category: "Food & Drinks", merchant: "Starbucks KLCC", date: daysAgo(13), source: "voice" },
      { userId: joId, amount: -120.00, category: "Shopping", merchant: "Uniqlo Pavilion", date: daysAgo(11), source: "manual" },
      { userId: joId, amount: -55.00, category: "Food & Drinks", merchant: "Din Tai Fung Pavilion", date: daysAgo(10), source: "manual" },
      { userId: joId, amount: -12.00, category: "Transport", merchant: "LRT Touch n Go", date: daysAgo(9), source: "manual" },
      { userId: joId, amount: -200.00, category: "Bills", merchant: "Maxis Postpaid", date: daysAgo(8), source: "manual" },
      { userId: joId, amount: -35.00, category: "Entertainment", merchant: "Netflix Monthly", date: daysAgo(7), source: "manual" },
      { userId: joId, amount: -28.00, category: "Food & Drinks", merchant: "Chagee Bangsar", date: daysAgo(6), source: "voice" },
      { userId: joId, amount: -75.00, category: "Health", merchant: "Guardian Pharmacy", date: daysAgo(5), source: "receipt" },
      { userId: joId, amount: -16.00, category: "Transport", merchant: "Grab Car", date: daysAgo(4), source: "manual" },
      { userId: joId, amount: -42.00, category: "Groceries", merchant: "AEON Big Midvalley", date: daysAgo(3), source: "manual" },
      { userId: joId, amount: -8.50, category: "Food & Drinks", merchant: "Mamak Stevens", date: daysAgo(2), source: "manual" },
      { userId: joId, amount: -95.00, category: "Food & Drinks", merchant: "Jamie's Italian", date: daysAgo(1), source: "manual" },
    ],
  });
  console.log("[DB] created transactions");

  // ── 7. Transfers between Jin Seng ↔ Josephine ──
  const jsAccount = await prisma.ledgerAccount.findUniqueOrThrow({ where: { userId: jsId } });
  const joAccount = await prisma.ledgerAccount.findUniqueOrThrow({ where: { userId: joId } });

  const transfers = [
    // Jin Seng → Josephine
    { from: jsId, to: joId, fromAcc: jsAccount.id, toAcc: joAccount.id, amountSen: BigInt(4250), note: "Lunch split last week", idemKey: "seed-js-jo-1", date: daysAgo(8) },
    { from: jsId, to: joId, fromAcc: jsAccount.id, toAcc: joAccount.id, amountSen: BigInt(15000), note: "Monthly rent share", idemKey: "seed-js-jo-2", date: daysAgo(5) },
    { from: jsId, to: joId, fromAcc: jsAccount.id, toAcc: joAccount.id, amountSen: BigInt(3500), note: "Grab ride to Pavilion", idemKey: "seed-js-jo-3", date: daysAgo(2) },

    // Josephine → Jin Seng
    { from: joId, to: jsId, fromAcc: joAccount.id, toAcc: jsAccount.id, amountSen: BigInt(8500), note: "Concert ticket refund", idemKey: "seed-jo-js-1", date: daysAgo(10) },
    { from: joId, to: jsId, fromAcc: joAccount.id, toAcc: jsAccount.id, amountSen: BigInt(3200), note: "Nando's split", idemKey: "seed-jo-js-2", date: daysAgo(4) },
    { from: joId, to: jsId, fromAcc: joAccount.id, toAcc: jsAccount.id, amountSen: BigInt(6000), note: "Grocery run share", idemKey: "seed-jo-js-3", date: daysAgo(1) },
  ];

  for (const t of transfers) {
    const transfer = await prisma.transfer.create({
      data: {
        fromUserId: t.from,
        toUserId: t.to,
        amountSen: t.amountSen,
        currency: "MYR",
        status: "POSTED",
        idempotencyKey: t.idemKey,
        note: t.note,
        postedAt: t.date,
      },
    });

    await prisma.ledgerEntry.createMany({
      data: [
        { transferId: transfer.id, accountId: t.fromAcc, side: "DEBIT", amountSen: t.amountSen, currency: "MYR" },
        { transferId: transfer.id, accountId: t.toAcc, side: "CREDIT", amountSen: t.amountSen, currency: "MYR" },
      ],
    });

    await prisma.ledgerAccount.update({
      where: { id: t.fromAcc },
      data: { balanceSen: { decrement: t.amountSen } },
    });
    await prisma.ledgerAccount.update({
      where: { id: t.toAcc },
      data: { balanceSen: { increment: t.amountSen } },
    });
  }
  console.log(`[DB] created ${transfers.length} transfers (Jin Seng ↔ Josephine)`);

  // ── 8. Debt records ──
  await prisma.debtRecord.createMany({
    data: [
      { creditorId: jsId, debtorName: "Josephine", amount: 42.50, context: "Lunch split last week", status: "pending", direction: "owe_me" },
      { creditorId: joId, debtorName: "Jin Seng", amount: 60.00, context: "Grocery run share", status: "pending", direction: "owe_me" },
      { creditorId: jsId, debtorName: "Josephine", amount: 85.00, context: "Nando's Midvalley", status: "settled", direction: "owe_me", settledAt: daysAgo(4) },
    ],
  });
  console.log("[DB] created debt records");

  // ── 9. Squad streaks ──
  await prisma.squadStreak.createMany({
    data: [
      { userId: jsId, squadId: SQUAD_ID, currentStreak: 12, longestStreak: 18, lastActive: today, savingsRate: 24.5 },
      { userId: joId, squadId: SQUAD_ID, currentStreak: 20, longestStreak: 20, lastActive: today, savingsRate: 31.0 },
      { userId: jsId, squadId: SQUAD_2_ID, currentStreak: 8, longestStreak: 10, lastActive: today, savingsRate: 19.0 },
      { userId: joId, squadId: SQUAD_2_ID, currentStreak: 14, longestStreak: 14, lastActive: today, savingsRate: 35.0 },
    ],
  });
  console.log("[DB] created squad streaks");

  // ── 10. Musim events ──
  await prisma.musimEvent.createMany({
    data: [
      { userId: jsId, eventName: "Hari Raya Aidilfitri", eventDate: new Date("2027-03-10"), estimatedCost: 500, category: "festive", isSystem: true },
      { userId: jsId, eventName: "PTPTN Annual Review", eventDate: new Date("2026-09-01"), estimatedCost: 200, category: "debt", isSystem: true },
      { userId: joId, eventName: "Hari Raya Aidilfitri", eventDate: new Date("2027-03-10"), estimatedCost: 600, category: "festive", isSystem: true },
      { userId: joId, eventName: "Year-End Trip", eventDate: new Date("2026-12-15"), estimatedCost: 800, category: "festive", isSystem: true },
    ],
  });
  console.log("[DB] created musim events");

  // ── 11. Shared buckets ──
  await prisma.sharedBucket.create({
    data: {
      id: SHARED_BUCKET_ID,
      squadId: SQUAD_ID,
      name: "Bali Trip 2027",
      balance: 1200,
      targetAmount: 5000,
      members: {
        create: [
          { userId: jsId, contribution: 500 },
          { userId: joId, contribution: 700 },
        ],
      },
    },
  });
  await prisma.sharedBucket.create({
    data: {
      id: SHARED_BUCKET_2_ID,
      squadId: SQUAD_2_ID,
      name: "Weekly Lunch Fund",
      balance: 400,
      targetAmount: 1000,
      members: {
        create: [
          { userId: jsId, contribution: 200 },
          { userId: joId, contribution: 200 },
        ],
      },
    },
  });
  console.log("[DB] created shared buckets");

  // ── 12. Challenges ──
  const startOfWeek = daysAgo(4);
  await prisma.challenge.create({
    data: {
      id: CHALLENGE_ID,
      squadId: SQUAD_ID,
      name: "No Bubble Tea Week",
      description: "Skip boba, pool the savings",
      startDate: startOfWeek,
      endDate: daysAgo(-2),
      penaltyAmount: 5,
      completions: {
        create: [
          { userId: jsId, date: daysAgo(4), completed: true },
          { userId: jsId, date: daysAgo(3), completed: true },
          { userId: jsId, date: daysAgo(2), completed: true },
          { userId: jsId, date: daysAgo(1), completed: true },
          { userId: joId, date: daysAgo(4), completed: true },
          { userId: joId, date: daysAgo(3), completed: true },
          { userId: joId, date: daysAgo(2), completed: true },
        ],
      },
    },
  });
  await prisma.challenge.create({
    data: {
      id: CHALLENGE_2_ID,
      squadId: SQUAD_2_ID,
      name: "Save RM50 This Week",
      description: "Cut non-essential spending for 7 days",
      startDate: startOfWeek,
      endDate: daysAgo(-2),
      penaltyAmount: 10,
      completions: {
        create: [
          { userId: jsId, date: daysAgo(4), completed: true },
          { userId: jsId, date: daysAgo(3), completed: true },
          { userId: jsId, date: daysAgo(2), completed: false },
        ],
      },
    },
  });
  console.log("[DB] created challenges");

  console.log("\n✅ Seed complete.");
  console.table(authMappings);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
