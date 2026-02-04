// LEX-JUSTICIA: Ethical Market-Making on DeepBook
// DEEP Token - Governance and Reward Token

module deep_token::deep;

use sui::coin::{Self, TreasuryCap};
use sui::url;

public struct DEEP has drop {}

/// Initialize the DEEP token
fun init(otw: DEEP, ctx: &mut TxContext) {
    let (treasury_cap, metadata) = coin::create_currency(
        otw,
        8,
        b"DEEP",
        b"DeepBook Ethical Equity Protocol",
        b"Governance and reward token for LEX-JUSTICIA moral market-making",
        option::none(),
        ctx
    );

    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury_cap, ctx.sender());
}

/// Mint new DEEP tokens (only treasury holder can call)
public fun mint(
    treasury: &mut TreasuryCap<DEEP>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    let coins = coin::mint(treasury, amount, ctx);
    transfer::public_transfer(coins, recipient);
}
