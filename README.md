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
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MOLECULE_API_KEY` (required for Molecule token discovery)
- Optional overrides: `VITE_MOLECULE_GRAPHQL_ENDPOINT`, `VITE_DEFILLAMA_BASE_URL`

### Local Development
```bash
npm run dev
```
Then open the printed local URL (defaults to `http://localhost:5173`).

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
  api/           # Supabase reviews + DeSci discovery + DefiLlama polling
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
- Sources: Pump.Science, Molecule GraphQL, BioDAO DAO/Agent APIs.
- BioDAO IPT reposts are filtered out from BioDAO ingestion.
- Market metrics are fetched from DefiLlama in batched requests.
- “All DeSci Tokens” page rotates refresh chunks each minute to reduce call pressure.
- Home token section and all-tokens page are sortable (default by FDV).

## Deployment
The project outputs a static bundle (`dist/`). Deploy the contents of `dist/` to any static host (GitHub Pages, Vercel, Netlify, etc.).
