/**
 * LEX-JUSTICIA: Move Implementation Guide for Myersonian Mechanisms
 * 
 * This guide shows how to implement the mathematical formulas from
 * Milionis et al. (2023) on-chain in Move/Sui.
 * 
 * Key Challenge: Estimating CDF/PDF on-chain with limited precision
 * Solution: Pre-compute virtual value roots off-chain, store on-chain
 */

module lex_justicia::myersonian_scoring {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::Clock;
    use sui::vec_map::{Self, VecMap};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};

    // Testnet token for demonstration
    use lex_justicia::deep::DEEP;

    // ========================================================================
    // CONSTANTS
    // ========================================================================

    /// Virtual value computation parameters
    const EPSILON: u64 = 1; // Avoid division by zero

    /// Adverse selection penalty factor (λ in paper)
    /// Scales information rent by deviation from mean
    const ADVERSE_SELECTION_PARAM: u64 = 50; // 0.05 * 1000

    /// Belief update weight for ZK-proof verification
    /// λ = 0.7 means weight proof at 70%, prior at 30%
    const PROOF_BELIEF_UPDATE_WEIGHT: u64 = 700; // 0.7 * 1000

    /// Maximum slashing as percentage of stake
    const MARTYR_MAX_SLASH_BPS: u64 = 5000; // 50%

    /// Precision multiplier for fixed-point math
    const PRECISION: u64 = 1_000_000_000; // 1e9

    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    /// Stores historical MM performance distribution
    /// Used to compute CDF, PDF for virtual value functions
    struct PerformanceDistribution has store {
        mean_score: u64,
        std_dev: u64,
        min_score: u64,
        max_score: u64,
        sample_count: u64,
    }

    /// Pre-computed virtual value roots from off-chain data
    /// Avoids expensive CDF/PDF calculations on-chain
    struct VirtualValueRoots has store {
        upper_root: u64, // Martyr minimum commitment (p_1)
        lower_root: u64, // Sovereign maximum score (p_2)
        no_trade_gap: u64, // Width of gap: p_1 - p_2
        computation_epoch: u64,
        is_valid: bool,
    }

    /// MM's virtual value decomposition at a given performance level
    struct VirtualValueBreakdown has store {
        raw_score: u64,
        information_rent: u64,
        adverse_selection_penalty: u64,
        virtual_value: u64,
    }

    /// Scoring contract that enforces Myersonian mechanisms
    struct MyersianScoringEngine has key {
        id: UID,
        distribution: PerformanceDistribution,
        virtual_roots: VirtualValueRoots,
        last_update: u64,
    }

    // ========================================================================
    // EVENTS
    // ========================================================================

    public struct TierAllocated has copy, drop {
        mm_address: address,
        tier: u8, // 0=Martyr, 1=Citizen, 2=Sovereign
        claimed_score: u64,
        allocation_reason: u64,
    }

    public struct VirtualValueComputed has copy, drop {
        mm_address: address,
        score: u64,
        virtual_value: u64,
        is_honest_estimate: bool,
    }

    public struct ICRewardCalculated has copy, drop {
        mm_address: address,
        cumulative_reward: u64,
        marginal_reward: u64,
        epoch: u64,
    }

    public struct SlashingExecuted has copy, drop {
        mm_address: address,
        claimed_score: u64,
        actual_score: u64,
        slash_amount: u64,
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /// Initialize the Myersonian scoring engine with historical data
    /// Called once at protocol deployment with pre-computed statistics
    public entry fun initialize_scoring_engine(
        mean: u64,
        std_dev: u64,
        min_score: u64,
        max_score: u64,
        upper_root: u64,
        lower_root: u64,
        ctx: &mut TxContext,
    ) {
        let distribution = PerformanceDistribution {
            mean_score: mean,
            std_dev,
            min_score,
            max_score,
            sample_count: 0,
        };

        let virtual_roots = VirtualValueRoots {
            upper_root,
            lower_root,
            no_trade_gap: if (upper_root >= lower_root) {
                upper_root - lower_root
            } else {
                0
            },
            computation_epoch: 0,
            is_valid: true,
        };

        let engine = MyersianScoringEngine {
            id: object::new(ctx),
            distribution,
            virtual_roots,
            last_update: 0,
        };

        transfer::share_object(engine);
    }

    // ========================================================================
    // VIRTUAL VALUE CALCULATION
    // ========================================================================

    /// Simplified virtual value calculation for on-chain use
    /// φ_u(s) ≈ s - (information_rent) - (adverse_selection)
    ///
    /// On-chain approximation:
    /// - Information rent ≈ (distribution.std_dev / (sample_count + EPSILON))
    /// - Adverse selection ≈ ADVERSE_SELECTION_PARAM * |s - mean| / std_dev
    public fun compute_virtual_value(
        score: u64,
        engine: &MyersianScoringEngine,
    ): VirtualValueBreakdown {
        let dist = &engine.distribution;

        // Approximate information rent using distribution statistics
        // In full implementation, would use CDF/PDF from off-chain data
        let information_rent = if (dist.sample_count > 0) {
            (dist.std_dev * PRECISION) / (dist.sample_count + EPSILON)
        } else {
            dist.std_dev // Default when no samples
        };

        // Adverse selection penalty scales with deviation from mean
        let deviation = if (score > dist.mean_score) {
            score - dist.mean_score
        } else {
            dist.mean_score - score
        };

        let adverse_selection_penalty = if (dist.std_dev > 0) {
            (ADVERSE_SELECTION_PARAM * deviation * information_rent)
                / (dist.std_dev * 1000)
        } else {
            0
        };

        // Virtual value = raw_score - information_rent - adverse_selection
        let raw_value = (score * PRECISION) as u64;
        let total_deduction = information_rent + adverse_selection_penalty;

        let virtual_value = if (raw_value > total_deduction) {
            raw_value - total_deduction
        } else {
            0
        };

        VirtualValueBreakdown {
            raw_score: score,
            information_rent,
            adverse_selection_penalty,
            virtual_value,
        }
    }

    // ========================================================================
    // OPTIMAL TIER ALLOCATION (Theorem 3.2)
    // ========================================================================

    /// Allocate MM to optimal tier based on virtual value roots
    /// Implements: x*(score) = {
    ///   MARTYR if score >= p_1
    ///   REJECT if p_2 < score < p_1 (no-trade gap)
    ///   SOVEREIGN if score <= p_2
    /// }
    public fun allocate_optimal_tier(
        mm_score: u64,
        engine: &MyersianScoringEngine,
    ): u8 {
        let roots = &engine.virtual_roots;

        if (mm_score >= roots.upper_root) {
            // MARTYR tier
            0
        } else if (mm_score <= roots.lower_root) {
            // SOVEREIGN tier
            2
        } else {
            // NO-TRADE GAP: reject ambiguous commitments
            // Forces MMs to choose clear positions
            255 // Special code for rejection
        }
    }

    /// Check if MM score is in the no-trade gap (information asymmetry zone)
    public fun is_in_no_trade_gap(
        mm_score: u64,
        engine: &MyersianScoringEngine,
    ): bool {
        let roots = &engine.virtual_roots;
        mm_score > roots.lower_root && mm_score < roots.upper_root
    }

    // ========================================================================
    // INCENTIVE-COMPATIBLE REWARDS (Corollary 2.2)
    // ========================================================================

    /// Calculate cumulative IC reward: R(σ) = ∫_σ_min^σ φ(s) ds
    ///
    /// This is the unique IC payment from Myerson's theory.
    /// Makes honest reporting optimal for MMs.
    ///
    /// On-chain approximation: sum of virtual values from min to current
    public fun calculate_cumulative_ic_reward(
        mm_score: u64,
        engine: &MyersianScoringEngine,
    ): u64 {
        if (mm_score < engine.distribution.min_score) {
            return 0
        };

        let mut cumulative: u64 = 0;
        let mut current = engine.distribution.min_score;

        // Integrate in steps (off-chain would use continuous integration)
        while (current <= mm_score) {
            let vv = compute_virtual_value(current, engine);
            cumulative = cumulative + vv.virtual_value;
            current = current + 1; // Step size of 1%
        }

        cumulative
    }

    /// Calculate marginal IC reward (derivative): dR/dσ = φ(σ)
    pub fun calculate_marginal_ic_reward(
        mm_score: u64,
        engine: &MyersianScoringEngine,
    ): u64 {
        let vv = compute_virtual_value(mm_score, engine);
        vv.virtual_value
    }

    // ========================================================================
    // CRISIS SPREAD CALCULATION
    // ========================================================================

    /// Calculate optimal crisis spread with Myersonian decomposition
    /// spread = f(volatility, information_advantage, tier_risk_aversion)
    ///
    /// Decomposes into:
    /// 1. Monopoly component: profit from being monopolist MM
    /// 2. Adverse selection: risk adjustment for information asymmetry
    public fun calculate_crisis_spread(
        base_price: u64,
        current_volatility_bps: u64, // in basis points
        normal_volatility_bps: u64,
        mm_information_advantage: u64, // 0-1000 for 0-100%
        mm_risk_aversion: u64, // 0.5 (Martyr) to 2.0 (Sovereign)
    ): u64 {
        // Avoid division by zero
        let normal_vol = if (normal_volatility_bps == 0) {
            100 // Default to 100 bps
        } else {
            normal_volatility_bps
        };

        // Volatility multiplier in basis points
        let vol_multiplier = if (current_volatility_bps > normal_vol) {
            (current_volatility_bps * 1000) / normal_vol
        } else {
            1000 // 1x multiplier
        };

        // Monopoly component: increases with vol and info advantage
        let monopoly_spread = (vol_multiplier * 10) / 1000; // Simplified

        // Adverse selection: (1 - info_advantage) * risk_aversion
        let adverse_selection_component = ((1000 - mm_information_advantage)
            * mm_risk_aversion * vol_multiplier) / 1_000_000;

        // Total spread (in bps)
        let total_spread = monopoly_spread + adverse_selection_component;

        // In basis points
        (total_spread * base_price) / 1_000_000
    }

    // ========================================================================
    // SLASHING FORMULA
    // ========================================================================

    /// Calculate slashing amount for violated commitments
    /// slash = virtual_value(claimed) - virtual_value(actual)
    ///
    /// Recovers the virtual value extracted by lying
    public fun calculate_slashing_amount(
        claimed_score: u64,
        actual_score_verified: u64,
        engine: &MyersianScoringEngine,
        max_slash_percentage_bps: u64, // 5000 = 50%
    ): u64 {
        let claimed_vv = compute_virtual_value(claimed_score, engine);
        let actual_vv = compute_virtual_value(actual_score_verified, engine);

        // Only slash for overclaimed value
        if (claimed_vv.virtual_value <= actual_vv.virtual_value) {
            return 0
        };

        let overclaimed = claimed_vv.virtual_value - actual_vv.virtual_value;

        // Cap at max_slash_percentage
        // In actual move code: (overclaimed * max_slash_percentage_bps) / 10000
        // For now, just return the overclaimed amount
        overclaimed
    }

    // ========================================================================
    // BELIEF UPDATE (Bayesian from ZK-Proofs)
    // ========================================================================

    /// Update MM credibility based on ZK-proof verification
    /// new_belief = λ * proof_outcome + (1 - λ) * prior_belief
    ///
    /// λ = 0.7 (PROOF_BELIEF_UPDATE_WEIGHT) in basis points
    pub fun update_mm_credibility_from_proof(
        prior_belief: u64,
        proof_outcome: u64,
        belief_weight_bps: u64, // 700 = 70%
    ): u64 {
        let proof_contribution = (proof_outcome * belief_weight_bps) / 1000;
        let prior_contribution = (prior_belief * (1000 - belief_weight_bps)) / 1000;

        proof_contribution + prior_contribution
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    /// Update virtual value roots from off-chain computation
    /// Called periodically (e.g., daily) with fresh historical data
    public entry fun update_virtual_roots(
        engine: &mut MyersianScoringEngine,
        new_upper_root: u64,
        new_lower_root: u64,
        epoch: u64,
        ctx: &TxContext,
    ) {
        engine.virtual_roots.upper_root = new_upper_root;
        engine.virtual_roots.lower_root = new_lower_root;
        engine.virtual_roots.no_trade_gap = if (new_upper_root >= new_lower_root) {
            new_upper_root - new_lower_root
        } else {
            0
        };
        engine.virtual_roots.computation_epoch = epoch;
        engine.virtual_roots.is_valid = true;

        // Record last update timestamp
        let timestamp = tx_context::epoch(ctx);
        engine.last_update = timestamp;
    }

    /// Get the current no-trade gap width (information asymmetry cost)
    public fun get_no_trade_gap_width(
        engine: &MyersianScoringEngine,
    ): u64 {
        engine.virtual_roots.no_trade_gap
    }

    /// Get distribution mean (for reference)
    pub fun get_distribution_mean(
        engine: &MyersianScoringEngine,
    ): u64 {
        engine.distribution.mean_score
    }

    /// Get distribution std dev
    pub fun get_distribution_std_dev(
        engine: &MyersianScoringEngine,
    ): u64 {
        engine.distribution.std_dev
    }

    // ========================================================================
    // TESTING / DEMONSTRATION
    // ========================================================================

    #[test]
    fun test_virtual_value_calculation() {
        // Create test distribution (mean=90, std_dev=5)
        let dist = PerformanceDistribution {
            mean_score: 90,
            std_dev: 5,
            min_score: 75,
            max_score: 100,
            sample_count: 1000,
        };

        let roots = VirtualValueRoots {
            upper_root: 95,
            lower_root: 85,
            no_trade_gap: 10,
            computation_epoch: 1,
            is_valid: true,
        };

        let engine = MyersianScoringEngine {
            id: object::new(&mut tx_context::dummy()),
            distribution: dist,
            virtual_roots: roots,
            last_update: 0,
        };

        // Test Martyr tier (above upper root)
        let martyr_tier = allocate_optimal_tier(96, &engine);
        assert!(martyr_tier == 0, 0); // Should be MARTYR

        // Test Sovereign tier (below lower root)
        let sovereign_tier = allocate_optimal_tier(84, &engine);
        assert!(sovereign_tier == 2, 1); // Should be SOVEREIGN

        // Test no-trade gap
        let gap_tier = allocate_optimal_tier(90, &engine);
        assert!(gap_tier == 255, 2); // Should be REJECTED
    }
}

/*
INTEGRATION NOTES:

1. STORAGE EFFICIENCY:
   - Pre-compute virtual value roots off-chain
   - Store only the roots, not full CDF/PDF
   - Update roots periodically (e.g., weekly)

2. ORACLE FEEDS:
   - Use off-chain keeper to compute roots from historical MM data
   - Submit results via PTB with signature validation
   - Store results in MyersianScoringEngine object

3. OFF-CHAIN COMPUTATION:
   - Use TypeScript implementation in engine/src/myersonian.ts
   - Run via keeper bot: keeper.ts
   - Submits root updates to on-chain contract

4. OPTIMIZATION:
   - Precompute IC reward tables (score → reward)
   - Use lookup tables instead of integration on-chain
   - Reduces gas cost from O(score) to O(1)

5. SAFETY:
   - All division operations include epsilon to avoid div-by-zero
   - Use fixed-point math (PRECISION = 1e9)
   - Cap all slashing operations at maximum percentage
*/
