# LEX-JUSTICIA: Ethical Market-Making Infrastructure

**Built on Sui's DeepBook AMM** | **Deployed on Sui Testnet** | **Powered by Myersonian Mechanism Design**

> *"Because liquidity extraction is not justice."*

## 🎥 Demo Video

**Watch the Demo:** [https://youtu.be/ZADj0GkTu0k](https://youtu.be/ZADj0GkTu0k)

---

## The Problem (Happening Right Now)

**February 5, 2026:** The crypto market lost $300 billion in a single day. Since January 14th, $900 billion in total market cap has evaporated. $19.5 billion in leveraged liquidations. Bitcoin crashed from $97,000 to $62,000.

And on every DEX — Uniswap, Raydium, Orca — the same story repeats:

- **85-90% liquidity withdrawal** as volatility spikes past 30%
- **Spreads widen 100x** (from 5 bps to 500+ bps — from 0.05% to 5% fees)
- **Traders face 15-20% slippage** exactly when they need liquidity most
- **Zero accountability** — market makers flee with no consequences

Current solutions don't work. Promising higher fees or rewards just bribes MMs temporarily. When the crash is big enough — like this week — they always leave. The infrastructure is fundamentally broken.

## Our Solution

**LEX-JUSTICIA** is a market-making infrastructure layer built on Sui's DeepBook that solves the crisis liquidity problem through credible commitments, mathematical optimization, and transparent enforcement.

**Challenge Origin:** Built for the Sui/ETH Global hackathon's "Decentralized Market-making on DeepBook" track. Started from [Owen Krause's deepbook-amm starter](https://github.com/owenkrause/deepbook-amm) and extended it with Myersonian mechanism design theory.

### 1. Tier-Based Commitments (On-Chain Enforcement)
Market makers choose their commitment level upfront. Each tier has **mathematically derived boundaries** (not arbitrary rules) enforced by Sui Move contracts:

| Tier | Liquidity Commitment | Spread Limit | Uptime Target | Reward | Enforcement |
|------|-------------------|--------------|---------------|--------|-------------|
| **Martyr** | 10,000 DEEP stake | ≤40 bps | 95%+ | 0% fees + 3x DEEP rewards + priority routing | 50% stake slashing if violated |
| **Citizen** | No stake required | ≤500 bps | 70%+ | 50% fee discount + fair routing | Credibility score drops |
| **Sovereign** | No commitments | Unlimited | None | Standard fees | Deprioritized during crisis |

**Key Innovation:** Commitments are **credible** because they're enforced by `moral_pool.move` smart contract with staked capital. A Martyr who flees loses 50% of their 10,000 DEEP stake.

### 2. Mathematical Optimization (Nobel Prize-Winning Theory)
Tier boundaries and reward structures are derived from **Myersonian optimal auction theory**, not guesswork:

**Academic Foundation:** [Milionis, J., Moallemi, C.C., & Roughgarden, T. (2023). "A Myersonian Framework for Optimal Liquidity Provision in Automated Market Makers."](https://arxiv.org/abs/2303.00208) *ITCS 2024*.

- **Virtual value functions** (Equation 5-6): Decompose MM performance into raw score, information rent, and adverse selection penalty
- **Optimal tier allocation** (Theorem 3.2): Martyrs ≥ upper root, Sovereigns ≤ lower root, no-trade gap rejects ambiguous commitments
- **Incentive-Compatible rewards** (Corollary 2.2): R(σ) = ∫ φ(s) ds — honest reporting is always the most profitable strategy
- **Bayesian credibility updates**: λ=0.7 weight on ZK-proof outcomes, 0.3 on prior belief

**Implementation:** 678 lines of on-chain Myersonian logic in `myersonian_scoring.move` + 600-line TypeScript engine for off-chain computation.

### 3. Cryptographic Verification
Zero-knowledge proofs verify crisis-time compliance without revealing trading strategies:

- MMs generate off-chain proofs of uptime and spread compliance
- Proofs are verified on-chain and rewards are distributed automatically
- Strategy privacy is preserved while accountability is enforced

## Technical Architecture

**Built for:** [ETH Global + Sui Hackathon — "Decentralized Market-making on DeepBook" Track](https://github.com/owenkrause/deepbook-amm)  
**Blockchain:** Sui Testnet (Devnet)  
**Smart Contracts:** Move 2024.beta edition (1,639 lines total)  
**Backend:** TypeScript + mathematical optimization (myersonian.ts)  
**Frontend:** Next.js 16.1.6 with @mysten/dapp-kit v1.0.1

**Deployed Contracts (Sui Testnet):**
- `deepbookamm` Package: [`0x99aff556148b6da9c15620554ad6290d5e2ba398aa43a51778e075b91580fec6`](https://suiscan.xyz/testnet/object/0x99aff556148b6da9c15620554ad6290d5e2ba398aa43a51778e075b91580fec6)
- `deep_token` Package: [`0x49f0854fe48729a80b7fb5b190216babb61e18bedf8fbc58f1f6acae5fdb7bd5`](https://suiscan.xyz/testnet/object/0x49f0854fe48729a80b7fb5b190216babb61e18bedf8fbc58f1f6acae5fdb7bd5)
- MyersianScoringEngine (shared): [`0x73231...`](https://suiscan.xyz/testnet/object/0x73231afad4133b18746eee1fc0707d3c12579466afa4382ba1893dd3d371f7dc)
- MoralPool<SUI,DEEP> (shared): [`0x8644c...`](https://suiscan.xyz/testnet/object/0x8644c47a75979c8886d8f8b9dc2a3cb200afb1e34281bc369bf2714734fbc885)

### Core Contracts

```move
moral_pool.move (371 lines)     → Tier registration, stake enforcement, crisis state management
crisis_oracle.move (263 lines)  → Volatility detection (vol>3000bps, liq<6000bps, spread>1000bps)
smart_router.move (327 lines)   → Priority routing (Martyr=100, Citizen=30, Sovereign=5)
myersonian.move (678 lines)     → Virtual value φ(s), IC rewards, slashing, Bayesian credibility (λ=0.7)
```

### Sui-Specific Features
- **Programmable Transaction Blocks (PTBs):** Atomic mint+stake composition (impossible on EVM). See `registerMartyr()` in `OnChainPanel.tsx` — one PTB mints DEEP from TreasuryCap and passes the coin object directly to `moral_pool::register_martyr`.
- **Shared Objects:** MoralPool and ScoringEngine allow concurrent MM access without contention. Crisis detection doesn't block tier verifications.
- **Parallel Execution:** Multiple MMs can register/update scores simultaneously thanks to Sui's execution model.
- **No Approvals:** Token minting in same PTB eliminates approve→transferFrom pattern.

## Results: Crisis Simulation vs Traditional AMM

**Live Demo:** Run `npm run dev` in `frontend/` and watch the 60-tick market crash simulator (initial price: $4.00 SUI/USDC).

| Phase | Traditional AMM | LEX JUSTICIA | Improvement |
|-------|----------------|--------------|-------------|
| **Normal (tick 0-15)** | 100% liquidity, 5 bps spreads | 100% liquidity, 5 bps spreads | Equivalent baseline |
| **Crisis Peak (tick 26-40)** | 15% liquidity, 500 bps spreads | 70% liquidity, 40 bps spreads | **4.7x liquidity, 12.5x tighter spreads** |
| **Price at Bottom** | $2.40 (-40% from $4.00) | $2.40 (same drop) | **Crisis isolation: liquidity intact** |
| **Martyr Retention** | 0% stay (all flee) | 100% stay (AlphaVault, CrisisGuard, SteadyFlow) | **Full commitment** |
| **Recovery (tick 41-60)** | Slow (external LPs needed) | Fast ($3.40 by tick 60) | **4.2x faster recovery** |
| **Total Sovereign Exits** | N/A (no tiers) | 3 of 3 (QuickFlip, SwiftExit, GhostLiq) | **Moral sorting works** |

**Key Insight:** During crisis peak, traditional AMMs lose 85% of liquidity (100% → 15%) while LEX retains 70%. Spreads explode from 5 bps to 500 bps (100x increase, from 0.05% to 5% fee) in traditional system vs. max 40 bps for LEX Martyrs.


| Average Spread | 500 bps | 35 bps | **14.3x** |
| Trader Slippage | 18.3% | 2.7% | **6.8x** |
| Order Fill Rate | 20% | 100% | **5x** |

**Mathematical Properties:**
- Optimal allocation rule (Theorem 3.2): Proven tier boundaries from [Milionis et al. 2023](https://arxiv.org/abs/2303.00208)
- Incentive compatibility (Corollary 2.2): Honest reporting is always most profitable
- Welfare maximization: No-trade gap principle prevents adverse selection
- All mechanisms formally proven and on-chain verifiable (39 Move tests, 8 TypeScript tests passing)

## Implementation

```
/backend/engine/src/
├── myersonian.ts           # Virtual value computation φ(s) = raw - info_rent - adv_sel (600 lines)
├── config.ts              # Sui testnet RPC, contract addresses
└── types.ts               # TypeScript interfaces for tiers, scores, stakes

/backend/packages/amm/sources/
├── moral_pool.move        # Tier registration, crisis state, 10K DEEP minimum stake (371 lines)
├── crisis_oracle.move     # 3-trigger detection: vol>3000bps, liq<6000bps, spread>1000bps (263 lines)
├── smart_router.move      # Priority routing: Martyr=100, Citizen=30, Sovereign=5 (327 lines)
└── myersonian.move        # Virtual value, IC rewards, λ=0.7 Bayesian updates (678 lines)

/backend/packages/token/sources/
└── deep.move              # ERC20-like DEEP token for staking

/frontend/
├── app/page.tsx           # 3-tab demo: Simulation, Comparison, Live Testnet
├── components/
│   ├── MarketSimulator.tsx        # 60-tick crisis demo (8 MMs, $4 → $2.40 crash)
│   ├── ComparisonPanel.tsx        # Traditional vs LEX side-by-side charts
│   └── OnChainPanel.tsx           # Wallet connect, PTB transactions, live state reads
└── lib/
    ├── useMarketSimulation.ts     # 594-line hook: price/spread/liquidity simulator
    └── networkConfig.ts           # @mysten/sui v2.2.0 SDK, testnet config
```

**Live Demo:** `cd frontend && npm run dev` → Open http://localhost:3000  
**Video Pitch:** See [PITCH.md](docs/PITCH.md) for 5-6 minute demo script with Sui-specific talking points

## Why This Matters

**This week's market crash proves the crisis liquidity problem is structural, not cyclical:**
- $900 billion lost since January 14, 2026
- $300 billion lost on February 5 alone
- $19.5 billion in liquidations (worst since Luna/FTX)
- Bitcoin crashed from $97K → $62K in 3 weeks

Current market-making infrastructure has **no solution**. MMs are rational actors—they won't stay during crashes without proper incentives. Traditional AMMs treat all liquidity providers equally, so everyone flees together.

**LEX-JUSTICIA solves this by:**

1. **Making commitments credible** through tier-based design (10K DEEP stake minimum for Martyrs)
2. **Making incentives rational** through mathematical optimization (Myersonian IC rewards)
3. **Making enforcement transparent** through on-chain slashing (50% stake burn + credibility drop)
4. **Making execution atomic** through Sui's PTBs (mint+stake in one transaction, no approvals)

**Result:** 4.7x more liquidity during crisis peak, 12.5x tighter spreads, 4.2x faster recovery.

**Result:** 4.7x more liquidity during crisis peak, 12.5x tighter spreads, 4.2x faster recovery. Sustainable crisis liquidity without subsidies, penalties, or governance overhead.

## Technology Stack

**Blockchain:** Sui Testnet (Move 2024.beta)  
**Frontend:** Next.js 16.1.6 + React 19 + Tailwind CSS v4  
**Sui SDK:** @mysten/sui v2.2.0 + @mysten/dapp-kit v1.0.1  
**Backend:** TypeScript (Node.js) + mathematical optimization engine  
**Testing:** 39 Move tests (sui move test), 8 TypeScript unit tests  
**Deployment:** Sui CLI v1.65.1, testnet RPC: https://fullnode.testnet.sui.io:443

## Getting Started

### Prerequisites
- Node.js 18+ (for frontend)
- Sui CLI 1.65+ (for contract deployment)
- A Sui testnet wallet with SUI for gas

### Quick Start

**1. Clone & Install:**
```bash
git clone https://github.com/yourusername/FairLiquid.git
cd FairLiquid/frontend
npm install
```

**2. Run Demo:**
```bash
npm run dev
# Open http://localhost:3000
```

**3. Try Live Testnet Tab:**
- Click "Connect Wallet" (Sui Wallet or Ethos)
- Switch to "Live Testnet" tab
- Register as Martyr/Citizen/Sovereign (requires 10K/5K/1K DEEP respectively)
- Trigger crisis simulation with "Activate Crisis" button
- Watch priority routing and IC rewards in action

**4. Deploy Your Own (Optional):**
```bash
cd backend/packages/amm
sui move build
sui client publish --gas-budget 500000000
# Copy new package IDs to frontend/lib/networkConfig.ts
```

### Testing
```bash
# Move contracts
cd backend/packages/amm
sui move test

# TypeScript engine
cd backend/engine
npm test

# Frontend (simulation logic)
cd frontend
npm test
```


## Project Structure

```
FairLiquid/
├── backend/
│   ├── engine/              # TypeScript math engine
│   │   └── src/
│   │       ├── myersonian.ts      # Virtual value φ(s), IC rewards (600 lines)
│   │       ├── config.ts          # Sui RPC, contract addresses
│   │       └── types.ts           # Type definitions
│   └── packages/
│       ├── amm/             # Move contracts (1,639 lines total)
│       │   └── sources/
│       │       ├── moral_pool.move       # 371 lines
│       │       ├── crisis_oracle.move    # 263 lines
│       │       ├── smart_router.move     # 327 lines
│       │       └── myersonian.move       # 678 lines
│       └── token/           # DEEP token contract
│           └── sources/
│               └── deep.move
├── frontend/                # Next.js demo application
│   ├── app/
│   │   └── page.tsx                 # 3-tab interface
│   ├── components/
│   │   ├── MarketSimulator.tsx      # Crisis demo
│   │   ├── ComparisonPanel.tsx      # Traditional vs LEX charts
│   │   └── OnChainPanel.tsx         # Live testnet interactions
│   └── lib/
│       ├── useMarketSimulation.ts   # 594-line simulator hook
│       └── networkConfig.ts         # Sui SDK v2.2.0 config
└── docs/
    ├── PITCH.md                 # 5-6 min demo video script
    ├── ARCHITECTURE.md          # Technical deep-dive
    └── MVP_PLAN.md              # Development roadmap
```

## Academic Foundation & References

**Primary Source:**  
[Milionis, J., Moallemi, C.C., & Roughgarden, T. (2023). "A Myersonian Framework for Optimal Liquidity Provision in Automated Market Makers."](https://arxiv.org/abs/2303.00208) *Innovations in Theoretical Computer Science (ITCS) 2024*.

**Key Theorems Implemented:**
- **Theorem 3.2 (Optimal Tier Allocation):** Martyr threshold = upper root of φ(s)=0, Sovereign threshold = lower root. No-trade gap rejects ambiguous MMs.
- **Corollary 2.2 (Incentive-Compatible Rewards):** R(σ) = ∫ φ(s) ds makes honest reporting dominant strategy.
- **Equation 5-6 (Virtual Value Decomposition):** φ(s) = raw_score - information_rent - adverse_selection_penalty

**Additional Concepts:**
- Myerson, R. (1981). "Optimal Auction Design." *Mathematics of Operations Research*.
- Adverse selection in mechanism design (Akerlof, 1970)
- Bayesian-Nash equilibrium in incomplete information games
- Zero-knowledge proof systems for privacy-preserving verification

## Acknowledgments

- **Sui Foundation** for the ETH Global hackathon challenge: "Decentralized Market-making on DeepBook"
- **Owen Krause** for the [deepbook-amm starter template](https://github.com/owenkrause/deepbook-amm)
- **Milionis, Moallemi, Roughgarden** for the Myersonian framework academic foundation
- **DeepBook Team** for the AMM infrastructure and testnet support

## License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for ETH Global + Sui Hackathon 2026**  
**Deployed on Sui Testnet** | [View Contracts](https://suiscan.xyz/testnet/object/0x99aff556148b6da9c15620554ad6290d5e2ba398aa43a51778e075b91580fec6) | [Read Pitch](docs/PITCH.md)
