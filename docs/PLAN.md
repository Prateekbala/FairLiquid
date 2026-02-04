# LEX-JUSTICIA: Ethical Market-Making on DeepBook
## Moral Liquidity Provision with Categorical Fairness Guarantees

**Tagline:** *Because liquidity extraction is not justice.*

**Track:** Decentralized Market-making on DeepBook (SUI)

**GitHub Starter:** https://github.com/owenkrause/deepbook-amm

---

## The Pivot: From ADL to Market-Making Ethics

### Original Problem: Auto-Deleveraging (ADL)
When exchanges face insolvency, they forcibly close profitable positions to save themselves.

### **New Problem: Liquidity Extraction During Market Stress**

When markets crash, traditional market makers (MMs) can:
1. **Withdraw liquidity** exactly when traders need it most (the "liquidity rug-pull")
2. **Widen spreads** dramatically, extracting value from desperate traders
3. **Selectively fill orders** - filling small retail orders but dodging large institutional ones
4. **Front-run liquidations** using their privileged position in the order book

**The Trolley Problem in Market-Making:**

During a flash crash:
- **Option 1 (Utilitarian):** Pull all liquidity to protect MM's capital → Traders face infinite slippage, market freezes
- **Option 2 (Martyrdom):** Keep tight spreads, MM potentially goes bankrupt → Market stays liquid but MM sacrifices themselves
- **Option 3 (Categorical):** Some MMs commit to "crisis liquidity" in exchange for benefits → Fair, consensual, verifiable

**Current State:** Market makers make these decisions unilaterally with NO accountability, NO consent, NO transparency.

---

## Solution: LEX-JUSTICIA Market-Making Protocol

### Core Concept

A **DeepBook-native market-making framework** where liquidity providers choose their "moral tier" and commit to verifiable behavior during market stress. In exchange for categorical commitments, they receive fee discounts, governance rights, and protection.

### The Three Market-Maker Tiers

#### Tier 1: "The Martyr Market Maker" (Crisis Liquidity Provider)
**Commitment:**
- **MUST maintain liquidity** even during 30%+ price swings
- **MUST keep spreads** within 2x of normal conditions
- **CANNOT withdraw** more than 10% of liquidity during stress events
- **Verified via ZK-proofs** that their orders stayed in the book

**Benefits:**
- **0% maker fees** (earn taker fees only)
- **Priority routing** - retail orders preferentially matched to Martyrs
- **DEEP token rewards** - highest staking multiplier
- **Governance weight** - 3x voting power

**Smart Contract Enforcement:**
```move
// Martyr MM's liquidity is "locked" during crisis with automated penalties
struct MartyrPool has key {
    id: UID,
    owner: address,
    base_liquidity: Balance<BASE>,
    quote_liquidity: Balance<QUOTE>,
    crisis_mode: bool,
    min_spread_bps: u64,  // Cannot exceed 2x normal
    max_withdrawal_pct: u64,  // Cannot exceed 10% during crisis
    violation_penalty: Balance<DEEP>,  // Slashed if violates commitment
}
```

#### Tier 2: "The Citizen Market Maker" (Fair Weather Provider)
**Commitment:**
- **SHOULD maintain liquidity** during normal volatility (<15% swings)
- **MAY widen spreads** up to 5x during extreme events
- **MAY withdraw** up to 50% of liquidity during crisis
- **Fair lottery** for order routing during high volume

**Benefits:**
- **50% maker fee discount**
- **Standard routing** - equal priority with other Citizens
- **Moderate DEEP rewards**
- **Standard governance** - 1x voting power

**Smart Contract Enforcement:**
```move
struct CitizenPool has key {
    id: UID,
    owner: address,
    liquidity: Balance<BASE>,
    spread_multiplier: u64,  // Can increase up to 5x
    withdrawal_limit_pct: u64,  // Can withdraw 50%
    routing_weight: u64,  // VRF lottery weight
}
```

#### Tier 3: "The Sovereign Market Maker" (Opportunistic Provider)
**Commitment:**
- **NO RESTRICTIONS** - can pull liquidity anytime
- **NO SPREAD LIMITS** - can widen to any amount
- **Fully sovereign** - prioritizes own capital safety

**Trade-offs:**
- **Standard maker fees** (no discount)
- **Deprioritized routing** - orders go to Martyrs/Citizens first
- **No DEEP rewards** from protocol
- **Reduced governance** - 0.5x voting power

