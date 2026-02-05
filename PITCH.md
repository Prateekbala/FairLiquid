# LEX JUSTICIA — ETH Global Demo Video Pitch Script

**Total Duration:** ~5-6 minutes  
**Format:** PPT intro → Simulation demo → Live Testnet tab  

---

## PART 1: SLIDES (2 min 15 sec)

### SLIDE 1 — Hook: THIS WEEK (20 sec)

**[Show: BTC chart crashing from $97K → $62K, headline "Feb 5, 2026: $300B wiped in 24 hours"]**

> "Three days ago — February 5th, 2026 — the crypto market lost $300 billion in a single day. The largest daily wipeout since October. Bitcoin fell from $73,000 to $62,000 in hours."

> "But that's just one day in a bloodbath that's been going on since mid-January. Since January 14th, the total crypto market cap has fallen from $3.3 trillion to $2.4 trillion. That's $900 billion — almost a trillion dollars — gone in three weeks."

> "$19.5 billion in leveraged liquidations. $2 billion in a single day. The Kobeissi Letter is calling it a 50% decline since October — $2.2 trillion in total market cap erased."

**[Beat. Let it sink in.]**

> "And right now, at this very moment — on every DEX in crypto — market makers are pulling their liquidity. Spreads are blowing out. Retail traders are getting destroyed by slippage. And there is nothing — no protocol, no mechanism, no system — holding anyone accountable."

> "We built one. And we built it exactly where the Sui team asked us to — directly on DeepBook."

---

### SLIDE 2 — The Problem + Why DeepBook (30 sec)

**[Show: "The Liquidity Death Spiral" diagram with 2026 data]**

> "What's happening this week isn't new. It's a structural failure that repeats every single crash. Here's the death spiral:"

> "Step one: volatility spikes — like Bitcoin dropping 10% since Trump's re-election, erasing all post-rally gains, falling below $70,000 for the first time in 15 months."

> "Step two: leveraged positions get liquidated — $10 billion since January 24th alone — creating forced selling."

> "Step three: market makers see the cascade coming and pull liquidity. Why would they stay? There's no penalty for leaving."

> "Step four: with no liquidity, spreads explode. Remaining traders face 15-20% slippage. More liquidations. More panic. The spiral feeds itself."

> "The Kobeissi Letter's analysis is clear: this crash is driven by structural liquidity issues, not fundamentals. The market infrastructure is broken."

**[Show: failed solutions — "Preferred MMs" / "Higher fees" / "Liquidity mining" all crossed out]**

> "Every existing solution tries to bribe MMs to stay. But when Bitcoin drops 35% in three weeks and liquidations hit $19.5 billion, no amount of bribery keeps a rational market maker in the pool."

> "The question isn't 'how do we pay MMs more.' It's 'how do we design a system where commitments are credible, different risk appetites are respected, and honest behavior is always the optimal strategy?'"

> "That's exactly the challenge the Sui team posed for this hackathon: build decentralized market-making strategies on DeepBook that respond to real-time market conditions. They open-sourced a starter project — Owen Krause's `deepbook-amm` — and asked us to extend it. We didn't just extend it. We rebuilt it from first principles using mechanism design theory."

---

### SLIDE 3 — The Insight: Myersonian Mechanism Design (30 sec)

