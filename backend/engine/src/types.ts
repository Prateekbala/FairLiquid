// LEX-JUSTICIA Core Types
// Ethical Market-Making with Categorical Fairness Guarantees

// === Market Maker Tiers ===

export enum MMTier {
  MARTYR = "MARTYR",      // Crisis liquidity provider
  CITIZEN = "CITIZEN",    // Fair weather provider
  SOVEREIGN = "SOVEREIGN" // Opportunistic provider
}

export interface MartyrCommitment {
  stakeAmount: bigint;
  minLiquidity: bigint;
  maxSpreadBps: number;
  minUptime: number; // percentage
}

export interface MoralMMProfile {
  address: string;
  tier: MMTier;
  commitment?: MartyrCommitment;
  registeredAt: number;
  rewardsEarned: bigint;
}

// === Crisis Detection ===

export type CrisisType = 
  | "VOLATILITY_SPIKE"
  | "LIQUIDITY_DRAIN"
  | "VOLUME_SURGE"
  | "SPREAD_WIDENING";

export interface CrisisState {
  active: boolean;
  type?: CrisisType;
  triggeredAt: number;
  volatilityBps: number;
  liquidityRemaining: bigint;
  avgSpreadBps: number;
}

export interface MarketSnapshot {
  timestamp: number;
  midPrice: bigint;
  spreadBps: number;
  volume24h: bigint;
  totalLiquidity: bigint;
  mmLiquidityByTier: Record<MMTier, bigint>;
}

// === Orders and Routing ===

export interface Order {
  id: string;
  mmAddress: string;
  mmTier: MMTier;
  side: "BID" | "ASK";
  price: bigint;
  quantity: bigint;
  timestamp: number;
  expiresAt: number;
}

export interface RoutingDecision {
  mmAddress: string;
  mmTier: MMTier;
  priority: number; // Higher = prioritized during crisis
  allocatedQuantity: bigint;
}

// === ZK Proof Verification ===

export interface ZKProof {
  proof: string;
  publicInputs: bigint[];
  circuitId: string;
}

export interface ComplianceResult {
  mmAddress: string;
  period: { from: number; to: number };
  complianceVerified: boolean;
  uptime: number;
  avgSpread: number;
  violations: string[];
  zkProof?: ZKProof;
}

// === Pool Configuration ===

export interface DeepBookPool {
  address: string;
  baseCoin: string;
  quoteCoin: string;
}

export const mainnetPools: Record<string, DeepBookPool> = {
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
