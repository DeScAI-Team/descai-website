# DeScAI API Server

Standalone API service for indexing Arweave transactions and proxying Molecule token discovery for the DeScAI platform.

## Overview
- **Port:** Runs on `3001` to avoid conflicts with the main web application (which runs on Vite's default `5173`).
- **Data Source:** Arweave network via `queryGQL` from `arweavekit`.
- **Purpose:** Fetches, formats, and sorts transaction histories for specified wallets, and keeps the Molecule API key server-side.

## Configuration

### Indexing wallets

The indexer reads transactions from **`ARWEAVE_WALLET_ADDRESS`** in `.env` (same wallet the home sidebar uses). Optional overrides: `VITE_ARWEAVE_WALLET_ADDRESS`, `VITE_ARWEAVE_OVERVIEW_AGENT_ADDRESS`.

If none are set, it falls back to the legacy hardcoded wallet in `src/api/arweaveIndex.ts`.

## Getting Started

### Running the Service
Local development starts this service together with Vite:

```bash
npm run dev
```

The indexer also has a dedicated npm script. Start only the service locally with:

```bash
npm run index-api
```
The API will be available at:
- `http://localhost:3001/api/index`
- `http://localhost:3001/api/molecule/ipts`
- `http://localhost:3001/api/pump-science/token-tickers`
- `http://localhost:3001/api/bio/liquid-daos`
- `http://localhost:3001/api/bio/liquid-agents`
- `http://localhost:3001/api/exit` (requires dev token)

### Running Alongside Web App
`npm run dev` starts both the main web app and the indexer so Vite can proxy `/api/*` to `http://localhost:3001`.

### Clean Exit (Developer Testing)
For development, you can cleanly stop the API by calling the `/api/exit` endpoint. To prevent unintended behavior, require a token in your `.env` file:
```js
ARWEAVE_EXIT_TOKEN=YOUR_TOKEN_HERE
```

After editing `.env`, restart the API server (`npm run index-api`) so the new token is loaded.

Recommended request (Bearer token):
```bash
curl -i -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3001/api/exit
```

Web browser convenience URL:
```text
http://localhost:3001/api/exit?token=YOUR_TOKEN_HERE
```

PowerShell-native alternative:
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/exit -Method Get -Headers @{ Authorization = "Bearer YOUR_TOKEN_HERE" }
```
