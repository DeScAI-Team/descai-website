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
  components/    # Navbar, Featured, Insights, Platform panels
  data/          # Static content configuration
  styles/        # Global Tailwind layer extensions
  App.tsx        # Page layout composition
  main.tsx       # React bootstrap + Tailwind import
```

## Deployment
The project outputs a static bundle (`dist/`). Deploy the contents of `dist/` to any static host (GitHub Pages, Vercel, Netlify, etc.).
