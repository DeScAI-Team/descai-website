# DeScAI Website

Modern marketing site for the DeScAI platform, built with React, Vite, TypeScript, and Tailwind CSS. The layout highlights the platform overview, featured capabilities, and recent insights with reusable UI components.

## Tech Stack
- React 18 + TypeScript
- Vite for dev/build tooling
- Tailwind CSS for styling
- ESLint with recommended React rules

## Getting Started
### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+ (bundled with Node)

### Installation
```bash
npm install
```

### Environment Variables
Create `.env` from `.env.example` and set:
- `VITE_ARWEAVE_INDEX_API_URL` (defaults to `/api/index`)
- `VITE_ARWEAVE_GATEWAY_URL` (defaults to `https://arweave.net`)
- `MOLECULE_API_KEY` (required for Molecule token discovery; server-only)
- Optional overrides: `MOLECULE_GRAPHQL_ENDPOINT`, `VITE_DEFILLAMA_BASE_URL`

### Local Development
```bash
npm run dev
```
Then open the printed local URL (defaults to `http://localhost:5173`).

To power Arweave review data locally, start the index API in a second terminal:
```bash
npm run index-api
```
The Vite dev server proxies `/api/*` to `http://localhost:3001`.

### Build & Preview
```bash
npm run build   # output to dist/
npm run preview # serve the production build
```

### Linting
```bash
npm run lint
```

## Project Structure
```
src/
  api/           # Arweave review loading + DeSci discovery + DefiLlama polling
  components/    # Navbar, Featured, Insights, Platform panels
  hooks/         # Shared data hooks (useDesciTokens)
  services/      # Local cache + refresh rotation for token data
  data/          # Static content configuration
  styles/        # Global Tailwind layer extensions
  App.tsx        # Page layout composition
  main.tsx       # React bootstrap + Tailwind import
```

## DeSci Token Data Flow
- Discovery runs in frontend and is cached in `localStorage` for 24h.
- All discovery sources are fetched via the local API server to keep browser requests same-origin.
- Sources: Pump.Science, BioDAO DAO/Agent APIs, and a local API proxy for Molecule GraphQL.
- BioDAO IPT reposts are filtered out from BioDAO ingestion.
- Market metrics are fetched from DefiLlama in batched requests.
- “All DeSci Tokens” page rotates refresh chunks each minute to reduce call pressure.
- Home token section and all-tokens page are sortable (default by FDV).

## Arweave Review Data Flow
- The frontend loads ranked review candidates from `/api/index`.
- Each returned TXID is fetched over standard HTTP from `https://arweave.net/{txid}` or `VITE_ARWEAVE_GATEWAY_URL`.
- Summary metadata uses `name`, `date`, and `average_score`, with fallbacks for legacy `dao_name` and `review_date`.
- Reviews are ranked by `average_score` descending, and the top five TXIDs are flagged for Featured Research.
- If the index request fails, homepage/search surfaces the fetch error. If individual Arweave documents fail, the loader skips them and continues with the remaining ranked documents.

## Deployment
The frontend still outputs a static bundle (`dist/`), but token discovery now depends on server-side `/api/*` endpoints. Deploy the Express API alongside the frontend or provide equivalent serverless routes/reverse proxies.
