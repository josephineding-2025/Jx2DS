"use client";

import {
  BadgeCheck,
  Banknote,
  Car,
  CircleDollarSign,
  Coins,
  Gift,
  Moon,
  ReceiptText,
  ShoppingBag,
  Utensils,
} from "lucide-react";
import type { TransactionItem } from "./constants";

export function renderMusimIcon(category: string) {
  if (category === "education") return <ShoppingBag size={17} />;
  if (category === "debt") return <Banknote size={17} />;
  return <Moon size={17} />;
}

export function renderTransactionIcon(transaction: TransactionItem) {
  if (transaction.source === "salary") return <Coins size={18} />;
  if (transaction.source === "transfer") return <BadgeCheck size={18} />;
  if (transaction.category === "Food & Drinks") return <Utensils size={18} />;
  if (transaction.category === "Transport") return <Car size={18} />;
  if (transaction.category === "Groceries") return <ShoppingBag size={18} />;
  if (transaction.category === "Entertainment") return <Gift size={18} />;
  if (transaction.category === "Bills") return <ReceiptText size={18} />;
  return <CircleDollarSign size={18} />;
}
