"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useState } from "react";
import type {
  RewindHiddenCostCard,
  RewindNumbersCard,
  RewindPatternCard,
  RewindPersonalityCard,
  RewindStory,
  RewindUnlockCard,
} from "@/types";
import { cn } from "./utils";

const CARD_GRADIENTS = [
  "from-[#1A0A3E] via-[#3D1578] to-[#6B1E5A]",
  "from-[#5C0A3A] via-[#8B0F52] to-[#C2185B]",
  "from-[#0D1B4B] via-[#1A2F7A] to-[#3730A3]",
  "from-[#451A03] via-[#78350F] to-[#92400E]",
  "from-[#022C22] via-[#064E3B] to-[#0D766A]",
];

const CARD_GLOW = [
  "rgba(109,28,106,0.6)",
  "rgba(190,24,93,0.6)",
  "rgba(55,48,163,0.6)",
  "rgba(146,64,14,0.6)",
  "rgba(13,118,106,0.5)",
];

const CARD_ACCENT = [
  "#A78BFA",
  "#F472B6",
  "#818CF8",
  "#FBBF24",
  "#34D399",
];

// How many chars determine sizing of the big stat
function statSize(stat: string) {
  const len = stat.replace(/\s/g, "").length;
  if (len <= 3) return "text-[108px]";
  if (len <= 6) return "text-[76px]";
  return "text-[56px]";
}

function VisualCenterpiece({
  emoji,
  stat,
  label,
  accent,
  glow,
}: {
  emoji: string;
  stat: string;
  label: string;
  accent: string;
  glow: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Glow blob behind stat */}
      <div
        className="pointer-events-none absolute size-72 rounded-full blur-[80px]"
        style={{ background: glow, opacity: 0.45 }}
      />

      {/* Emoji */}
      <motion.span
        className="relative z-10 leading-none"
        style={{ fontSize: 64 }}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}
      >
        {emoji}
      </motion.span>

      {/* Big stat */}
      <motion.p
        className={cn(
          "relative z-10 mt-2 font-black leading-none tracking-tighter text-white",
          statSize(stat),
        )}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }}
      >
        {stat}
      </motion.p>

      {/* Label */}
      <motion.p
        className="relative z-10 mt-2.5 text-center text-[12px] font-bold uppercase tracking-[.18em]"
        style={{ color: accent }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.35 }}
      >
        {label}
      </motion.p>
    </div>
  );
}

function CardShell({
  index,
  title,
  emoji,
  visual_stat,
  visual_label,
  bottom,
}: {
  index: number;
  title: ReactNode;
  emoji: string;
  visual_stat: string;
  visual_label: string;
  bottom: ReactNode;
}) {
  const accent = CARD_ACCENT[index];
  const glow = CARD_GLOW[index];

  return (
    <div className="flex h-full flex-col pt-[72px] pb-7 select-none">
      {/* Top zone */}
      <motion.div
        className="flex-none px-7"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.35 }}
      >
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-white/30">
          SnapIt Rewind
        </p>
        <h2 className="mt-0.5 text-[26px] font-black uppercase leading-tight text-white/80">
          {title}
        </h2>
      </motion.div>

      {/* Middle zone — visual hero */}
      <div className="flex flex-1 items-center justify-center px-7">
        <VisualCenterpiece
          emoji={emoji}
          stat={visual_stat}
          label={visual_label}
          accent={accent}
          glow={glow}
        />
      </div>

      {/* Bottom zone */}
      <motion.div
        className="flex-none px-7 grid gap-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4, ease: "easeOut" }}
      >
        {bottom}
      </motion.div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-white/10 px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-black text-white">{value}</p>
    </div>
  );
}

function NumbersCard({ card, index }: { card: RewindNumbersCard; index: number }) {
  return (
    <CardShell
      index={index}
      title={<>Your Month<br />in Numbers</>}
      emoji={card.emoji}
      visual_stat={card.visual_stat}
      visual_label={card.visual_label}
      bottom={
        <>
          <p className="text-[14px] italic leading-relaxed text-white/70">
            &ldquo;{card.headline}&rdquo;
          </p>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Transactions" value={String(card.stats.transactions)} />
            <MiniStat label="Days tracked" value={String(card.stats.days_tracked)} />
            <MiniStat label="Top merchant" value={card.stats.top_merchant} />
            <MiniStat
              label="Avg per day"
              value={`RM ${Math.round(card.stats.total_spend / Math.max(card.stats.days_tracked, 1))}`}
            />
          </div>
        </>
      }
    />
  );
}

