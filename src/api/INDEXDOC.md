# DeScAI API Server

Standalone API service for indexing Arweave transactions and proxying Molecule token discovery for the DeScAI platform.

## Overview
- **Port:** Runs on `3001` to avoid conflicts with the main web application (which runs on Vite's default `5173`).
- **Data Source:** Arweave network via `queryGQL` from `arweavekit`.
- **Purpose:** Fetches, formats, and sorts transaction histories for specified wallets, and keeps the Molecule API key server-side.

## Configuration

### Adding Wallets
To track transactions for additional Arweave wallets, add their Wallet IDs to the `WALLETS` array located at the top of `src/api/arweaveIndex.ts`:

```typescript
const WALLETS = [
  "-tFrKF2NuT5_X1cNOTHJmZw3xhss0K5WnXl3wYxRYLM", 
  // "Add_More_Wallet_IDs_Here"
];
```

## Getting Started

### Running the Service
The indexer has a dedicated npm script. Start the service locally with:

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
To run this service concurrently with your main web application during local development:
1. Open your integrated terminal.
2. Start your main web app as usual (`npm run dev`).
3. Split the terminal or open a new terminal tab.
4. Start the indexer (`npm run index-api`) in the new terminal instance.

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
