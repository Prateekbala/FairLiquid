"use strict";
/**
 * LEX-JUSTICIA: Myersonian Framework Implementation
 *
 * Implements optimal auction theory from Milionis et al. (2023)
 * for deriving MM tier commitments and performance scoring.
 *
 * Key Functions:
 * - Virtual value calculation (Eqs. 5-6)
 * - Optimal allocation rule (Theorem 3.2)
 * - No-trade gap boundaries (Corollary 3.3)
 * - IC reward design (Corollary 2.2)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.empiricalCDF = empiricalCDF;
exports.estimatePDF = estimatePDF;
exports.hazardRate = hazardRate;
exports.upperVirtualValue = upperVirtualValue;
exports.lowerVirtualValue = lowerVirtualValue;
exports.findUpperVirtualRoot = findUpperVirtualRoot;
exports.findLowerVirtualRoot = findLowerVirtualRoot;
exports.computeOptimalTierBoundaries = computeOptimalTierBoundaries;
exports.allocateOptimalTier = allocateOptimalTier;
exports.calculateICReward = calculateICReward;
exports.calculateMarginalICReward = calculateMarginalICReward;
exports.calculateOptimalCrisisSpread = calculateOptimalCrisisSpread;
exports.applySpreadConstraint = applySpreadConstraint;
exports.calculateSlashingAmount = calculateSlashingAmount;
exports.updateMMCredibility = updateMMCredibility;
exports.buildDistribution = buildDistribution;
exports.demonstrateMyersonianFramework = demonstrateMyersonianFramework;
// ============================================================================
// EMPIRICAL DISTRIBUTION ESTIMATION
// ============================================================================
/**
 * Estimate empirical CDF at a given point
 * F(s) = P(Score ≤ s)
 */
function empiricalCDF(historicalScores, point) {
    const count = historicalScores.filter((x) => x <= point).length;
    return count / (historicalScores.length || 1);
}
/**
 * Estimate empirical PDF using kernel density estimation
 * Uses Gaussian kernel with bandwidth from Scott's rule
 */
function estimatePDF(historicalScores, point, kernelBandwidth) {
    if (historicalScores.length === 0)
        return 0.001; // Epsilon default
    // Scott's bandwidth rule: h = n^(-1/5) * σ
    const n = historicalScores.length;
    const stddev = computeStddev(historicalScores);
    const h = kernelBandwidth || Math.pow(n, -0.2) * stddev + 0.001; // Add epsilon
    // Gaussian kernel density estimator
    let density = 0;
    for (const score of historicalScores) {
        const diff = point - score;
        const kernelValue = Math.exp(-0.5 * Math.pow(diff / h, 2));
        density += kernelValue / (h * Math.sqrt(2 * Math.PI));
    }
    return density / n;
}
/**
 * Compute empirical hazard rate h(s) = f(s) / (1 - F(s))
 * High hazard rate = MM more likely to have high commitment at this level
 */
function hazardRate(historicalScores, point) {
    const pdf = estimatePDF(historicalScores, point);
    const cdf = empiricalCDF(historicalScores, point);
    const survival = 1 - cdf;
    if (survival < 0.001)
        return 1000; // High hazard near max
    return pdf / survival;
}
// ============================================================================
// VIRTUAL VALUE FUNCTIONS (Equations 5-6 from Milionis et al.)
// ============================================================================
/**
 * Upper virtual value function for Martyr tier
 * φ_u(s) = s - (1-F(s))/f(s) - adverseSelection(s)
 *
 * Represents profit from allocating max amount to MMs above price s
 * Accounts for:
 * - Direct profit: s
 * - Information rent cost: (1-F(s))/f(s)
 * - Adverse selection penalty: risk of MM lying about commitment
 */
