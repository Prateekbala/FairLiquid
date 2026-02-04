"use strict";
// LEX-JUSTICIA Core Types
// Ethical Market-Making with Categorical Fairness Guarantees
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainnetPools = exports.MMTier = void 0;
// === Market Maker Tiers ===
var MMTier;
(function (MMTier) {
    MMTier["MARTYR"] = "MARTYR";
    MMTier["CITIZEN"] = "CITIZEN";
    MMTier["SOVEREIGN"] = "SOVEREIGN"; // Opportunistic provider
})(MMTier || (exports.MMTier = MMTier = {}));
exports.mainnetPools = {
    DEEP_SUI: {
        address: "0xb663828d6217467c8a1838a03793da896cbe745b150ebd57d82f814ca579fc22",
        baseCoin: "DEEP",
        quoteCoin: "SUI",
    },
    SUI_USDC: {
        address: "0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407",
        baseCoin: "SUI",
        quoteCoin: "USDC",
    },
};
