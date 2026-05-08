# Kira — Live Demo Script
### 3-Minute Two-Person POV Demo

> **Setup:** Two phones on screen simultaneously.
> **LEFT** = Jin Seng's account | **RIGHT** = Josephine's account
> Both are in the same squad: **KL Kawan Crew**
>
> **Pre-demo state (reset via `/api/seed`):**
> - Jin Seng: RM2,800 income · Flex RM680 · Bills RM420 · Savings RM1,120 · 3 pending debts from Nando's (Ali, Siti, Hana)
> - Josephine: squad member, has an i_owe debt to Jin Seng from a previous dinner
> - Squad: KL Kawan Crew · "No Bubble Tea Week" challenge · Bali Trip 2027 shared bucket at RM1,350 / RM5,000
> - Musim: Raya card visible on home, auto-save OFF

---

## [PRE-SHOW — Before demo starts]

**[No phones visible. Narrator to room.]**

> "Quick question — how many of you have driven around SS2, found a spot, looked at the meter,
> thought 'it's just RM1' — and walked off without paying?
>
> That RM1 of friction just became a RM30 fine. Not because you're careless.
> Because the system made it easier to ignore than to pay.
>
> That's the problem Kira is built to solve. Across every part of your financial life."

**[Phones appear. Demo begins.]**

---

## [0:00 – 0:20] Opening — The Setup

**[BOTH screens on Home]**

> **Narrator:**
> "It's payday week. Jin Seng just got his salary. Josephine still owes him from last night's dinner.
> This is Kira — it handles both of those things, automatically."

**[LEFT]** Jin Seng's home screen:
- Total balance RM2,220 visible
- Musim cards scrolling: *Hari Raya · Semester Fees · Year-End*
- SnapIt Rewind banner: *"Your May story is ready"*
- Weekly delta: spending this week shown in red/green

**[RIGHT]** Josephine's home screen:
- Her balance visible
- Wallet tab has a badge — she has an outstanding debt

---

## [0:20 – 0:50] Scene 1 — Receipt Scan: Dinner, Split by Dish

**[LEFT screen only]**

> **Narrator:**
> "Last night, Jin Seng paid for dinner. Instead of doing mental math, he just scans the receipt."

**Action:** Jin Seng taps the **camera button** (Scan Receipt) → photographs the receipt

**[LEFT]** AI vision processes the image — parsed expense card slides up:
```
RM 27.20
[Restaurant name] — Food & Drinks
Jin Seng · RM 16.30
Jo       · RM 10.90
```
Confidence: 97%

> **Narrator:**
> "The AI reads the receipt, matches the line items to each person, and splits it exactly — no rounding, no awkward conversations."

**Action:** Jin Seng taps **Confirm and save**

✓ Transaction saved · 1 debt record created: Jo owes RM10.90

**[RIGHT]** Josephine's **Wallet → I Owe tab** — RM10.90 to Jin Seng appears instantly

> **Narrator:**
> "Josephine's account already knows she owes RM10.90. No message needed."

---

## [0:50 – 1:15] Scene 2 — Josephine Pays Back

**[RIGHT screen]**

> **Narrator:**
> "Josephine sees the debt. She taps Pay."

**Action:** Josephine taps **Pay** on Jin Seng's debt card → TransferSheet opens
- Amount pre-filled: RM10.90
- Counterparty: Jin Seng
- Taps **Send**

✓ Transfer posted · Debt marked settled on Josephine's side

**[LEFT screen]**

> **Narrator:**
> "Jin Seng gets the money. He opens the Owes Me tab and matches the incoming payment."

**Action:** Jin Seng → **Wallet → Owes Me** tab
- Types "Jo" in sender name field, "10.90" in amount field
- Taps **Match payment**

✓ Fuzzy match fires — debt settled · Context shown: *"Jo — [Restaurant]"*

> **Narrator:**
> "The reconciliation engine matches by name similarity and amount. One tap, done."

---

## [1:15 – 1:45] Scene 3 — Flow: Salary Autopilot

**[LEFT screen only]**

> **Narrator:**
> "Now Jin Seng's salary just dropped. Kira's Flow engine has been waiting for this."

**Action:** Jin Seng switches to **Flow tab**

**[LEFT]** Flow screen loads:
- Safe-to-Spend Today: **RM28.61 / day**
- Shield: **72% — Watch zone** (RM585 needed, RM420 funded)
- Payday: 8 days away

> **Narrator:**
> "Flow already knows what Jin Seng owes — bills, PTPTN, Raya savings. It reserves all of that first, then tells him exactly what's left to spend, per day."

**Action:** Jin Seng taps **Run salary autopilot**

**[LEFT]** Salary flow animation fires:
- Purple orb pulses: RM2,800
- Cyan, violet, amber drops flow into 3 streams
- Split confirmation line updates live:

```
Savings RM560 · Bills RM840 · Flex RM1,400
```

- Safe-to-Spend number scales up: **RM46.80 / day**
- Shield jumps to **Protected (94%)**

> **Narrator:**
> "Salary split in one tap. Savings go in before Jin Seng can spend them. The daily number updates immediately."

---

## [1:45 – 2:00] Scene 4 — Musim: Raya Auto-Save

**[RIGHT screen]**

> **Narrator:**
> "Meanwhile, Josephine is thinking about Raya. She doesn't need to set a reminder — Kira already knows it's coming."

