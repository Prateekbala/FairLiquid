import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable } = createNetworkConfig({
  testnet: {
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
    variables: {
      // Package IDs
      deepTokenPackageId:
        "0x49f0854fe48729a80b7fb5b190216babb61e18bedf8fbc58f1f6acae5fdb7bd5",
      deepbookammPackageId:
        "0x99aff556148b6da9c15620554ad6290d5e2ba398aa43a51778e075b91580fec6",

      // Shared Object IDs
      scoringEngineId:
        "0x73231afad4133b18746eee1fc0707d3c12579466afa4382ba1893dd3d371f7dc",
      moralPoolId:
        "0x8644c47a75979c8886d8f8b9dc2a3cb200afb1e34281bc369bf2714734fbc885",

      // Treasury Cap (owned by deployer)
      treasuryCapId:
        "0x7072215936d01f7f54487c02b3d0e8bbe6a9f399cc38ed9a89408bebdec90df8",

      // Type strings
      baseAssetType: "0x2::sui::SUI",
      quoteAssetType:
        "0x49f0854fe48729a80b7fb5b190216babb61e18bedf8fbc58f1f6acae5fdb7bd5::deep::DEEP",
    },
  },
});

export { networkConfig, useNetworkVariable };
