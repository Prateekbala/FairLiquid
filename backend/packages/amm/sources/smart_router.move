// LEX-JUSTICIA: Ethical Market-Making on DeepBook
// Smart Order Router - Moral-aware order routing with tier prioritization

module deepbookamm::smart_router;

use std::vector;

/// Routing decision for an order
public struct RoutingDecision has copy, drop {
    mm_address: address,
    mm_tier: u8,  // 0: Martyr, 1: Citizen, 2: Sovereign
    priority: u64,
    allocated_quantity: u64,
}

/// Route market order with moral preferences
/// During crisis: prioritizes Martyr > Citizen > Sovereign
/// Normal: fair distribution among all MM tiers
public fun route_market_order(
    order_quantity: u64,
    is_crisis: bool,
    mm_addresses: vector<address>,
    mm_tiers: vector<u8>,
): vector<RoutingDecision> {
    let mut decisions = vector::empty<RoutingDecision>();
    let mm_count = vector::length(&mm_addresses);
    
    if (mm_count == 0) {
        return decisions
    };
    
    if (is_crisis) {
        // Crisis routing: prioritize by tier
        decisions = route_crisis_priority(
            order_quantity,
            mm_addresses,
            mm_tiers
        );
    } else {
        // Normal routing: fair distribution
        decisions = route_normal_fair(
            order_quantity,
            mm_addresses,
            mm_tiers
        );
    };
    
    decisions
}

/// Crisis routing: Allocate to Martyr first, then Citizen, then Sovereign
fun route_crisis_priority(
    order_quantity: u64,
    mm_addresses: vector<address>,
    mm_tiers: vector<u8>,
): vector<RoutingDecision> {
    let mut decisions = vector::empty<RoutingDecision>();
    let mm_count = vector::length(&mm_addresses);
    let mut remaining_quantity = order_quantity;
    
    // First pass: Martyr MMs (tier 0)
    let mut martyr_count = 0;
    let mut i = 0;
    while (i < mm_count) {
        if (*vector::borrow(&mm_tiers, i) == 0) {
            martyr_count = martyr_count + 1;
        };
        i = i + 1;
    };
    
    if (martyr_count > 0) {
        let quantity_per_martyr = remaining_quantity / martyr_count;
        i = 0;
        while (i < mm_count) {
            let tier = *vector::borrow(&mm_tiers, i);
            if (tier == 0) {
                let allocated = if (quantity_per_martyr > remaining_quantity) {
                    remaining_quantity
                } else {
                    quantity_per_martyr
                };
                
                vector::push_back(&mut decisions, RoutingDecision {
                    mm_address: *vector::borrow(&mm_addresses, i),
                    mm_tier: tier,
                    priority: 100,
                    allocated_quantity: allocated,
                });
                
                remaining_quantity = remaining_quantity - allocated;
            };
            i = i + 1;
        };
    };
    
    // Second pass: Citizen MMs (tier 1) if quantity remains
    if (remaining_quantity > 0) {
        let mut citizen_count = 0;
        i = 0;
        while (i < mm_count) {
            if (*vector::borrow(&mm_tiers, i) == 1) {
                citizen_count = citizen_count + 1;
            };
            i = i + 1;
        };
        
        if (citizen_count > 0) {
            let quantity_per_citizen = remaining_quantity / citizen_count;
            i = 0;
            while (i < mm_count) {
                let tier = *vector::borrow(&mm_tiers, i);
                if (tier == 1) {
                    let allocated = if (quantity_per_citizen > remaining_quantity) {
                        remaining_quantity
                    } else {
                        quantity_per_citizen
                    };
                    
                    vector::push_back(&mut decisions, RoutingDecision {
                        mm_address: *vector::borrow(&mm_addresses, i),
                        mm_tier: tier,
                        priority: 30,
                        allocated_quantity: allocated,
                    });
                    
                    remaining_quantity = remaining_quantity - allocated;
                };
                i = i + 1;
            };
        };
    };
    
    // Third pass: Sovereign MMs (tier 2) if quantity still remains
    if (remaining_quantity > 0) {
        let mut sovereign_count = 0;
        i = 0;
        while (i < mm_count) {
            if (*vector::borrow(&mm_tiers, i) == 2) {
                sovereign_count = sovereign_count + 1;
            };
            i = i + 1;
        };
        
        if (sovereign_count > 0) {
            let quantity_per_sovereign = remaining_quantity / sovereign_count;
            i = 0;
            while (i < mm_count) {
                let tier = *vector::borrow(&mm_tiers, i);
                if (tier == 2) {
                    let allocated = if (quantity_per_sovereign > remaining_quantity) {
                        remaining_quantity
                    } else {
                        quantity_per_sovereign
                    };
                    
                    vector::push_back(&mut decisions, RoutingDecision {
                        mm_address: *vector::borrow(&mm_addresses, i),
                        mm_tier: tier,
                        priority: 5,
                        allocated_quantity: allocated,
                    });
                    
                    remaining_quantity = remaining_quantity - allocated;
                };
                i = i + 1;
            };
        };
    };
    
    decisions
}

/// Normal routing: Fair distribution among all MMs
fun route_normal_fair(
    order_quantity: u64,
    mm_addresses: vector<address>,
    mm_tiers: vector<u8>,
): vector<RoutingDecision> {
    let mut decisions = vector::empty<RoutingDecision>();
    let mm_count = vector::length(&mm_addresses);
    
    if (mm_count == 0) {
        return decisions
    };
    
    let quantity_per_mm = order_quantity / mm_count;
    let mut i = 0;
    
    while (i < mm_count) {
        let tier = *vector::borrow(&mm_tiers, i);
        let priority = calculate_priority(tier, false);
        
        vector::push_back(&mut decisions, RoutingDecision {
            mm_address: *vector::borrow(&mm_addresses, i),
            mm_tier: tier,
            priority,
            allocated_quantity: quantity_per_mm,
        });
        
        i = i + 1;
    };
    
    decisions
}

/// Calculate routing priority based on tier and market condition
public fun calculate_priority(
    mm_tier: u8,
    is_crisis: bool,
): u64 {
    if (is_crisis) {
        // Crisis priorities
        if (mm_tier == 0) { 100 }  // Martyr: highest
        else if (mm_tier == 1) { 30 }  // Citizen: medium
        else { 5 }  // Sovereign: lowest
    } else {
        // Normal priorities (more balanced)
        if (mm_tier == 0) { 50 }  // Martyr: medium-high
        else if (mm_tier == 1) { 20 }  // Citizen: medium
        else { 10 }  // Sovereign: baseline
    }
}
