"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    // RPC Configuration
    rpcUrl: process.env.RPC_URL || "https://fullnode.mainnet.sui.io",
    // Contract IDs
    lexJusticiaCorePackageId: process.env.LEX_JUSTICIA_CORE_PACKAGE_ID,
    deepbookPackageId: process.env.DEEPBOOK_PACKAGE_ID,
    // Crisis Detection Parameters
    volatilityThresholdBps: parseInt(process.env.VOLATILITY_THRESHOLD_BPS || "3000"), // 30% = 3000 bps
    crisisDetectionIntervalMs: parseInt(process.env.CRISIS_DETECTION_INTERVAL_MS || "1000"),
    // MM Tier Configuration
    martyrMinStakeDEEP: parseInt(process.env.MARTYR_MIN_STAKE_DEEP || "10000"),
    martyrMaxSpreadBps: parseInt(process.env.MARTYR_MAX_SPREAD_BPS || "40"),
    martyrMinLiquidityUSD: parseInt(process.env.MARTYR_MIN_LIQUIDITY_USD || "100000"),
    citizenMaxSpreadBps: parseInt(process.env.CITIZEN_MAX_SPREAD_BPS || "200"),
    // ZK Verification
    zkCircuitPath: process.env.ZK_CIRCUIT_PATH,
    zkVerifyingKeyPath: process.env.ZK_VERIFYING_KEY_PATH,
    // Keeper Configuration
    keeperPrivateKey: process.env.KEEPER_PRIVATE_KEY,
    keeperIntervalMs: parseInt(process.env.KEEPER_INTERVAL_MS || "5000"),
    // Network
    network: process.env.NETWORK || "mainnet", // mainnet, testnet, devnet
};