**Use Case:** Professional MMs who want maximum flexibility and don't need subsidies.

---

## Technical Architecture: DeepBook Integration

### 1. Extend DeepBook's Pool Creation

**File:** `sources/lex_justicia_pool.move`

```move
module lex_justicia::moral_pool {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::clock::{Self, Clock};
    use sui::event;
    use deepbook::clob_v2::{Self as clob, Pool};
    use deepbook::custodian_v2::{Self as custodian};
    
    // Tier levels
    const TIER_MARTYR: u8 = 0;
    const TIER_CITIZEN: u8 = 1;
    const TIER_SOVEREIGN: u8 = 2;
    
    // Crisis detection thresholds
    const CRISIS_VOLATILITY_BPS: u64 = 3000;  // 30% price move
    const CRISIS_VOLUME_MULTIPLIER: u64 = 5;   // 5x normal volume
    
    /// Extended pool with moral commitments
    struct MoralPool<phantom BaseAsset, phantom QuoteAsset> has key {
        id: UID,
        
        // Link to underlying DeepBook pool
        deepbook_pool_id: ID,
        
        // Market maker registry
        martyrs: VecMap<address, MartyrCommitment>,
        citizens: VecMap<address, CitizenCommitment>,
        sovereigns: VecMap<address, SovereignCommitment>,
        
        // Crisis state
        in_crisis: bool,
        crisis_start_time: u64,
        pre_crisis_mid_price: u64,
        
        // Metrics for ZK-proof verification
        martyr_uptime_score: VecMap<address, u64>,  // % time liquidity was present
        martyr_spread_compliance: VecMap<address, bool>,
        
        // Penalty pool (slashed DEEP from violators)
        penalty_pool: Balance<DEEP>,
    }
    
    struct MartyrCommitment has store {
        mm_address: address,
        staked_deep: u64,
        min_base_liquidity: u64,
        min_quote_liquidity: u64,
        max_spread_bps: u64,  // e.g., 20 bps normal, 40 bps crisis
        commitment_timestamp: u64,
    }
    
    /// Create a moral pool on top of DeepBook
    public entry fun create_moral_pool<BaseAsset, QuoteAsset>(
        deepbook_pool: &mut Pool<BaseAsset, QuoteAsset>,
        ctx: &mut TxContext
    ) {
        let pool = MoralPool<BaseAsset, QuoteAsset> {
            id: object::new(ctx),
            deepbook_pool_id: object::id(deepbook_pool),
            martyrs: vec_map::empty(),
            citizens: vec_map::empty(),
            sovereigns: vec_map::empty(),
            in_crisis: false,
            crisis_start_time: 0,
            pre_crisis_mid_price: 0,
            martyr_uptime_score: vec_map::empty(),
            martyr_spread_compliance: vec_map::empty(),
            penalty_pool: balance::zero(),
        };
        
        transfer::share_object(pool);
    }
    
    /// Market maker registers as Martyr tier
    public entry fun register_martyr<BaseAsset, QuoteAsset>(
        pool: &mut MoralPool<BaseAsset, QuoteAsset>,
        stake: Coin<DEEP>,
        min_base_liquidity: u64,
        min_quote_liquidity: u64,
        max_spread_bps: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let mm_address = tx_context::sender(ctx);
        let stake_amount = coin::value(&stake);
        
        // Minimum stake requirement: 10,000 DEEP
        assert!(stake_amount >= 10_000_000_000, 1);
        
        let commitment = MartyrCommitment {
            mm_address,
            staked_deep: stake_amount,
            min_base_liquidity,
            min_quote_liquidity,
            max_spread_bps,
            commitment_timestamp: clock::timestamp_ms(clock),
        };
        
        vec_map::insert(&mut pool.martyrs, mm_address, commitment);
        
        // Store stake in pool
        balance::join(&mut pool.penalty_pool, coin::into_balance(stake));
        
        event::emit(MartyrRegistered {
            mm_address,
            stake_amount,
            max_spread_bps,
        });
    }
    
    /// Detect crisis conditions
    public fun check_crisis_conditions<BaseAsset, QuoteAsset>(
        pool: &mut MoralPool<BaseAsset, QuoteAsset>,
        deepbook_pool: &Pool<BaseAsset, QuoteAsset>,
        clock: &Clock,
    ): bool {
        let current_mid_price = clob::get_mid_price(deepbook_pool);
        
        // If not in crisis, check if we should enter crisis mode
        if (!pool.in_crisis) {
            let price_change_bps = calculate_price_change_bps(
                pool.pre_crisis_mid_price,
                current_mid_price
            );
            
            if (price_change_bps > CRISIS_VOLATILITY_BPS) {
                pool.in_crisis = true;
                pool.crisis_start_time = clock::timestamp_ms(clock);
                pool.pre_crisis_mid_price = current_mid_price;
                
                event::emit(CrisisActivated {
                    pool_id: object::id(pool),
                    trigger_price: current_mid_price,
                    timestamp: pool.crisis_start_time,
                });
                
                return true
            };
        };
        
        // If in crisis for >10 minutes and volatility normalized, exit crisis
        if (pool.in_crisis) {
            let time_elapsed = clock::timestamp_ms(clock) - pool.crisis_start_time;
            if (time_elapsed > 600_000) {  // 10 minutes
                let recent_volatility = calculate_recent_volatility(deepbook_pool);
                if (recent_volatility < 1000) {  // <10% volatility
                    pool.in_crisis = false;
                    
                    event::emit(CrisisEnded {
                        pool_id: object::id(pool),
                        duration_ms: time_elapsed,
                    });
                };
            };
        };
        
        pool.in_crisis
    }
}
```

