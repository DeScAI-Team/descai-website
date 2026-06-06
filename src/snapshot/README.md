# Snapshot access (local configuration)

Set these in your root `.env` (Vite exposes only `VITE_*` to the client):

| Variable | Purpose |
|----------|---------|
| `VITE_SNAPSHOT_ETH_WALLET_ADDRESS` | Treasury Base ETH address (incoming transfers are summed for eligibility). |
| `VITE_SNAPSHOT_RPC` | Base JSON-RPC URL for MetaMask “Add network” when Base is missing. |
| `VITE_SNAPSHOT_BUCKET` | URL shown as the download/open link after eligibility passes. |
| `VITE_SNAPSHOT_ARWEAVE_WALLET` | Arweave donation address (display only). |
| `VITE_SNAPSHOT_AKT_WALLET` | Akash (AKT) donation address (display only). |
| `VITE_SNAPSHOT_INDEXER_API_URL` | Optional. Default `https://base.blockscout.com/api` (Etherscan-compatible `txlist`). |

Eligibility uses **more than $15 USD** of cumulative **Base ETH** sent from the connected wallet to the treasury (normal transactions). Optional: `VITE_DEFILLAMA_BASE_URL` (existing app default) for ETH/USD pricing.