function PersonalityCard({ card, index }: { card: RewindPersonalityCard; index: number }) {
  const accent = CARD_ACCENT[index];
  return (
    <CardShell
      index={index}
      title={<>Your Money<br />Personality</>}
      emoji={card.emoji}
      visual_stat={card.visual_stat}
      visual_label={card.visual_label}
      bottom={
        <>
          <div
            className="rounded-[18px] px-4 py-3"
            style={{ background: "rgba(255,255,255,0.12)", borderLeft: `3px solid ${accent}` }}
          >
            <p className="text-[18px] font-black text-white">{card.archetype}</p>
          </div>
          <p className="text-[14px] leading-relaxed text-white/75">{card.description}</p>
        </>
      }
    />
  );
}

function PatternCard({ card, index }: { card: RewindPatternCard; index: number }) {
  return (
    <CardShell
      index={index}
      title={<>Your Biggest<br />Pattern</>}
      emoji={card.emoji}
      visual_stat={card.visual_stat}
      visual_label={card.visual_label}
      bottom={
        <>
          <p className="text-[17px] font-black leading-snug text-white">{card.headline}</p>
          <p className="text-[13px] leading-relaxed text-white/70">{card.body}</p>
          {(card.visit_count != null || card.total_amount != null) && (
            <div className="flex flex-wrap gap-2">
              {card.visit_count != null && (
                <span className="rounded-full bg-white/15 px-3.5 py-1.5 text-[12px] font-black text-white">
                  {card.visit_count}× visits
                </span>
              )}
              {card.total_amount != null && (
                <span className="rounded-full bg-white/15 px-3.5 py-1.5 text-[12px] font-black text-white">
                  RM {card.total_amount.toLocaleString()} total
                </span>
              )}
            </div>
          )}
        </>
      }
    />
  );
}

function HiddenCostCard({ card, index }: { card: RewindHiddenCostCard; index: number }) {
  const accent = CARD_ACCENT[index];
  return (
    <CardShell
      index={index}
      title={<>The Hidden<br />Cost</>}
      emoji={card.emoji}
      visual_stat={card.visual_stat}
      visual_label={card.visual_label}
      bottom={
        <>
          <p className="text-[17px] font-black leading-snug text-white">{card.headline}</p>
          <div
            className="flex items-center gap-3 rounded-[16px] px-4 py-3"
            style={{ background: "rgba(255,255,255,0.10)" }}
          >
            <span className="text-2xl">{card.emoji}</span>
            <div>
              <p className="text-[11px] font-bold text-white/50">That&apos;s the same as</p>
              <p className="text-[14px] font-black" style={{ color: accent }}>
                {card.equivalent}
              </p>
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-white/70">{card.body}</p>
        </>
      }
    />
  );
}

function UnlockCard({
  card,
  index,
  onApply,
}: {
  card: RewindUnlockCard;
  index: number;
  onApply: () => void;
}) {
  const accent = CARD_ACCENT[index];
  return (
    <CardShell
      index={index}
      title={<>Your One<br />Unlock</>}
      emoji={card.emoji}
      visual_stat={card.visual_stat}
      visual_label={card.visual_label}
      bottom={
        <>
          <p className="text-[17px] font-black leading-snug text-white">{card.headline}</p>
          <p className="text-[13px] leading-relaxed text-white/70">{card.body}</p>
          <div
            className="flex items-center justify-between rounded-[16px] px-4 py-3"
            style={{ background: "rgba(255,255,255,0.10)" }}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">
                Monthly saving
              </p>
              <p className="text-[22px] font-black text-white">
                RM {card.monthly_saving.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">
                By age 30
              </p>
              <p className="text-[22px] font-black" style={{ color: accent }}>
                +RM {card.cermin_impact_rm.toLocaleString()}
              </p>
            </div>
          </div>
          {card.cermin_slider_key && (
            <button
              className="flex min-h-[52px] w-full items-center justify-between rounded-full bg-white px-5 text-[14px] font-black"
              style={{ color: "#022C22" }}
              onClick={onApply}
            >
              <span>Apply to Cermin</span>
              <span
                className="rounded-full px-3 py-1 text-[12px]"
                style={{ background: "rgba(0,0,0,0.12)" }}
              >
                RM {card.monthly_saving}/mo →
              </span>
            </button>
          )}
        </>
      }
    />
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? "100%" : "-100%", opacity: 0 }),
};

