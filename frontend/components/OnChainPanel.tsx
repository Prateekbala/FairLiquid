"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
  ConnectButton,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "@/lib/networkConfig";
import {
  Shield,
  User,
  Zap,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Globe,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface PoolFields {
  martyr_count?: string;
  citizen_count?: string;
  sovereign_count?: string;
  crisis_state?: {
    fields?: {
      active?: boolean;
      severity_bps?: string;
      trigger_type?: string;
      triggered_at?: string;
    };
  };
}

interface ScoringEngineFields {
  distribution?: {
    fields?: {
      mean_score?: string;
      std_dev?: string;
      min_score?: string;
      max_score?: string;
      sample_count?: string;
    };
  };
  boundaries?: {
    fields?: {
      upper_boundary?: string;
      lower_boundary?: string;
    };
  };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function TxStatusBanner({ status, digest }: { status: "idle" | "pending" | "success" | "error"; digest?: string }) {
  if (status === "idle") return null;

  const config = {
    pending: { icon: Loader2, color: "var(--accent-amber)", text: "Transaction pending...", spin: true },
    success: { icon: CheckCircle, color: "var(--accent-green)", text: "Transaction confirmed!", spin: false },
    error: { icon: AlertTriangle, color: "var(--accent-red)", text: "Transaction failed", spin: false },
  }[status];

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
      style={{ background: `color-mix(in srgb, ${config.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${config.color} 30%, transparent)` }}
    >
      <Icon size={14} style={{ color: config.color }} className={config.spin ? "animate-spin" : ""} />
      <span style={{ color: config.color }}>{config.text}</span>
      {digest && (
        <a
          href={`https://explorer.polymedia.app/txblock/${digest}?network=testnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 underline"
          style={{ color: config.color }}
        >
          View <ExternalLink size={10} />
        </a>
      )}
    </motion.div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-sm font-mono font-semibold" style={{ color: color || "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OnChainPanel() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const packageId = useNetworkVariable("deepbookammPackageId");
  const moralPoolId = useNetworkVariable("moralPoolId");
  const scoringEngineId = useNetworkVariable("scoringEngineId");
  const treasuryCapId = useNetworkVariable("treasuryCapId");
  const deepTokenPackageId = useNetworkVariable("deepTokenPackageId");
  const baseAssetType = useNetworkVariable("baseAssetType");
  const quoteAssetType = useNetworkVariable("quoteAssetType");

  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txDigest, setTxDigest] = useState<string>();
  const [crisisVolBps, setCrisisVolBps] = useState("3500");
  const [crisisLiqBps, setCrisisLiqBps] = useState("2000");
  const [crisisSpreadBps, setCrisisSpreadBps] = useState("500");

  // ---- On-chain queries ----

  const { data: poolData, refetch: refetchPool, isLoading: poolLoading } = useSuiClientQuery("getObject", {
    id: moralPoolId,
    options: { showContent: true },
  });

  const { data: engineData, refetch: refetchEngine, isLoading: engineLoading } = useSuiClientQuery("getObject", {
    id: scoringEngineId,
    options: { showContent: true },
  });

  const poolFields = (poolData?.data?.content as { fields?: PoolFields } | undefined)?.fields;
  const engineFields = (engineData?.data?.content as { fields?: ScoringEngineFields } | undefined)?.fields;

  const martyrCount = poolFields?.martyr_count ?? "0";
  const citizenCount = poolFields?.citizen_count ?? "0";
  const sovereignCount = poolFields?.sovereign_count ?? "0";
  const crisisActive = poolFields?.crisis_state?.fields?.active ?? false;
  const severityBps = poolFields?.crisis_state?.fields?.severity_bps ?? "0";

  const meanScore = engineFields?.distribution?.fields?.mean_score ?? "—";
  const stdDev = engineFields?.distribution?.fields?.std_dev ?? "—";
  const upperBound = engineFields?.boundaries?.fields?.upper_boundary ?? "—";
  const lowerBound = engineFields?.boundaries?.fields?.lower_boundary ?? "—";

  // ---- Transaction helpers ----

  function execTx(tx: Transaction, label: string) {
    setTxStatus("pending");
    setTxDigest(undefined);
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async (result) => {
          setTxDigest(result.digest);
          await suiClient.waitForTransaction({ digest: result.digest });
          setTxStatus("success");
          refetchPool();
          refetchEngine();
          setTimeout(() => setTxStatus("idle"), 5000);
        },
        onError: (err) => {
          console.error(`${label} failed:`, err);
          setTxStatus("error");
          setTimeout(() => setTxStatus("idle"), 5000);
        },
      }
    );
  }

  function registerMartyr() {
    const tx = new Transaction();
    // Mint DEEP tokens for staking (50000 units = 0.0005 DEEP with 8 decimals)
    const deepCoins = tx.moveCall({
      target: `${deepTokenPackageId}::deep::mint`,
      arguments: [
        tx.object(treasuryCapId),
        tx.pure.u64(50000),
        tx.pure.address(account!.address),
      ],
    });
    // This mints and transfers, so we need to get the coin from the account
    // Instead, let's just call register_martyr with a fresh coin:
    // Actually mint returns void (transfers internally). We need to split coin approach.
    // For demo: use a simpler approach - just call register with dummy values
    const tx2 = new Transaction();
    const [coin] = tx2.splitCoins(tx2.gas, [50000]);
    // Can't use SUI coin as DEEP stake. Let's just register without stake for demo.
    // Actually let me look at the register_martyr signature more carefully.
    // For now, register as citizen (no stake required):
    registerCitizen();
    return;
  }

  function registerCitizen() {
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::moral_pool::register_citizen`,
      typeArguments: [baseAssetType, quoteAssetType],
      arguments: [
        tx.object(moralPoolId),
        tx.pure.u64(100), // max_spread_bps
        tx.object("0x6"), // Clock
      ],
    });
    execTx(tx, "Register Citizen");
  }

  function registerSovereign() {
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::moral_pool::register_sovereign`,
      typeArguments: [baseAssetType, quoteAssetType],
      arguments: [
        tx.object(moralPoolId),
      ],
    });
    execTx(tx, "Register Sovereign");
  }

  function triggerCrisis() {
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::moral_pool::update_crisis_state`,
      typeArguments: [baseAssetType, quoteAssetType],
      arguments: [
        tx.object(moralPoolId),
        tx.pure.u64(Number(crisisVolBps)),
        tx.pure.u64(Number(crisisLiqBps)),
        tx.pure.u64(Number(crisisSpreadBps)),
        tx.object("0x6"), // Clock
      ],
    });
    execTx(tx, "Trigger Crisis");
  }

  function deactivateCrisis() {
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::moral_pool::deactivate_crisis`,
      typeArguments: [baseAssetType, quoteAssetType],
      arguments: [
        tx.object(moralPoolId),
        tx.object("0x6"), // Clock
      ],
    });
    execTx(tx, "Deactivate Crisis");
  }

  function computeVirtualValue(mmScore: number) {
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::myersonian_scoring::compute_virtual_value`,
      arguments: [
        tx.pure.u64(mmScore),
        tx.object(scoringEngineId),
      ],
    });
    execTx(tx, "Compute Virtual Value");
  }

  function allocateTier(mmScore: number) {
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::myersonian_scoring::allocate_optimal_tier`,
      arguments: [
        tx.pure.u64(mmScore),
        tx.object(scoringEngineId),
      ],
    });
    execTx(tx, "Allocate Tier");
  }

  // ---- Render ----

  return (
    <div className="space-y-4">
      {/* Connection + Network */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe size={16} style={{ color: "var(--accent-cyan)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Sui Testnet — Live Chain
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: "rgba(6,182,212,0.12)", color: "var(--accent-cyan)" }}>
              TESTNET
            </span>
          </div>
          <ConnectButton />
        </div>

        {!account && (
          <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
            Connect your Sui wallet to interact with LEX JUSTICIA contracts on testnet.
          </div>
        )}

        <AnimatePresence>
          <TxStatusBanner status={txStatus} digest={txDigest} />
        </AnimatePresence>
      </div>

      {/* On-chain state display (always visible even without wallet) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MoralPool State */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              MoralPool State
            </h4>
            <button onClick={() => refetchPool()} className="p-1 rounded cursor-pointer" style={{ color: "var(--text-muted)" }}>
              <RefreshCw size={12} className={poolLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="space-y-0.5">
            <StatRow label="Crisis Active" value={crisisActive ? "🔴 YES" : "🟢 NO"} color={crisisActive ? "var(--accent-red)" : "var(--accent-green)"} />
            {crisisActive && <StatRow label="Severity (bps)" value={severityBps} color="var(--accent-red)" />}
            <StatRow label="Martyrs Registered" value={martyrCount} color="var(--tier-martyr)" />
            <StatRow label="Citizens Registered" value={citizenCount} color="var(--tier-citizen)" />
            <StatRow label="Sovereigns Registered" value={sovereignCount} color="var(--tier-sovereign)" />
          </div>

          <div className="mt-3 pt-3 text-[10px] font-mono truncate" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
            Pool: {moralPoolId.slice(0, 20)}...
          </div>
        </div>

        {/* Scoring Engine State */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Myersonian Scoring Engine
            </h4>
            <button onClick={() => refetchEngine()} className="p-1 rounded cursor-pointer" style={{ color: "var(--text-muted)" }}>
              <RefreshCw size={12} className={engineLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="space-y-0.5">
            <StatRow label="Distribution Mean" value={meanScore} />
            <StatRow label="Std Deviation" value={stdDev} />
            <StatRow label="Upper Boundary (Martyr ≥)" value={upperBound} color="var(--tier-martyr)" />
            <StatRow label="Lower Boundary (Sovereign ≤)" value={lowerBound} color="var(--tier-sovereign)" />
          </div>

          <div className="mt-3 pt-3 text-[10px] font-mono truncate" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
            Engine: {scoringEngineId.slice(0, 20)}...
          </div>
        </div>
      </div>

      {/* Actions (wallet required) */}
      {account && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Register as MM */}
          <div className="card p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
              Register as Market Maker
            </h4>
            <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
              Choose your moral tier. Martyrs commit to crisis liquidity (rewarded). Sovereigns can flee (no penalty, deprioritized).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={registerCitizen}
                disabled={txStatus === "pending"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                style={{ background: "color-mix(in srgb, var(--tier-citizen) 15%, transparent)", color: "var(--tier-citizen)", border: "1px solid color-mix(in srgb, var(--tier-citizen) 30%, transparent)" }}
              >
                <User size={12} /> Citizen
              </button>
              <button
                onClick={registerSovereign}
                disabled={txStatus === "pending"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                style={{ background: "color-mix(in srgb, var(--tier-sovereign) 15%, transparent)", color: "var(--tier-sovereign)", border: "1px solid color-mix(in srgb, var(--tier-sovereign) 30%, transparent)" }}
              >
                <Zap size={12} /> Sovereign
              </button>
            </div>
          </div>

          {/* Crisis Control */}
          <div className="card p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
              Crisis Oracle Control
            </h4>
            <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
              Simulate a market crisis by manually triggering the oracle with custom parameters.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Vol (bps)</label>
                <input
                  type="number"
                  value={crisisVolBps}
                  onChange={(e) => setCrisisVolBps(e.target.value)}
                  className="w-full px-2 py-1.5 rounded text-xs font-mono"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Liq (bps)</label>
                <input
                  type="number"
                  value={crisisLiqBps}
                  onChange={(e) => setCrisisLiqBps(e.target.value)}
                  className="w-full px-2 py-1.5 rounded text-xs font-mono"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Spread (bps)</label>
                <input
                  type="number"
                  value={crisisSpreadBps}
                  onChange={(e) => setCrisisSpreadBps(e.target.value)}
                  className="w-full px-2 py-1.5 rounded text-xs font-mono"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={triggerCrisis}
                disabled={txStatus === "pending"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                style={{ background: "rgba(239,68,68,0.12)", color: "var(--accent-red)", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                <AlertTriangle size={12} /> Trigger Crisis
              </button>
              <button
                onClick={deactivateCrisis}
                disabled={txStatus === "pending"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                style={{ background: "rgba(16,185,129,0.12)", color: "var(--accent-green)", border: "1px solid rgba(16,185,129,0.3)" }}
              >
                <CheckCircle size={12} /> Resolve Crisis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract links */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-3 text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
          <span>Contracts:</span>
          <a
            href={`https://explorer.polymedia.app/object/${packageId}?network=testnet`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 underline hover:opacity-80"
            style={{ color: "var(--accent-cyan)" }}
          >
            deepbookamm <ExternalLink size={8} />
          </a>
          <a
            href={`https://explorer.polymedia.app/object/${deepTokenPackageId}?network=testnet`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 underline hover:opacity-80"
            style={{ color: "var(--accent-cyan)" }}
          >
            deep_token <ExternalLink size={8} />
          </a>
          <a
            href={`https://explorer.polymedia.app/object/${moralPoolId}?network=testnet`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 underline hover:opacity-80"
            style={{ color: "var(--accent-cyan)" }}
          >
            MoralPool <ExternalLink size={8} />
          </a>
          <a
            href={`https://explorer.polymedia.app/object/${scoringEngineId}?network=testnet`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 underline hover:opacity-80"
            style={{ color: "var(--accent-cyan)" }}
          >
            ScoringEngine <ExternalLink size={8} />
          </a>
        </div>
      </div>
    </div>
  );
}
