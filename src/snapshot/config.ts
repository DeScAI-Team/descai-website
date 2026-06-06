const trim = (value: string | undefined) => (typeof value === "string" ? value.trim() : "");

const snapshotBridge = __SNAPSHOT_ENV_BRIDGE__;

export type SnapshotClientConfig = {
  treasuryEth: string;
  rpcUrl: string;
  snapshotBucket: string;
  arweaveDonation: string;
  aktDonation: string;
  indexerApiBase: string;
  defillamaBaseUrl: string;
};

export const getSnapshotClientConfig = (): SnapshotClientConfig => ({
  treasuryEth:
    trim(import.meta.env.VITE_SNAPSHOT_ETH_WALLET_ADDRESS) ||
    trim(import.meta.env.VITE_ETH_WALLET_ADDRESS) ||
    snapshotBridge.treasuryEth,
  rpcUrl:
    trim(import.meta.env.VITE_SNAPSHOT_RPC) ||
    trim(import.meta.env.VITE_SNAPSHOT_BASE_RPC) ||
    trim(import.meta.env.VITE_RPC) ||
    snapshotBridge.rpcUrl,
  snapshotBucket:
    trim(import.meta.env.VITE_SNAPSHOT_BUCKET) ||
    trim(import.meta.env.VITE_SNAPSHOT_BUCKET_URL) ||
    snapshotBridge.snapshotBucket,
  arweaveDonation:
    trim(import.meta.env.VITE_SNAPSHOT_ARWEAVE_WALLET) ||
    trim(import.meta.env.VITE_ARWEAVE_WALLET_ADDRESS) ||
    snapshotBridge.arweaveDonation,
  aktDonation:
    trim(import.meta.env.VITE_SNAPSHOT_AKT_WALLET) ||
    trim(import.meta.env.VITE_AKT_WALLET_ADDRESS) ||
    snapshotBridge.aktDonation,
  indexerApiBase: trim(import.meta.env.VITE_SNAPSHOT_INDEXER_API_URL) || "https://base.blockscout.com/api",
  defillamaBaseUrl: trim(import.meta.env.VITE_DEFILLAMA_BASE_URL) || "https://coins.llama.fi"
});

export const isSnapshotConfigComplete = (config: SnapshotClientConfig) =>
  Boolean(config.treasuryEth && config.snapshotBucket && config.rpcUrl);