export function RewindStoryOverlay({
  story,
  onClose,
  onApplyCermin,
}: {
  story: RewindStory;
  onClose: () => void;
  onApplyCermin: (key: string, amount: number) => void;
}) {
  const [[index, dir], setPage] = useState<[number, number]>([0, 0]);
  const total = story.cards.length;

  function go(newDir: number) {
    const next = index + newDir;
    if (next < 0 || next >= total) return;
    setPage([next, newDir]);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -50 || info.velocity.x < -300) go(1);
    else if (info.offset.x > 50 || info.velocity.x > 300) go(-1);
  }

  const card = story.cards[index];
  const gradient = CARD_GRADIENTS[index];

  return (
    <motion.div
      className="absolute inset-0 z-[100] overflow-hidden"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={index}
          className={cn("absolute inset-0 bg-gradient-to-b", gradient)}
          custom={dir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={handleDragEnd}
        >
          {/* Animated ambient orb */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            animate={{
              background: [
                "radial-gradient(circle at 25% 35%, rgba(255,255,255,0.06), transparent 55%)",
                "radial-gradient(circle at 75% 65%, rgba(255,255,255,0.06), transparent 55%)",
                "radial-gradient(circle at 25% 35%, rgba(255,255,255,0.06), transparent 55%)",
              ],
            }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Progress bar strip + close */}
          <div className="absolute inset-x-0 top-0 z-20 px-5 pt-12">
            <div className="flex items-center gap-2">
              {story.cards.map((_, i) => (
                <button
                  key={i}
                  className="h-[3px] flex-1 rounded-full overflow-hidden bg-white/20"
                  onClick={() => setPage([i, i > index ? 1 : -1])}
                >
                  {i === index && (
                    <motion.div
                      className="h-full rounded-full bg-white"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0 }}
                    />
                  )}
                  {i < index && <div className="h-full w-full rounded-full bg-white" />}
                </button>
              ))}
              <button
                className="ml-1 grid size-7 shrink-0 place-items-center rounded-full bg-white/15 text-white"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Card content */}
          <div className="h-full">
            {card.type === "numbers" && <NumbersCard card={card} index={index} />}
            {card.type === "personality" && <PersonalityCard card={card} index={index} />}
            {card.type === "pattern" && <PatternCard card={card} index={index} />}
            {card.type === "hidden_cost" && <HiddenCostCard card={card} index={index} />}
            {card.type === "unlock" && (
              <UnlockCard
                card={card}
                index={index}
                onApply={() => {
                  if (card.type === "unlock" && card.cermin_slider_key) {
                    onApplyCermin(card.cermin_slider_key, card.monthly_saving);
                  }
                  onClose();
                }}
              />
            )}
          </div>

          {/* Tap zones — left 30% goes back, right 30% goes forward */}
          <button
            className="absolute inset-y-0 left-0 w-[30%] cursor-pointer bg-transparent"
            onClick={() => go(-1)}
            aria-label="Previous"
          />
          <button
            className="absolute inset-y-0 right-0 w-[30%] cursor-pointer bg-transparent"
            onClick={() => go(1)}
            aria-label="Next"
          />
        </motion.div>
      </AnimatePresence>

      {/* Bottom hint */}
      <div className="pointer-events-none absolute bottom-5 inset-x-0 text-center">
        <p className="text-[10px] font-medium tracking-widest text-white/25 uppercase">
          {index < total - 1 ? "swipe to continue" : "tap × to close"}
        </p>
      </div>
    </motion.div>
  );
}

export function RewindLoadingOverlay() {
  return (
    <motion.div
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-[#1A0A3E] via-[#3D1578] to-[#6B1E5A]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Pulsing glow rings */}
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute size-32 rounded-full bg-[#A78BFA]/20"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute size-20 rounded-full bg-[#A78BFA]/30"
          animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        <div className="relative size-14">
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-white/15 border-t-white" />
        </div>
      </div>
      <motion.p
        className="mt-8 text-[15px] font-black text-white"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        SnapIt is reading your month…
      </motion.p>
      <p className="mt-2 text-[11px] text-white/35 tracking-wide">This takes about 10 seconds</p>
    </motion.div>
  );
}
