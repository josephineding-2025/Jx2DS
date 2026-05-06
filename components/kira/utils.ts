import type { BucketItem, TransactionItem } from "./constants";
import { compactFormatter, moneyFormatter } from "./constants";

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function formatMoney(value: number) {
  return `RM ${moneyFormatter.format(Math.abs(value))}`;
}

export function formatSignedMoney(value: number) {
  const sign = value > 0 ? "+" : "-";
  return `${sign}RM ${moneyFormatter.format(Math.abs(value))}`;
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

export function groupTransactions(transactions: TransactionItem[]) {
  const groups = new Map<string, TransactionItem[]>();
  for (const transaction of transactions) {
    const label = groupDateLabel(transaction.date);
    groups.set(label, [...(groups.get(label) ?? []), transaction]);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export function groupDateLabel(value: string) {
  const today = new Date();
  const date = new Date(`${value}T00:00:00`);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const delta = Math.round((todayStart.getTime() - date.getTime()) / 86400000);

  if (delta === 0) return "Today";
  if (delta === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function bucketRank(type: string) {
  if (type === "savings") return 1;
  if (type === "bills") return 2;
  return 3;
}

export function bucketColor(type: string) {
  if (type === "savings") return "cyan";
  if (type === "bills") return "violet";
  return "amber";
}

export function bucketCaption(bucket: BucketItem) {
  if (bucket.type === "savings") return "Bonus 3.55% p.a.";
  if (bucket.type === "bills") return "Auto-pay bills";
  return `Daily RM ${moneyFormatter.format(bucket.balance / 30)}`;
}

export function avatarColor(name: string) {
  const palette = [
    "linear-gradient(135deg,#ec4899,#7c3aed)",
    "linear-gradient(135deg,#22d3ee,#0e7490)",
    "linear-gradient(135deg,#f59e0b,#b45309)",
    "linear-gradient(135deg,#7c3aed,#4c1d95)",
    "linear-gradient(135deg,#4ade80,#15803d)",
  ];
  const index = name
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function card(extra = "") {
  return cn("rounded-[22px] border border-white/10 bg-[#16162A]", extra);
}

export function roundButton(extra = "") {
  return cn("grid place-items-center rounded-full bg-white/10 text-white", extra);
}

export function primaryButton(extra = "") {
  return cn(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#7C3AED] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(124,58,237,.38)] disabled:cursor-not-allowed disabled:opacity-70",
    extra,
  );
}

export function secondaryButton(extra = "") {
  return cn(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#A78BFA]/40 bg-white/5 px-4 text-sm font-black text-[#E9E5FB] disabled:cursor-not-allowed disabled:opacity-70",
    extra,
  );
}

export async function resizeImage(file: File, maxPx: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export { compactFormatter };