### 2. ZK-Proof Verification of MM Behavior

**Purpose:** Prove that Martyr MMs actually kept their commitments during crisis without revealing their trading strategies.

**What we prove:**
1. **Liquidity was present** X% of the time during crisis
2. **Spreads stayed within** the committed max
3. **No large withdrawals** occurred during crisis window

**Circuit Design:**

```
// Circom circuit: martyr_compliance.circom

template MartyrCompliance() {
    // Private inputs (MM's actual behavior)
    signal private input order_book_snapshots[100];  // 100 snapshots during crisis
    signal private input spreads[100];
    signal private input liquidity_amounts[100];
    
    // Public inputs (commitments from smart contract)
    signal input committed_min_liquidity;
    signal input committed_max_spread;
    signal input crisis_duration_seconds;
    
    // Public outputs
    signal output compliance_passed;
    signal output uptime_percentage;
    
    // Verify liquidity was >= commitment
    component liquidity_checks[100];
    var passing_snapshots = 0;
    
    for (var i = 0; i < 100; i++) {
        liquidity_checks[i] = GreaterEqThan(64);
        liquidity_checks[i].in[0] <== liquidity_amounts[i];
        liquidity_checks[i].in[1] <== committed_min_liquidity;
        
        passing_snapshots += liquidity_checks[i].out;
    }
    
    // Uptime must be >= 95%
    uptime_percentage <== (passing_snapshots * 100) / 100;
    component uptime_check = GreaterEqThan(64);
    uptime_check.in[0] <== uptime_percentage;
    uptime_check.in[1] <== 95;
    
    // Verify spreads stayed within limits
    component spread_checks[100];
    var spread_violations = 0;
    
    for (var i = 0; i < 100; i++) {
        spread_checks[i] = GreaterEqThan(64);
        spread_checks[i].in[0] <== spreads[i];
        spread_checks[i].in[1] <== committed_max_spread;
        
        spread_violations += spread_checks[i].out;
    }
    
    // No spread violations allowed
    component no_violations = IsZero();
    no_violations.in <== spread_violations;
    
    // Final compliance
    compliance_passed <== uptime_check.out * no_violations.out;
}
```

**Integration with Move:**

```move
/// Verify MM's crisis behavior with ZK-proof
public entry fun verify_martyr_compliance<BaseAsset, QuoteAsset>(
    pool: &mut MoralPool<BaseAsset, QuoteAsset>,
    mm_address: address,
    proof: vector<u8>,
    public_inputs: vector<u64>,
    ctx: &mut TxContext
) {
    // Load verification key for the circuit
    let vk = load_verification_key();
    
    // Verify the ZK-proof on-chain
    let is_valid = bls12381::verify_groth16_proof(
        &proof,
        &public_inputs,
        &vk
    );
    
    assert!(is_valid, 100); // Invalid proof
    
    // Extract uptime from public inputs
    let uptime_percentage = *vector::borrow(&public_inputs, 0);
    
    // Update MM's score
    vec_map::insert(
        &mut pool.martyr_uptime_score,
        mm_address,
        uptime_percentage
    );
    
    // If compliance passed, no penalty
    // If failed, slash their DEEP stake
    let compliance_passed = *vector::borrow(&public_inputs, 1);
    
    if (compliance_passed == 0) {
        // Slash 50% of stake
        slash_martyr_stake(pool, mm_address, 5000);  // 50%
    };
}
```