function upperVirtualValue(mmScore, distribution, adverseSelectionParam = 0.05) {
    const cdf = empiricalCDF(distribution.historicalScores, mmScore);
    const pdf = estimatePDF(distribution.historicalScores, mmScore);
    const informationRent = (1 - cdf) / (pdf + 0.0001); // Avoid division by zero
    // Adverse selection grows with deviation from mean
    const deviationFromMean = Math.abs(mmScore - distribution.mean);
    const adverseSelectionPenalty = adverseSelectionParam *
        (deviationFromMean / distribution.stddev) *
        informationRent;
    const virtualValue = mmScore - informationRent - adverseSelectionPenalty;
    return {
        rawScore: mmScore,
        informationRent,
        adverseSelectionPenalty,
        virtualValue: Math.max(0, virtualValue), // Non-negative profit
    };
}
/**
 * Lower virtual value function for crisis detection
 * φ_l(s) = adverseSelection(s) - s - F(s)/f(s)
 *
 * Represents cost of crisis to protocol
 * Used to find threshold for when to activate crisis mode
 */
function lowerVirtualValue(mmScore, distribution, crisisCostParam = 0.1) {
    const cdf = empiricalCDF(distribution.historicalScores, mmScore);
    const pdf = estimatePDF(distribution.historicalScores, mmScore);
    const informationRent = cdf / (pdf + 0.0001);
    const deviationFromMean = Math.abs(mmScore - distribution.mean);
    const crisisCost = crisisCostParam *
        (deviationFromMean / distribution.stddev) *
        informationRent;
    const virtualValue = crisisCost - mmScore - informationRent;
    return {
        rawScore: mmScore,
        informationRent,
        adverseSelectionPenalty: crisisCost,
        virtualValue,
    };
}
// ============================================================================
// OPTIMAL ALLOCATION RULE (Theorem 3.2)
// ============================================================================
/**
 * Find roots of upper virtual value function
 * p_1 = arg max φ_u(s) = 0
 *
 * This is the optimal Martyr minimum liquidity commitment
 */
function findUpperVirtualRoot(distribution, adverseSelectionParam = 0.05, tolerance = 0.1) {
    // Binary search for root where φ_u(s) = 0
    let low = distribution.min;
    let high = distribution.max;
    for (let i = 0; i < 100; i++) {
        const mid = (low + high) / 2;
        const value = upperVirtualValue(mid, distribution, adverseSelectionParam)
            .virtualValue;
        if (Math.abs(value) < tolerance)
            return mid;
        if (value > 0) {
            low = mid;
        }
        else {
            high = mid;
        }
    }
    return (low + high) / 2;
}
/**
 * Find root of lower virtual value function
 * p_2 = arg min φ_l(s) = 0
 *
 * This is the optimal Sovereign maximum score
 */
function findLowerVirtualRoot(distribution, crisisCostParam = 0.1, tolerance = 0.1) {
    // Binary search for root where φ_l(s) = 0
    let low = distribution.min;
    let high = distribution.max;
    for (let i = 0; i < 100; i++) {
        const mid = (low + high) / 2;
        const value = lowerVirtualValue(mid, distribution, crisisCostParam)
            .virtualValue;
        if (Math.abs(value) < tolerance)
            return mid;
        if (value < 0) {
            high = mid;
        }
        else {
            low = mid;
        }
    }
    return (low + high) / 2;
}
/**
 * Compute optimal tier boundaries (main result from Theorem 3.2)
 *
 * Returns:
 * - Martyr minimum = upper virtual root (L_1)
 * - Sovereign max = lower virtual root (L_2)
 * - No-trade gap = L_1 - L_2 (information asymmetry cost)
 */
function computeOptimalTierBoundaries(distribution) {
    const upperRoot = findUpperVirtualRoot(distribution);
    const lowerRoot = findLowerVirtualRoot(distribution);
    return {
        martyrMinimum: Math.max(distribution.min, upperRoot),
        sovereignMaximum: Math.min(distribution.max, lowerRoot),
        noTradeGapWidth: Math.max(0, upperRoot - lowerRoot),
        upperVirtualRoot: upperRoot,
        lowerVirtualRoot: lowerRoot,
    };
}
/**
 * Optimal MM allocation rule (Theorem 3.2)
 *
 * x*(score) = {
 *   MARTYR if score >= p_1
 *   REJECT if p_2 < score < p_1 (no-trade gap)
 *   SOVEREIGN if score <= p_2
 * }
 */