**Action:** Josephine scrolls Home screen → Musim card row

**[RIGHT]** Raya card visible:
```
🌙 Hari Raya Aidilfitri
307 days
RM4.89 / day
[Auto-save  OFF]
```

**Action:** Josephine taps the **Auto-save toggle** → ON

✓ Immediate deduction fires — RM4.89 moves from Flex to Savings now
- Card updates: green **"Saved today"** badge appears

> **Narrator:**
> "Auto-save enabled. Every day from now, RM4.89 quietly moves from spending to Raya fund. Josephine doesn't have to remember again."

---

## [2:00 – 2:30] Scene 5 — Squad: Social Accountability

**[BOTH screens]**

> **Narrator:**
> "Saving alone is hard. Kira makes it social."

**Action:** Both switch to **Squad tab**

**[BOTH]** KL Kawan Crew squad loads:
- Leaderboard — ranked by savings rate, not raw amount
- Siti leads at 31% · Jin Seng at 22.5% · Josephine visible in rank

**[LEFT]** Challenge card: **"No Bubble Tea Week"**
- 4/6 days complete · Jin Seng's dot grid shows ✓✓✓✓
- Today: no record yet

**Action:** Jin Seng taps **Done today** → ✓ dot fills in

> **Narrator:**
> "Day 5. Jin Seng's held the streak."

**[RIGHT]** Josephine sees the same challenge — Jin Seng's dot just turned green

**Action:** Josephine taps **I broke it** → RM5 penalty

**[RIGHT]** Shared bucket updates:

```
🏖️ Bali Trip 2027
RM1,355 / RM5,000  →  RM1,360 / RM5,000
```

> **Narrator:**
> "Josephine broke the challenge. The RM5 penalty goes directly into the Bali Trip fund. The squad's goal gets closer every time someone slips."

---

## [2:30 – 2:50] Scene 6 — SnapIt Rewind: Your Month in a Story

**[RIGHT screen]**

> **Narrator:**
> "At the end of every month, Kira tells you your story."

**Action:** Josephine taps **SnapIt Rewind** banner on Home

**[RIGHT]** Full-screen overlay opens:

**Card 1** — *"May was your most consistent month yet."* · 28 transactions · RM1,840 total spend

**[swipe]**

**Card 2** — *The Social Spender* · *"68% of your spending happens with other people. The weekends cost you."*

**[swipe to Card 5]**

**Card 5 — One Unlock:**
> *"Cut dining out by 30% → RM210/month saved. Compounded over 30 years, that's RM146,000 more."*

> **Narrator:**
> "From spending pattern to the cost of not changing — in five cards. That's the whole picture."

---

## [~2:55] Closing — Smart Auto-Pay Callback

**[LEFT screen — Jin Seng, Flow tab. Scroll to Smart Auto-Pay section.]**

> **Narrator:** "One more thing. That parking problem we started with?"

**Action:** Presenter taps the green status dot on the Smart Auto-Pay card

Rich notification slides in from the top of the screen:
```
┌─────────────────────────────────────────┐
│ [🚗] Smart Auto-Pay          just now   │
│ CarPlay disconnected · SS2 Damansara    │
│ Street parking paid · RM1.00 from       │
│ Bills bucket                            │
└─────────────────────────────────────────┘
```

Banner auto-dismisses after 4.5s.

> **Narrator:**
> "Kira saw that Jin Seng's CarPlay disconnected in SS2. It paid the meter from his Bills bucket.
> He didn't think about it. He didn't open an app. The system just acted.
> Zero friction. Zero fine."

---

## Closing Line (optional, 5s)

> **Narrator:**
> "Zero-friction logging. Automatic splits. Social accountability. Autonomous payments.
> This is what financial resilience looks like — when the system does the work."

---

## Director Notes

| Moment | What to emphasise |
|---|---|
| Receipt scan (0:20) | The parsed card — line items matched to each person automatically |
| Reconcile (0:50) | Automation — Jo's debt appeared without any action from her |
| Flow autopilot (1:15) | The number update — safe-to-spend goes UP after salary |
| Musim toggle (1:45) | Immediacy — "Saved today" badge fires right away |
| Squad penalty (2:00) | Fun — Josephine breaking it and money going to Bali Trip is the laugh moment |
| Rewind swipe (2:30) | Pace quickly — 3 cards in 10 seconds, let the visuals do the work |
| Parking notification (2:55) | Tap the green dot — pause and let the banner animate in before speaking |

## Pre-Demo Checklist

- [ ] Both accounts seeded and logged in
- [ ] Jin Seng's account: debts pending (Ali, Siti, Hana from Nando's), salary NOT yet run
- [ ] Josephine's account: i_owe debt to Jin Seng visible in I Owe tab
- [ ] Squad: KL Kawan Crew loaded, challenge active, shared bucket at RM1,350
- [ ] Musim: Raya auto-save OFF on Josephine's account
- [ ] Both phones on Home screen, side by side
- [ ] Prepare receipt prop: clear photo of a receipt showing two line items (RM16.30 + RM10.90 = RM27.20)
- [ ] Test receipt scan in demo lighting before going live
- [ ] Rewind: enough transactions seeded to pass the 3-transaction minimum
- [ ] parkingNotif resets on page refresh — just refresh before demo
