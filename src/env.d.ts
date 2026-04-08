/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ARWEAVE_INDEX_API_URL?: string;
  readonly VITE_ARWEAVE_GATEWAY_URL?: string;
  readonly VITE_DEFILLAMA_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
