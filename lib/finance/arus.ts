export type ArusBucketInput = {
  name: string;
  percentage: number;
  balance: number;
  type: string;
};

export type ArusDebtInput = {
  debtorName: string;
  amount: number;
  context: string | null;
  status: string;
  direction: string;
};

export type ArusMusimInput = {
  id: string;
  eventName: string;
  estimatedCost: number;
  daysRemaining: number;
  dailyTarget: number;
  category: string;
  autoSaveEnabled: boolean;
};

export type ArusTransactionInput = {
  amount: number;
  category: string;
  merchant: string | null;
  date: string;
};

export type ArusCommitment = {
  id: string;
  label: string;
  detail: string;
  amount: number;
  tone: "violet" | "amber" | "cyan";
};

export type ArusPlan = {
  daysUntilSalary: number;
  nextSalaryLabel: string;
  safeToSpendToday: number;
  safeToSpendUntilSalary: number;
  shieldTarget: number;
  shieldBalance: number;
  shieldShortfall: number;
  shieldCoverage: number;
  monthlyBillNeed: number;
  debtNeed: number;
  musimNeed: number;
  recommendedSplit: {
    savings: number;
    bills: number;
    flex: number;
    reason: string;
  };
  commitments: ArusCommitment[];
  futureBoost: number;
  status: "protected" | "watch" | "tight";
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundToFive(value: number) {
  return Math.round(value / 5) * 5;
}

function bucketOf(buckets: ArusBucketInput[], type: string) {
  return buckets.find((bucket) => bucket.type === type);
}

function daysUntilSalary(salaryDay: number | null | undefined, fromDate: Date) {
  const target = getNextSalaryDate(salaryDay, fromDate);
  const start = startOfDay(fromDate);
  const diff = Math.ceil((target.getTime() - start.getTime()) / 86400000);
  return Math.max(1, diff);
}

function nextSalaryLabel(salaryDay: number | null | undefined, fromDate: Date) {
  const target = getNextSalaryDate(salaryDay, fromDate);

  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
  }).format(target);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampDay(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(1, day), lastDay);
}

function getNextSalaryDate(salaryDay: number | null | undefined, fromDate: Date) {
  const day = salaryDay && salaryDay > 0 ? salaryDay : 25;
  const start = startOfDay(fromDate);
  const clamped = clampDay(start.getFullYear(), start.getMonth(), day);
  let target = new Date(start.getFullYear(), start.getMonth(), clamped);
  if (target < start) {
    const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const nextClamped = clampDay(nextMonth.getFullYear(), nextMonth.getMonth(), day);
    target = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextClamped);
  }
  return target;
}

function recentBillSpend(transactions: ArusTransactionInput[], fromDate: Date) {
  const cutoff = new Date(fromDate);
  cutoff.setDate(cutoff.getDate() - 35);

  return transactions.reduce((sum, transaction) => {
    const date = new Date(`${transaction.date}T00:00:00`);
    if (transaction.category !== "Bills" || transaction.amount >= 0 || date < cutoff) return sum;
    return sum + Math.abs(transaction.amount);
  }, 0);
}

function recommendedSplit(
  income: number,
  buckets: ArusBucketInput[],
  shieldTarget: number,
  safeToSpendToday: number,
) {
  const currentSavings = bucketOf(buckets, "savings")?.percentage ?? 20;
  const targetBills = clamp(roundToFive((shieldTarget / Math.max(1, income)) * 100), 25, 45);
  const targetSavings = clamp(
    roundToFive(currentSavings + (safeToSpendToday >= 35 ? 5 : 0)),
    15,
    30,
  );
  const targetFlex = 100 - targetBills - targetSavings;

  if (targetFlex >= 20) {
    return {
      savings: targetSavings,
      bills: targetBills,
      flex: targetFlex,
      reason: safeToSpendToday >= 35
        ? "You have breathing room, so Arus can lift savings while protecting bills first."
        : "Cash flow is tight, so Arus keeps more income near bills and flex."
    };
  }

  return {
    savings: Math.max(15, 100 - targetBills - 35),
    bills: targetBills,
    flex: 35,
    reason: "Arus keeps at least 35% flexible so the plan does not collapse after one rough week.",
  };
}

