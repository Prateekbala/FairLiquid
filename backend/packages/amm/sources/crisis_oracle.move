// LEX-JUSTICIA: Ethical Market-Making on DeepBook
// Crisis Detection Oracle - Real-time market stress monitoring

module deepbookamm::crisis_oracle;

use sui::clock::{Self, Clock};
use std::vector;

/// Crisis detection result
public struct CrisisDetectionResult has copy, drop {
    is_crisis: bool,
    trigger_type: u8,  // 0: None, 1: Volatility, 2: Liquidity, 3: Spread
    volatility_bps: u64,
    liquidity_remaining_bps: u64,
    avg_spread_bps: u64,
    timestamp: u64,
}

/// Detect market crisis based on multiple signals
/// Returns CrisisDetectionResult with all metrics
public fun detect_crisis(
    previous_price: u64,
    current_price: u64,
    liquidity_before: u64,
    liquidity_current: u64,
    current_spread_bps: u64,
    clock: &Clock,
): CrisisDetectionResult {
    let volatility_bps = calculate_volatility(previous_price, current_price);
    
    // Calculate liquidity remaining percentage (in bps, 10000 = 100%)
    let liquidity_remaining_bps = if (liquidity_before > 0) {
        (liquidity_current * 10000) / liquidity_before
    } else {
        10000
    };
    
    let mut is_crisis = false;
    let mut trigger_type = 0u8;
    
    // Trigger 1: Volatility > 3000 bps (30%)
    if (volatility_bps > 3000) {
        is_crisis = true;
        trigger_type = 1;
    };
    
    // Trigger 2: Liquidity drain > 40% (remaining < 6000 bps)
    if (liquidity_remaining_bps < 6000) {
        is_crisis = true;
        if (trigger_type == 0) {
            trigger_type = 2;
        };
    };
    
    // Trigger 3: Spread widening > 1000 bps (10x normal)
    if (current_spread_bps > 1000) {
        is_crisis = true;
        if (trigger_type == 0) {
            trigger_type = 3;
        };
    };
    
    CrisisDetectionResult {
        is_crisis,
        trigger_type,
        volatility_bps,
        liquidity_remaining_bps,
        avg_spread_bps: current_spread_bps,
        timestamp: clock::timestamp_ms(clock),
    }
}

/// Calculate price volatility between two prices
/// Returns percentage change in basis points
public fun calculate_volatility(
    previous_price: u64,
    current_price: u64,
): u64 {
    if (previous_price == 0) {
        return 0
    };
    
    let price_diff = if (current_price > previous_price) {
        current_price - previous_price
    } else {
        previous_price - current_price
    };
    
    // Return percentage change in bps (1% = 100 bps)
    (price_diff * 10000) / previous_price
}

/// Calculate average spread from a list of spreads
public fun calculate_avg_spread(spreads: vector<u64>): u64 {
    let len = vector::length(&spreads);
    if (len == 0) {
        return 0
    };
    
    let mut sum = 0u64;
    let mut i = 0;
    
    while (i < len) {
        sum = sum + *vector::borrow(&spreads, i);
        i = i + 1;
    };
    
    sum / len
}

/// Check if market has stabilized after crisis
public fun check_stabilization(
    current_volatility_bps: u64,
    current_liquidity_bps: u64,
    current_spread_bps: u64,
): bool {
    // Market is stable if:
    // - Volatility < 2000 bps (20%)
    // - Liquidity > 7000 bps (70% of normal)
    // - Spreads < 500 bps (5x normal)
    current_volatility_bps < 2000 &&
    current_liquidity_bps > 7000 &&
    current_spread_bps < 500
}

/// Check if liquidity has drained significantly
pub fun check_liquidity_drain(
    _previous_liquidity: u64,
    _current_liquidity: u64,
): bool {
    // TODO: Check if liquidity dropped > 40%
    false
}

/// Measure average spread from order book
pub fun measure_avg_spread<BaseAsset, QuoteAsset>(
    _pool: &Pool<BaseAsset, QuoteAsset>,
): u64 {
    // TODO: Read bid-ask spread from pool's order book
    // Return in basis points
    0
}
