"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Target, X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { TabId } from "./constants";
import { tabs } from "./constants";
import { avatarColor, cn, formatMoney, roundButton } from "./utils";

export function Avatar({ name, small = false, className = "" }: { name: string; small?: boolean; className?: string }) {
  const initial = name.trim()[0]?.toUpperCase() ?? "A";
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full text-white font-black",
        small ? "size-7 text-xs" : "size-[38px] text-[15px]",
        className,
      )}
      style={{ background: avatarColor(name) }}
    >
      {initial}
    </span>
  );
}

export function Pill({
  children,
  cyan = false,
  green = false,
  amber = false,
}: {
  children: ReactNode;
  cyan?: boolean;
  green?: boolean;
  amber?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-5 items-center rounded-full px-2 text-[10px] font-black uppercase tracking-wide text-white",
        "bg-[#EC4899]",
        cyan && "bg-[#22D3EE]/15 text-[#22D3EE] shadow-[inset_0_0_0_1px_rgba(34,211,238,.36)]",
        green && "bg-[#4ADE80]/15 text-[#4ADE80] shadow-[inset_0_0_0_1px_rgba(74,222,128,.34)]",
        amber && "bg-[#F59E0B]/20 text-[#F59E0B] shadow-[inset_0_0_0_1px_rgba(245,158,11,.36)]",
      )}
    >
      {children}
    </span>
  );
}