export function buildArusPlan({
  buckets,
  debts,
  musimEvents,
  transactions,
  income,
  salaryDay,
  fromDate = new Date(),
}: {
  buckets: ArusBucketInput[];
  debts: ArusDebtInput[];
  musimEvents: ArusMusimInput[];
  transactions: ArusTransactionInput[];
  income: number;
  salaryDay?: number | null;
  fromDate?: Date;
}): ArusPlan {
  const bills = bucketOf(buckets, "bills");
  const flex = bucketOf(buckets, "flex");
  const daysLeft = daysUntilSalary(salaryDay, fromDate);
  const monthlyBillNeed = roundMoney(
    recentBillSpend(transactions, fromDate) || income * ((bills?.percentage ?? 30) / 100),
  );
  const debtNeed = roundMoney(
    debts
      .filter((debt) => debt.direction === "i_owe" && debt.status !== "settled")
      .reduce((sum, debt) => sum + debt.amount, 0),
  );
  const musimNeed = roundMoney(
    musimEvents
      .filter((event) => event.autoSaveEnabled || event.daysRemaining <= 30)
      .reduce((sum, event) => sum + event.dailyTarget * Math.max(0, Math.min(30, event.daysRemaining)), 0),
  );
  const shieldTarget = roundMoney(monthlyBillNeed + debtNeed + musimNeed);
  const shieldBalance = roundMoney(Math.max(0, bills?.balance ?? 0));
  const shieldShortfall = roundMoney(Math.max(0, shieldTarget - shieldBalance));
  const safeToSpendUntilSalary = roundMoney(Math.max(0, (flex?.balance ?? 0) - shieldShortfall));
  const safeToSpendToday = roundMoney(safeToSpendUntilSalary / Math.max(1, Math.min(daysLeft, 30)));
  const shieldCoverage = shieldTarget > 0 ? clamp(Math.round((shieldBalance / shieldTarget) * 100), 0, 100) : 100;
  const split = recommendedSplit(income, buckets, shieldTarget, safeToSpendToday);
  const futureBoost = roundMoney((split.savings / 100) * income * 12);

  const commitments: ArusCommitment[] = [
    {
      id: "bills",
      label: "Bills shield",
      detail: "PTPTN, telco, rent and fixed commitments",
      amount: monthlyBillNeed,
      tone: "violet",
    },
    {
      id: "debt",
      label: debtNeed > 0 ? "Debt due" : "Debt drift guard",
      detail: debtNeed > 0 ? "Money you owe others" : "No outgoing debts detected",
      amount: debtNeed,
      tone: "amber",
    },
    ...musimEvents
      .filter((event) => event.autoSaveEnabled || event.daysRemaining <= 90)
      .slice(0, 2)
      .map((event) => ({
        id: event.id,
        label: event.eventName,
        detail: `${event.daysRemaining} days left · ${event.autoSaveEnabled ? "auto-save on" : "needs reserve"}`,
        amount: roundMoney(event.dailyTarget * Math.max(0, Math.min(30, event.daysRemaining))),
        tone: "cyan" as const,
      })),
  ];

  return {
    daysUntilSalary: daysLeft,
    nextSalaryLabel: nextSalaryLabel(salaryDay, fromDate),
    safeToSpendToday,
    safeToSpendUntilSalary,
    shieldTarget,
    shieldBalance,
    shieldShortfall,
    shieldCoverage,
    monthlyBillNeed,
    debtNeed,
    musimNeed,
    recommendedSplit: split,
    commitments,
    futureBoost,
    status: shieldCoverage >= 90 ? "protected" : shieldCoverage >= 60 ? "watch" : "tight",
  };
}
