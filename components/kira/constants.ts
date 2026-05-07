import type { LucideIcon } from "lucide-react";
import {
  Flame,
  Home as HomeIcon,
  Wallet,
  Waves,
} from "lucide-react";
import { DEMO_USER_ID } from "@/lib/demo/seed";
import type { DemoState } from "@/lib/demo/state";

export type TabId = "home" | "duit" | "arus" | "kawan";
export type SheetId = "voice" | "receipt" | null;
export type TransactionItem = DemoState["transactions"][number];
export type DebtItem = DemoState["debts"][number];
export type BucketItem = DemoState["buckets"][number];
export type MusimItem = DemoState["musimEvents"][number];
export type SquadMemberItem = DemoState["squads"][number]["members"][number];
export type SquadItem = DemoState["squads"][number];

export { DEMO_USER_ID };

export const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "duit", label: "Wallet", icon: Wallet },
  { id: "arus", label: "Flow", icon: Waves },
  { id: "kawan", label: "Squad", icon: Flame },
];

export const moneyFormatter = new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const compactFormatter = new Intl.NumberFormat("en-MY", {
  maximumFractionDigits: 0,
});