function allocateOptimalTier(mmScore, boundaries) {
    if (mmScore >= boundaries.martyrMinimum) {
        return "MARTYR";
    }
    else if (mmScore <= boundaries.sovereignMaximum) {
        return "SOVEREIGN";
    }
    else {
        return "REJECT"; // Information asymmetry cost too high
    }
}
// ============================================================================
// INCENTIVE-COMPATIBLE REWARDS (Corollary 2.2)
// ============================================================================
/**
 * Calculate cumulative IC reward
 * R(σ) = ∫_σ_min^σ φ_u(s) ds
 *
 * This is the unique IC payment rule from Myerson's theory.
 * Makes honest reporting of performance optimal for MMs.
 */
function calculateICReward(mmScore, distribution, numberOfSegments = 100) {
    if (mmScore < distribution.min)
        return 0;
    // Numerical integration using Simpson's rule
    const a = distribution.min;
    const b = Math.min(mmScore, distribution.max);
    const n = numberOfSegments;
    let sum = 0;
    const h = (b - a) / n;
    for (let i = 0; i <= n; i++) {
        const x = a + i * h;
        const y = upperVirtualValue(x, distribution).virtualValue;
        if (i === 0 || i === n) {
            sum += y;
        }
        else if (i % 2 === 1) {
            sum += 4 * y;
        }
        else {
            sum += 2 * y;
        }
    }
    return Math.max(0, (h / 3) * sum);
}
/**
 * Marginal IC reward (derivative of cumulative)
 * dR/dσ = φ_u(σ)
 *
 * Reward for improving score by small amount
 */
function calculateMarginalICReward(mmScore, distribution) {
    return upperVirtualValue(mmScore, distribution).virtualValue;
}
// ============================================================================
// CRISIS SPREAD CALCULATION
// ============================================================================
/**
 * Calculate optimal crisis spread using Myersonian decomposition
 *
 * Spread decomposes into:
 * 1. Monopoly component: s - profit from being monopolist MM
 * 2. Adverse selection: risk adjustment for information asymmetry
 *
 * Result: spread = f(volatility, information_advantage)
 */
function calculateOptimalCrisisSpread(basePrice, currentVolatility, normalVolatility, mmInformationAdvantage, // λ ∈ [0,1]
mmRiskAversion, // 0.5 (Martyr) to 2.0 (Sovereign)
adverseSelectionParam = 0.05) {
    if (normalVolatility === 0)
        normalVolatility = 0.01; // Avoid division by zero
    const volatilityMultiplier = currentVolatility / normalVolatility;
    // Monopoly component: profit from information advantage
    // Based on optimal auction formula from Section 4
    const monopolyComponent = 2 *
        Math.sqrt(currentVolatility) *
        Math.sqrt(2 / Math.PI) *
        Math.sqrt(Math.max(0, -Math.log(1 - mmInformationAdvantage + 0.001)));
    // Adverse selection component: cost of uncertainty
    // Higher when MM doesn't have information advantage
    const adverseSelectionComponent = volatilityMultiplier *
        adverseSelectionParam *
        (1 - mmInformationAdvantage) *
        mmRiskAversion;
    // Total spread in dollar terms
    const totalSpreadDollars = (monopolyComponent + adverseSelectionComponent) * Math.sqrt(basePrice);
    // Convert to basis points
    const totalSpreadBPS = (totalSpreadDollars / basePrice) * 10000;
    return {
        baseSpread: 10, // Assume 10 bps normal spread
        monopolyComponent: (monopolyComponent * 10000) / basePrice,
        adverseSelectionComponent: (adverseSelectionComponent * 10000) / basePrice,
        totalSpread: totalSpreadBPS,
        volatilityMultiplier,
    };
}
/**
 * Apply tier-specific spread constraints
 * Martyr: cap at 40 bps
 * Citizen: cap at 100 bps
 * Sovereign: no cap
 */
function applySpreadConstraint(spread, tier) {
    const constraints = {
        MARTYR: 40, // bps
        CITIZEN: 100, // bps
        SOVEREIGN: Infinity, // no cap
    };
    return Math.min(spread, constraints[tier]);
}
// ============================================================================
// SLASHING FORMULA
// ============================================================================
/**
 * Calculate slashing amount for violated commitments
 * Slash = virtual value of the lie (not entire stake)
 *
 * Formula: slash = φ_u(claimed) - φ_u(actual)
 *
 * Intuition: MM extracted virtual value equal to the difference
 * We recover that extracted value as slashing.
 */