export function Progress({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <i
        className={cn(
          "block h-full rounded-full",
          color === "cyan" && "bg-[#22D3EE]",
          color === "green" && "bg-[#4ADE80]",
          color === "pink" && "bg-[#EC4899]",
          color === "amber" && "bg-[#F59E0B]",
          color === "violet" && "bg-[#7C3AED]",
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function AnimatedProgress({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <motion.i
        className={cn(
          "block h-full rounded-full",
          color === "cyan" && "bg-[#22D3EE]",
          color === "green" && "bg-[#4ADE80]",
          color === "pink" && "bg-[#EC4899]",
          color === "amber" && "bg-[#F59E0B]",
          color === "violet" && "bg-[#7C3AED]",
        )}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ type: "spring", stiffness: 60, damping: 18 }}
      />
    </div>
  );
}

export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[80]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            className="absolute inset-0 w-full bg-[#05050C]/60 backdrop-blur-md"
            onClick={onClose}
            aria-label="Close sheet"
          />
          <motion.div
            className="no-scrollbar absolute inset-x-0 bottom-0 max-h-[84%] overflow-y-auto rounded-t-[32px] border-t border-white/10 bg-gradient-to-b from-[#1A1A2E] to-[#13132A] px-[22px] pb-8 pt-3.5 shadow-[0_-20px_60px_rgba(0,0,0,.6)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-white/20" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SheetHeader({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-black uppercase tracking-[.14em] text-[#A78BFA]">
        {label}
      </span>
      <button className={roundButton("size-[30px]")} onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
    </div>
  );
}

export function TabBar({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="absolute bottom-5 left-3 right-3 z-50 grid h-[74px] grid-cols-5 items-center rounded-[28px] border border-white/10 bg-[#16162A]/90 shadow-[0_18px_40px_rgba(0,0,0,.5)] backdrop-blur-xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={cn(
              "grid cursor-pointer justify-items-center gap-1 bg-transparent text-[10px] font-black text-[#7C7C92]",
              active === tab.id && "text-white",
            )}
            onClick={() => onChange(tab.id)}
          >
            <Icon size={21} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function QuickAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button className="grid cursor-pointer justify-items-center gap-2.5 bg-transparent text-[#D9D6F4]" onClick={onClick}>
      <span className="grid size-[58px] place-items-center rounded-full bg-gradient-to-b from-[#8B5CF6] to-[#6D28D9] shadow-[0_12px_24px_rgba(124,58,237,.45),inset_0_-8px_20px_rgba(167,139,250,.22)]">
        <Icon size={23} />
      </span>
      <em className="text-xs font-bold not-italic">{label}</em>
    </button>
  );
}

export function Title({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: LucideIcon }) {
  return (
    <header className="mb-4 mt-1 flex items-center justify-between gap-3">
      <div>
        <h1 className="m-0 text-2xl font-black leading-none">{title}</h1>
        <p className="mt-1.5 text-[13px] font-medium text-[#A78BFA]">{subtitle}</p>
      </div>
      <IconButton label={title} icon={Icon} />
    </header>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  spin = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  spin?: boolean;
}) {
  return (
    <button
      className={roundButton("size-[38px]")}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
    >
      <Icon className={spin ? "animate-spin" : ""} size={18} />
    </button>
  );
}

export function SectionHeader({ title, action, compact = false }: { title: string; action?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between", compact ? "mb-2" : "mb-2 mt-4")}>
      <h2 className="m-0 text-sm font-black">{title}</h2>
      {action && <span className="text-xs font-black text-[#A78BFA]">{action}</span>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="mb-4 gap-1 rounded-full border border-white/10 bg-black/35 p-1"
      style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((option) => (
        <button
          key={option.id}
          className={cn(
            "h-9 rounded-full bg-transparent text-[13px] font-black text-zinc-400",
            value === option.id && "bg-gradient-to-b from-[#7C3AED] to-[#6D28D9] text-white shadow-[0_6px_14px_rgba(124,58,237,.4)]",
          )}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ScreenScroller({ children }: { children: ReactNode }) {
  return (
    <section className="no-scrollbar relative z-10 h-full overflow-y-auto px-[22px] pb-[126px] pt-6">
      {children}
    </section>
  );
}

export function Hero({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 bg-[radial-gradient(circle_at_82%_8%,rgba(236,72,153,.55),transparent_12rem),radial-gradient(circle_at_20%_8%,rgba(76,29,149,.95),transparent_15rem),linear-gradient(180deg,#2b0e55_0%,#4c1d95_36%,rgba(131,24,67,.56)_68%,rgba(10,10,20,0)_100%)]",
        compact ? "h-[230px]" : "h-[340px]",
      )}
    />
  );
}

export function MoneySlider({
  label,
  value,
  min,
  max,
  color,
  sign,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  color: "cyan" | "amber" | "violet";
  sign: "+" | "-";
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex justify-between gap-3 text-[13px]">
        <strong>{label}</strong>
        <em
          className={cn(
            "font-black not-italic",
            color === "cyan" && "text-[#22D3EE]",
            color === "amber" && "text-[#F59E0B]",
            color === "violet" && "text-[#A78BFA]",
          )}
        >
          {sign}RM {value}/month
        </em>
      </span>
      <input
        className={cn(
          "w-full",
          color === "cyan" && "accent-[#22D3EE]",
          color === "amber" && "accent-[#F59E0B]",
          color === "violet" && "accent-[#7C3AED]",
        )}
        type="range"
        min={min}
        max={max}
        step={10}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function ProjectionTwin({ title, amount, muted = false }: { title: string; amount: number; muted?: boolean }) {
  return (
    <div
      className={cn(
        "grid min-w-0 justify-items-center gap-1.5 rounded-[18px] border p-3 text-center",
        muted
          ? "border-white/10 bg-white/[.04]"
          : "border-[#22D3EE]/35 bg-[#22D3EE]/10",
      )}
    >
      <div
        className={cn(
          "grid size-11 place-items-center rounded-full",
          muted
            ? "bg-gradient-to-br from-zinc-600 to-zinc-800 text-zinc-400"
            : "bg-[radial-gradient(circle_at_30%_30%,#67e8f9,#0e7490)] text-white",
        )}
      >
        <Target size={21} />
      </div>
      <span className={cn("text-[11px] font-black", muted ? "text-zinc-400" : "text-[#22D3EE]")}>{title}</span>
      <strong className="text-lg font-black">{formatMoney(amount)}</strong>
      <small className="text-[11px] text-zinc-400">Age 30</small>
    </div>
  );
}
