/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ARWEAVE_INDEX_API_URL?: string;
  readonly VITE_ARWEAVE_GATEWAY_URL?: string;
  readonly VITE_DEFILLAMA_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type EthereumProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<T>;
  on?(event: "accountsChanged", handler: (accounts: string[]) => void): void;
  on?(event: "chainChanged", handler: (chainId: string) => void): void;
  removeListener?(event: "accountsChanged", handler: (accounts: string[]) => void): void;
  removeListener?(event: "chainChanged", handler: (chainId: string) => void): void;
};

type ArweaveWalletProvider = {
  connect: (permissions: string[]) => Promise<void>;
  disconnect: () => Promise<void>;
  getActiveAddress: () => Promise<string>;
  sign: (transaction: unknown) => Promise<unknown>;
  signMessage: (message: Uint8Array) => Promise<unknown>;
};

interface Window {
  ethereum?: EthereumProvider;
  arweaveWallet?: ArweaveWalletProvider;
}