function calculateSlashingAmount(claimedScore, actualScore, distribution, maxSlashPercentage = 0.5 // Max 50% of stake
) {
    const claimedVirtualValue = upperVirtualValue(claimedScore, distribution).virtualValue;
    const actualVirtualValue = upperVirtualValue(actualScore, distribution).virtualValue;
    const overclaimedValue = Math.max(0, claimedVirtualValue - actualVirtualValue);
    // Cap at percentage of stake (safety valve)
    // In Move contract, we'd multiply by actual stake amount
    const cappedSlash = Math.min(overclaimedValue, maxSlashPercentage);
    let justification = "";
    if (overclaimedValue <= 0) {
        justification = "MM was conservative/honest, no slashing";
    }
    else {
        justification = `Overclaimed virtual value: ${overclaimedValue.toFixed(2)}, slashing ${cappedSlash.toFixed(2)}`;
    }
    return {
        slashAmount: cappedSlash,
        justification,
    };
}
// ============================================================================
// BELIEF UPDATE RULE (Bayesian)
// ============================================================================
/**
 * Update MM credibility based on ZK-proof verification
 * Implements Bayesian update: π(p_0, p_hat)
 *
 * New belief = λ * proof_outcome + (1 - λ) * prior_belief
 * λ ≈ 0.7 means we weight proof at 70% and prior at 30%
 */
function updateMMCredibility(priorBelief, proofOutcome, beliefUpdateWeight = 0.7 // λ
) {
    return (beliefUpdateWeight * proofOutcome +
        (1 - beliefUpdateWeight) * priorBelief);
}
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Compute mean of array
 */
function computeMean(data) {
    return data.reduce((a, b) => a + b, 0) / data.length;
}
/**
 * Compute standard deviation
 */
function computeStddev(data) {
    const mean = computeMean(data);
    const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
}
/**
 * Build performance distribution from historical data
 */
function buildDistribution(historicalScores) {
    return {
        historicalScores,
        mean: computeMean(historicalScores),
        stddev: computeStddev(historicalScores),
        min: Math.min(...historicalScores),
        max: Math.max(...historicalScores),
    };
}
// ============================================================================
// EXAMPLE USAGE
// ============================================================================
function demonstrateMyersonianFramework() {
    // Hypothetical historical MM uptime data (0-100)
    const historicalUptimes = [
        85, 90, 88, 92, 78, 95, 87, 91, 89, 93, 80, 96, 88, 92, 85, 94,
    ];
    const distribution = buildDistribution(historicalUptimes);
    // Compute optimal tier boundaries
    const boundaries = computeOptimalTierBoundaries(distribution);
    console.log("\n=== MYERSONIAN FRAMEWORK RESULTS ===");
    console.log(`Martyr Minimum (p_1): ${boundaries.martyrMinimum.toFixed(2)}%`);
    console.log(`Sovereign Maximum (p_2): ${boundaries.sovereignMaximum.toFixed(2)}%`);
    console.log(`No-Trade Gap: ${boundaries.noTradeGapWidth.toFixed(2)}%`);
    // Test tier allocation
    console.log("\n=== TIER ALLOCATION ===");
    const testScores = [75, 85, 89, 95];
    for (const score of testScores) {
        const tier = allocateOptimalTier(score, boundaries);
        const reward = calculateICReward(score, distribution);
        console.log(`Score ${score}% -> Tier: ${tier}, IC Reward: ${reward.toFixed(2)}`);
    }
    // Crisis spread calculation
    console.log("\n=== CRISIS SPREAD ===");
    const spreadMartyr = calculateOptimalCrisisSpread(4.0, // $4 base price
    0.3, // 30% realized vol in crisis
    0.15, // 15% normal vol
    0.7, // 70% info advantage
    0.5 // Martyr risk aversion
    );
    console.log(`Martyr Crisis Spread: ${spreadMartyr.totalSpread.toFixed(2)} bps`);
    const spreadSovereign = calculateOptimalCrisisSpread(4.0, 0.3, 0.15, 0.4, // Lower info advantage
    2.0 // Sovereign risk aversion
    );
    console.log(`Sovereign Crisis Spread: ${spreadSovereign.totalSpread.toFixed(2)} bps`);
}
