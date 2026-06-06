/// <reference types="vite/client" />

/** Snapshot access — see `src/snapshot/README.md`. */
interface ImportMetaEnv {
  readonly VITE_SNAPSHOT_ETH_WALLET_ADDRESS?: string;
  readonly VITE_SNAPSHOT_RPC?: string;
  readonly VITE_SNAPSHOT_BUCKET?: string;
  readonly VITE_SNAPSHOT_ARWEAVE_WALLET?: string;
  readonly VITE_SNAPSHOT_AKT_WALLET?: string;
  readonly VITE_SNAPSHOT_INDEXER_API_URL?: string;
}