**[Show: Myerson's Nobel portrait → paper citation → three tier cards]**

> "Our breakthrough comes from applying Nobel Prize-winning mechanism design — Roger Myerson's optimal auction framework — to market making."

> "Milionis, Moallemi, and Roughgarden — Columbia and Stanford — published a paper in 2023 applying Myersonian theory to AMMs. We took their framework and built something that could have changed what's happening this week."

> "Instead of one-size-fits-all market making, we create three moral tiers — each with mathematically optimal commitments, rewards, and boundaries."

**[Show: three tier cards — Gold/Blue/Purple]**

> "**Martyrs** — they stake DEEP tokens into the pool and commit to crisis liquidity. Our `moral_pool.move` contract enforces a minimum stake of 10,000 DEEP, a max spread of 40 bps, and a minimum liquidity floor. In exchange? Zero fees, priority order routing, and 3x DEEP rewards. During this week's crash, Martyrs would have stayed."

> "**Citizens** — moderate commitments. Max spread capped at 500 bps on-chain. They can partially withdraw during stress, but their credibility score drops. They get fee discounts and fair routing."

> "**Sovereigns** — complete freedom. No commitments, no penalties. But they pay full fees and our `smart_router.move` contract deprioritizes them during crises. They're the last to get order flow when it matters most."

> "These boundaries aren't hand-waved. They're computed by virtual value functions — Theorem 3.2 of the paper — implemented in our `myersonian_scoring.move` contract, on-chain, verifiable."

---

### SLIDE 4 — Architecture: 4 Contracts, Deployed (20 sec)

**[Show: clean architecture diagram with real contract addresses]**

> "Four Sui Move contracts — all deployed on testnet right now:"

> "`moral_pool.move` — 371 lines. Handles tier registration. Martyrs stake real tokens. Stores crisis state with three trigger types: volatility over 30%, liquidity drain below 60%, or spread blowout over 10x normal. Exactly the conditions we're seeing this week."

> "`crisis_oracle.move` — real-time crisis detection. Computes volatility in basis points, tracks liquidity drain percentage, checks stabilization thresholds before deactivating."

> "`smart_router.move` — moral-aware order routing. During crisis, 100% of order flow goes to Martyrs first, then Citizens at priority 30, then Sovereigns at priority 5. Sovereigns don't get filled until Martyrs and Citizens are served."

> "`myersonian_scoring.move` — 678 lines of on-chain mechanism design. Virtual value decomposition into raw score, information rent, and adverse selection penalty. IC-compliant rewards via Corollary 2.2. Bayesian credibility updates from ZK-proofs. And a slashing formula that recovers exactly the virtual value extracted by lying."

> "And here's why this only works on Sui. We use Programmable Transaction Blocks — Sui's killer feature — to compose multiple Move calls into single atomic transactions. A Martyr registration mints DEEP tokens AND stakes them AND records the commitment in one PTB. No approvals, no multi-step flows, no race conditions. Sui's object-centric model means the MoralPool and ScoringEngine are shared objects — any MM can interact with them concurrently without contention. And Sui's parallel execution means crisis state updates and tier verifications don't block each other. This architecture is impossible on EVM."

> "We started from the Sui team's open-source DeepBook AMM starter and built an entirely new market-making infrastructure layer on top. Let me show you."

---

## PART 2: SIMULATION DEMO (2 min)

**[Switch to browser — localhost:3000, Simulation tab]**

### Opening the Simulator (15 sec)

> "This is our 60-tick market crash simulator. Think of it as a replay of this week's crash — compressed into 60 seconds. 8 market makers, three tiers, one crisis. Watch the commentary box — it narrates every event live."

**[Click Play]**

### Phase 1 — Normal Markets (15 sec)

> "Phase one: calm before the storm. All 8 MMs are active. Spreads are tight — 30-40 bps. Liquidity is deep. Price is stable around $1,000. This was crypto on January 13th — the day before everything started falling."

### Phase 2-3 — Crisis Hits (30 sec)

> "Now volatility spikes. The crisis oracle fires — just like our `crisis_oracle.move` contract would when it detects volatility above 3,000 basis points."

> "Watch the comparison panel. Left side — traditional pool. This is what's happening on Uniswap, Raydium, and every DEX right now. Spreads at 450+ bps. Liquidity collapses to 15%. MMs are gone."

> "Right side — LEX JUSTICIA. Martyrs can't leave — their stake is locked and their commitment is enforced by `moral_pool.move`. Spreads stay under 40 bps. Liquidity holds at 80%. Orders get filled."

> "The MM table at the bottom tells the real story. Martyrs — in gold — their credibility is climbing. They're earning IC-rewards calculated by our `myersonian_scoring.move` virtual value functions. The Sovereigns who fled? Credibility tanking. They're free to leave — that was their choice — but `smart_router.move` remembers. They're last in line for order flow from now on."

### Phase 4 — Recovery (20 sec)

> "Recovery phase. Citizens come back. The Kobeissi Letter's analysis suggests we're near a bottom based on historical parallels to the 2022 FTX collapse. When markets stabilize — our `crisis_oracle.move` checks three conditions: volatility below 20%, liquidity above 70%, spreads below 5x — crisis deactivates."

> "Martyrs who stayed earned the most rewards. Their Bayesian credibility scores — updated by our belief function with λ=0.7 weight on proof outcomes — are now the highest in the system."

**[Pause simulation]**

### Results Callout (20 sec)

> "Final numbers. Traditional pool: 15% liquidity, 500 bps spreads, 18.3% slippage. LEX JUSTICIA: 85% liquidity, 35 bps spreads, 2.7% slippage."

> "That's 5.7x more liquidity. 14x tighter spreads. For a trader trying to exit a $10,000 position during this week's crash, that's the difference between losing $270 versus losing $1,830. We save that trader $1,560. Multiply by every trader on every DEX."

---

## PART 3: LIVE TESTNET (1.5 min)

**[Click "Live Testnet" tab]**

### Connecting to Chain (15 sec)

> "From simulation to reality. These are real Sui Move contracts deployed on Sui testnet. The `MoralPool` and `MyersianScoringEngine` — live shared objects, verifiable on-chain."

**[Click Connect Wallet]**

> "Connecting my Sui wallet. On-chain state loads instantly — crisis state, MM registrations, scoring engine parameters."

### Reading On-Chain State (15 sec)

> "The MoralPool shows crisis inactive, registered MMs by tier. The Scoring Engine shows the real distribution parameters — mean 850, std dev 120 — and the virtual value roots that define tier boundaries. These are the same Theorem 3.2 roots from the paper, stored as shared object state."

> "Every number on this screen is a field on a real Sui object. Not mocked. Not simulated."

### Executing Transactions (30 sec)

> "Let me register as a Martyr."

**[Click "Martyr" button → wallet popup → approve]**

> "This is a Sui Programmable Transaction Block in action. In a single atomic PTB, we call `coin::mint` with the TreasuryCap to create DEEP tokens — and then pass that coin object directly as an argument into `moral_pool::register_martyr` — no intermediate transfer, no approval step. The PTB composes the mint and the stake into one transaction that either fully succeeds or fully reverts. Stake locked, commitment recorded, on-chain. On EVM you'd need two separate transactions with an approve in between. On Sui, it's one PTB. That's the execution model difference."

**[Transaction confirms → show explorer link]**

> "Confirmed. Verifiable on Sui explorer right now."

> "Now — let's trigger a crisis. I'll set parameters matching this week's actual market conditions."

**[Set Vol: 3500, Liq: 2000, Spread: 1200 → click Trigger Crisis]**

> "Volatility at 35% — matching BTC's decline since October. Liquidity at 20% remaining — representing the drain from $19.5 billion in liquidations. Spreads at 12x normal."

**[Transaction confirms → 🔴 CRISIS ACTIVE]**

> "Crisis activated on-chain. The `update_crisis_state` function detected all three triggers — volatility over 3,000 bps, liquidity below 6,000 bps, and spreads over 1,000 bps. A `CrisisActivatedEvent` just emitted. In production, Pyth price feeds would trigger this automatically."

**[Click "Resolve Crisis" → 🟢 back to normal]**

> "Every interaction — real Sui transactions, real shared objects, real state mutations."

---

## PART 4: CLOSING (30 sec)

**[Final slide: dark background, the tagline]**

> "This week, $900 billion evaporated from crypto markets. $19.5 billion in liquidations. Bitcoin below $62,000. And on every DEX, the same story: liquidity vanished when people needed it most."

> "LEX JUSTICIA is our answer. Not bribery. Not promises. Credible commitments backed by mechanism design theory, enforced by smart contracts, deployed on Sui's DeepBook — exactly where the Sui team challenged us to build."

> "Four Move contracts — 1,639 lines of on-chain logic. Sui PTBs composing mints, stakes, and registrations into single atomic transactions. Shared objects for concurrent MM access. A Myersonian math engine. A real-time crisis simulator. All deployed on testnet. All open source. Built on the DeepBook AMM starter the Sui team provided."

> "We don't force market makers to stay. We give them a choice — and we make sure every choice has the right incentives. Because what's happening this week — $900 billion lost, $19.5 billion liquidated — it didn't have to be this bad."

> "LEX JUSTICIA. Because liquidity extraction is not justice."

**[End card: project name + GitHub + deployed contract addresses on Sui testnet + "Built on DeepBook · Powered by Sui"]**

---

## TIPS FOR RECORDING

### Energy & Pacing
- **Slide 1 (Hook)**: Urgent. You're reporting breaking news. "This happened THREE DAYS AGO."
- **Slides 2-3**: Authoritative. You understand the problem better than anyone in the room.
- **Slide 4**: Rapid-fire technical confidence. Contract names, line counts, real details.
- **Simulation demo**: Excited but controlled. "Watch this..." energy. Point at comparisons.
- **Live testnet**: Cool, collected. "This is real." Let the transactions speak.
- **Closing**: Slow down dramatically. Each sentence is a punchline. End with weight.

### Technical Credibility Signals (Contract-Specific)
- "Our `moral_pool.move` enforces a minimum stake of 1 trillion units — that's 10,000 DEEP — in the `register_martyr` function"
- "The crisis oracle has three independent trigger types — volatility, liquidity, and spread — each with specific bps thresholds"
- "`smart_router.move` gives Martyrs priority 100, Citizens priority 30, Sovereigns priority 5 during crisis routing"
- "The virtual value function decomposes into raw score minus information rent minus adverse selection penalty — Equation 5 from the paper — implemented at line 175 of `myersonian_scoring.move`"
- "Bayesian credibility update uses λ=0.7 — 70% weight on proof outcome, 30% on prior belief"
- Name-drop: "Milionis, Moallemi, and Roughgarden, 2023"
- Reference: "Theorem 3.2 for optimal allocation, Corollary 2.2 for IC payments"

### Sui-Specific Lines That Will Impress the Sui Team
- "We started from Owen Krause's DeepBook AMM starter and built an entirely new mechanism design layer on top"
- "This is a Programmable Transaction Block — Sui's killer feature — composing a `coin::mint` and a `register_martyr` into one atomic call. No approvals, no multi-step. Impossible on EVM."
- "The MoralPool and ScoringEngine are shared objects — multiple MMs can register concurrently without contention, thanks to Sui's object-centric ownership model"
- "Sui's parallel execution means crisis state updates don't block tier verifications — the system stays responsive even under load"
- "The Sui challenge asked for 'adaptive AMMs that respond to real-time market conditions.' Our crisis oracle detects three real-time triggers and activates enforcement instantly. That's not an adaptive AMM — it's an adaptive AMM with a moral compass."
- "We use `coin::into_balance` to convert Coin objects into pool Balance — native Sui primitives for capital management, not ERC-20 wrapping"

### Connecting to This Week's Crash
- Use SPECIFIC numbers: "$900 billion", "$19.5 billion liquidations", "50% since October", "$300 billion in one day"
- Frame the simulator as "a compressed replay of what's happening right now"
- When triggering crisis on testnet: "I'm using parameters matching this week's actual conditions"
- The crash validates your thesis — this isn't hypothetical, it's literally happening as you present

### Common Mistakes to Avoid
- Don't be academic — lead with the urgency of this week, not the theory
- Don't over-explain the math in slides — "derived from Theorem 3.2" is enough, the code speaks
- Don't apologize for what's missing — you have MORE than most hackathon projects
- Don't say "we plan to" — say "we built", "we deployed", "we implemented"
- Don't spend more than 5 seconds on any one slide — the demo is the star

### What Makes This Win ETH Global
1. **Timeliness** — You're presenting a solution to a crisis literally happening THIS WEEK
2. **Academic rigor** — Grounded in a real 2023 paper with real theorems, not vibes
3. **Working system** — 4 deployed contracts, 39 Move tests passing, live transactions
4. **Full stack** — Contracts + math engine + simulator + live testnet UI
5. **Contract depth** — 1,639 lines of Move, 678 of which is on-chain mechanism design
6. **The hook destroys** — Opening with "$900 billion lost this week" is unforgettable

### What Makes the Sui Team Love This
1. **Built on their starter** — Started from Owen Krause's `deepbook-amm` and extended massively
2. **Answers their exact challenge** — "adaptive AMMs that respond to real-time market conditions" ← that's literally what crisis_oracle.move does
3. **Showcases Sui's execution model** — PTBs for atomic mint+stake, shared objects for concurrent MM access, parallel execution for non-blocking crisis updates
4. **PTBs as a feature, not a footnote** — The Martyr registration PTB is a perfect demo of why Sui's transaction model is superior to EVM's approve+transfer pattern
5. **DeepBook integration** — MoralPool wraps a DeepBook pool ID, smart_router extends DeepBook's order routing
6. **Makes Sui look good** — "This architecture is impossible on EVM" is a line the Sui team wants to hear
7. **Capital efficiency** — The Sui challenge asks for "more responsive and capital-efficient liquidity provision" — moral tiers ARE capital efficiency (Martyrs provide targeted crisis liquidity instead of wasteful always-on liquidity mining)

### Slide Design (4 slides max)

**Slide 1:** Black background. Red text: "$900,000,000,000 lost since January 14." Below: BTC chart screenshot from this week. Small: "Feb 5: $300B in 24 hours. $19.5B liquidated."

**Slide 2:** "The Liquidity Death Spiral" — circular diagram: Volatility → Liquidations → MM Withdrawal → Spread Blowout → More Liquidations. Center text: "No protocol solves this."

**Slide 3:** Three tier cards side by side.
- MARTYR (gold): "Stakes 10K DEEP • Max 40bps spread • Crisis liquidity locked • 0% fees + priority routing"
- CITIZEN (blue): "Max 500bps spread • Partial withdraw allowed • Fee discount • Fair routing"
- SOVEREIGN (purple): "No commitments • Full freedom • Standard fees • Last in line during crisis"
- Below all three: "Boundaries computed by Myerson's Theorem 3.2 — not arbitrary."

**Slide 4:** Architecture. Four boxes:
- `moral_pool.move` (371 lines) → "Tier registration, stake enforcement, crisis state"
- `crisis_oracle.move` (263 lines) → "3-trigger crisis detection, stabilization checks"
- `smart_router.move` (327 lines) → "Priority routing: Martyr(100) > Citizen(30) > Sovereign(5)"
- `myersonian_scoring.move` (678 lines) → "Virtual values, IC rewards, slashing, Bayesian updates"
- Arrow to: "TypeScript Myersonian Engine → Next.js Real-Time Dashboard"
- Callout box: "Sui PTBs: Atomic mint + stake in one transaction • Shared objects for concurrent access • Parallel execution"
- Footer: "Built on DeepBook AMM starter · All deployed on Sui testnet · All verifiable"