### 3. Crisis-Aware Order Routing

**Smart Order Router** that prioritizes Martyr MMs during crisis:

```move
module lex_justicia::moral_router {
    /// Route order with moral preferences
    public fun route_order<BaseAsset, QuoteAsset>(
        moral_pool: &MoralPool<BaseAsset, QuoteAsset>,
        deepbook_pool: &mut Pool<BaseAsset, QuoteAsset>,
        is_bid: bool,
        quantity: u64,
        price: u64,
        ctx: &mut TxContext
    ): u64 {
        let mm_address = tx_context::sender(ctx);
        
        // Check if in crisis mode
        if (moral_pool.in_crisis) {
            // Priority routing: Martyrs first
            if (vec_map::contains(&moral_pool.martyrs, &mm_address)) {
                return route_to_martyr(
                    deepbook_pool,
                    mm_address,
                    is_bid,
                    quantity,
                    price,
                    ctx
                )
            }
            // Then Citizens (with lottery)
            else if (vec_map::contains(&moral_pool.citizens, &mm_address)) {
                return route_to_citizen_lottery(
                    deepbook_pool,
                    &moral_pool.citizens,
                    is_bid,
                    quantity,
                    price,
                    ctx
                )
            }
            // Sovereigns last
            else {
                return route_to_sovereign(
                    deepbook_pool,
                    is_bid,
                    quantity,
                    price,
                    ctx
                )
            };
        }
        // Normal mode: standard routing
        else {
            return clob::place_market_order(
                deepbook_pool,
                is_bid,
                quantity,
                ctx
            )
        };
    }
}
```

---

## Demo Scenario: Flash Crash Comparison

### Setup
Two parallel DeepBook pools trading SUI/USDC:
- **Pool A:** Standard DeepBook (no moral framework)
- **Pool B:** LEX-JUSTICIA Moral Pool

Both start with:
- 10 market makers
- $1M total liquidity
- 10 bps average spread
- 1000 active traders

### T+0: Normal Market Conditions

**Both pools:** Tight spreads, deep liquidity, fast execution

### T+1: Flash Crash (-35% in 60 seconds)

**Pool A (Standard DeepBook):**
```
⏱️ 0s: SUI drops from $4.00 → $2.60
⏱️ 5s: 8/10 MMs pull all liquidity
⏱️ 10s: Remaining 2 MMs widen spreads to 500 bps
⏱️ 15s: Traders face 15-20% slippage
⏱️ 20s: Panic selling intensifies
⏱️ 30s: Market effectively frozen

Result:
❌ Liquidity vanished when needed most
❌ Retail traders liquidated at terrible prices
❌ No accountability for MMs
❌ Trust in protocol destroyed
```

**Pool B (LEX-JUSTICIA):**
```
⏱️ 0s: SUI drops from $4.00 → $2.60
⏱️ 1s: Crisis mode AUTO-ACTIVATED
⏱️ 2s: Martyr MMs' liquidity LOCKED (can't withdraw)
⏱️ 3s: Spread limits ENFORCED (max 40 bps)
⏱️ 5s: Smart router PRIORITIZES Martyr liquidity
⏱️ 10s: 4/10 MMs (Martyrs) maintain tight markets
⏱️ 15s: Traders get 2-3% slippage (not 15-20%)
⏱️ 20s: ZK-proof generation starts
⏱️ 30s: Market stabilizes with liquidity intact

Result:
✅ Martyrs kept commitments (verified by ZK-proof)
✅ Traders protected by categorical guarantees  
✅ Violators identified and slashed
✅ Trust maintained, protocol strengthened
```

### Visual Comparison Dashboard

```
┌────────────────────────────────────────────────────────────┐
│                    Crisis Performance                       │
├──────────────────────┬─────────────────┬───────────────────┤
│ Metric               │ Standard Pool   │ Moral Pool        │
├──────────────────────┼─────────────────┼───────────────────┤
│ Liquidity Remaining  │ 15%             │ 85%               │
│ Average Spread       │ 500 bps         │ 38 bps            │
│ Trader Slippage      │ 18.3%           │ 2.7%              │
│ MM Accountability    │ ❌ None         │ ✅ ZK-Verified    │
│ Crisis Duration      │ 8 minutes       │ 2 minutes         │
│ Trust Score (post)   │ 23/100          │ 87/100            │
└──────────────────────┴─────────────────┴───────────────────┘
```

---

## Why This Wins the Hackathon

### 1. **Perfect Fit for "Decentralized Market-Making" Track**
- Directly extends DeepBook with novel MM incentive structures
- Uses SUI's object model for MM tier enforcement
- Leverages SUI's speed for real-time crisis detection

### 2. **Technical Innovation**
- **ZK-Proofs for Behavioral Verification:** First protocol to cryptographically prove MM kept commitments
- **Crisis-Aware Routing:** Smart order router that changes behavior during volatility
- **Programmable Moral Tiers:** MMs choose their ethics vs. profit tradeoff explicitly

### 3. **Philosophical Depth**
- Solves the "free rider problem" in liquidity provision
- Turns the trolley problem into a social contract
- Creates "categorical imperatives" for market makers

### 4. **Real Market Need**
- Every major DeFi protocol suffers from liquidity withdrawal during crashes
- Current solutions: none (just hope MMs are altruistic)
- LEX-JUSTICIA: cryptographically enforced commitments

### 5. **Composability**
- Any DeepBook pool can add moral layer
- Other protocols can integrate the moral router
- ZK-proof framework reusable for other commitment verification

### 6. **Demonstrates SUI's Advantages**
- **Sub-second finality:** Crisis detection + enforcement in real-time
- **Parallel execution:** Process 10,000 MM orders simultaneously
- **Object ownership:** Tier capabilities as owned objects
- **Move safety:** Formal verification of tier enforcement logic

---

## Implementation Roadmap

### Week 1: Core Smart Contracts
- [ ] Fork deepbook-amm starter project
- [ ] Implement `moral_pool.move` with tier registry
- [ ] Build crisis detection logic
- [ ] Create MM registration functions
- [ ] Write unit tests

### Week 2: ZK-Proof System
- [ ] Design Circom circuit for compliance verification
- [ ] Implement witness generator (reads DeepBook events)
- [ ] Create Move verifier contract
- [ ] Test proof generation/verification pipeline
- [ ] Store proofs on Walrus

### Week 3: Smart Router + Frontend
- [ ] Build moral router with priority logic
- [ ] Create Next.js dashboard
- [ ] Integrate SUI Wallet Kit
- [ ] Real-time crisis visualization
- [ ] MM compliance leaderboard

### Week 4: Demo + Polish
- [ ] Deploy to SUI testnet
- [ ] Simulate flash crash scenario
- [ ] Record comparison video
- [ ] Write documentation
- [ ] Prepare pitch deck

---

## Technical Stack

**Blockchain:**
- SUI Network (testnet/mainnet)
- Move language
- DeepBook V3 CLOB

**ZK-Proofs:**
- Circom 2.0
- Groth16 or Plonky2
- Walrus storage for proofs

**Frontend:**
- Next.js + TypeScript
- SUI TypeScript SDK
- SUI Wallet Kit
- GraphQL (SUI indexer)

**Data:**
- Real-time DeepBook event streaming
- Historical order book snapshots
- MM performance analytics

---

## Conclusion: Market-Making with Morality

**The Core Insight:** 

Market makers currently have NO skin in the game during crises. They can pull liquidity with zero consequences. LEX-JUSTICIA changes this by creating **verifiable, consensual commitments** that are cryptographically enforced.

**The Innovation:**

Using ZK-proofs to verify MM behavior WITHOUT revealing their proprietary strategies. They prove "I kept my spreads tight" without showing "here are my exact orders."

**The Impact:**

A DeFi ecosystem where:
- Traders know which MMs will stay liquid during crashes
- MMs are rewarded for taking on crisis risk
- Violators are automatically identified and slashed
- Trust is built through cryptographic proof, not promises

**In one sentence:** 

*LEX-JUSTICIA transforms market-making from "every MM for themselves" into "a social contract with categorical fairness guarantees, verified by zero-knowledge proofs."*

---

*"In markets we trade, but with dignity. In crisis we adapt, but with consent. In code we enforce, but with justice."*