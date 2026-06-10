# Jobs

Node scripts for deploying `descai-agent_core` on Akash and related ops.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run deploy:cron` | Scheduler only (no web server): run `deploy:test` now, then every 7d on success or every 12h on failure |
| `npm start` | Web server + same deploy scheduler when `AKASH_MNEMONIC` is set |
| `npm run deploy:test` | Full deploy: 1claw secrets → parallel GPU race → lease → manifest → D1 poll → close |
| `npm run deploy:test -- --dry-run` | Validate SDL/manifest for all GPU cards; no chain txs |
| `npm run deploy:test -- --skip-d1` | Deploy and keep lease alive (`AKASH_KEEPALIVE_MS`, default 30m), then close |
| `npm run h100:check` | H100/H200 provider availability vs deploy requirements |
| `npm run h100:check -- --json` | Same, JSON output |
| `npm run key-fetch:test` | Verify 1claw vault secrets (masked) |
| `npm run key-fetch:test:show` | Print full secret values |

## Setup

Copy root `.env.example` → `.env` and fill in:

- **Akash:** `AKASH_MNEMONIC`, `AKASH_RPC`, `AKASH_GRPC`
- **1claw:** `ONECLAW_API_KEY`, `ONECLAW_VAULT_ID`, `ONECLAW_AGENT_ID` (optional)
- **D1:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (for orchestrator status polling)

Key env knobs: `AKASH_MAX_USD_PER_HOUR` (default `2.80`), `AKASH_PARALLEL_DEPOSIT_UACT` (default `2000000` = $2 ACT race deposit per card), `AKASH_WINNER_DEPOSIT_UACT` (default `30000000` = $30 ACT total on winning deployment).

## Deploy flow (`deploy-test.mjs`)

1. Fetch `AGE_SECRET_KEY_*` from 1claw and inject into SDL env (unquoted `KEY=value` lines).
2. Close any **stale active deployments** on the wallet to recover escrow.
3. Race **3 GPU cards** in parallel (H100 SXM, H100 PCIe, H200 SXM) with a **low deposit** ($2 ACT/card); first affordable bid wins.
4. Close losing deployments, **top up winner escrow** to $30 ACT via `accountDeposit`, then create lease.
5. Send manifest (`manifestToSortedJSON`), wait for lease ready.
6. Poll Cloudflare D1 `orchestrator_status_events` until `status=done`.
7. `closeDeployment` on-chain and return escrow.

**Ctrl+C** triggers cleanup and closes tracked deployments. Wait for `Deployments closed during shutdown.` before starting another run.

### CLI flags

```
--dry-run          Validate only
--skip-d1          Skip D1 poll; use keepalive timer instead
--no-sdl-fit       Disable SDL auto-fit
--poll-interval N  D1 poll interval (ms)
--max-wait N       D1 max wait (ms, default 2h)
```

## Tail container logs (second terminal)

Mint a JWT from `.env`, then stream provider logs (replace `DSEQ` from `=== Deployment live ===`):

```powershell
cd D:\DeScAi\descai-website

$jwt = node --input-type=module -e "import { loadLocalEnv } from './jobs/lib/env.mjs'; import { Secp256k1HdWallet } from '@cosmjs/amino'; import { JwtTokenManager } from '@akashnetwork/chain-sdk'; loadLocalEnv(); const w = await Secp256k1HdWallet.fromMnemonic(process.env.AKASH_MNEMONIC, { prefix: 'akash' }); const [{ address }] = await w.getAccounts(); const localNow = Math.floor(Date.now()/1000); const iatSkew = Number(process.env.AKASH_JWT_IAT_SKEW_SEC)||31536000; const expOff = Number(process.env.AKASH_JWT_EXP_OFFSET_SEC)||900; const token = await new JwtTokenManager(w).generateToken({ iss: address, exp: localNow+expOff, iat: localNow-iatSkew, nbf: localNow-iatSkew, version: 'v1', leases: { access: 'full' } }); process.stdout.write(token);"

npx --yes wscat -n -c "wss://provider.h100.wdc.hh.akash.pub:8443/lease/DSEQ/1/1/logs?follow=true&tail=200&service=descai-test-2" -H "Authorization: Bearer $jwt"
```

Provider host URI varies by winning bid; check deploy output for the exact host.

## Ensure all deployments are down

List active deployments:

```powershell
node --input-type=module -e "import { loadLocalEnv } from './jobs/lib/env.mjs'; import { createChainNodeSDK, createStargateClient } from '@akashnetwork/chain-sdk'; loadLocalEnv(); const txSigner = createStargateClient({ baseUrl: process.env.AKASH_RPC, signerMnemonic: process.env.AKASH_MNEMONIC, defaultGasPrice: '0.025uakt' }); const { address } = await txSigner.getAccount(); const sdk = createChainNodeSDK({ query: { baseUrl: process.env.AKASH_GRPC }, tx: { signer: txSigner } }); const res = await sdk.akash.deployment.v1beta4.getDeployments({ filters: { owner: address } }); const active = (res.deployments ?? []).filter(e => (e.deployment?.state ?? e.state) === 1).map(e => Number((e.deployment?.id?.dseq ?? e.id?.dseq)?.low ?? (e.deployment?.id?.dseq ?? e.id?.dseq))); console.log('active deployments:', active.length ? active.join(', ') : '(none)');"
```

`(none)` means nothing is running. `deploy:test` also closes stale deployments automatically at startup.

## Layout

```
jobs/
  deploy-cron.mjs      Weekly deploy scheduler (7d success / 12h retry)
  deploy-test.mjs      Main Akash deploy orchestrator
  h100-check.mjs       Provider/GPU availability report
  key-fetch-test.mjs   1claw secret smoke test
  lib/
    env.mjs            .env loader, CLI arg parsing
    oneclaw.mjs        1claw vault API client
    d1.mjs             Cloudflare D1 status polling
    sdl-fit.mjs        Parallel GPU cards, escrow scaling
    h100-requirements.mjs  GPU requirements + provider queries
```

## Deploy scheduler (`deploy-cron.mjs`)

Shared scheduler used by **`npm start`** (when `AKASH_MNEMONIC` is set) and **`npm run deploy:cron`** (scheduler-only). Runs `deploy:test` on a loop: first deploy starts immediately; each subsequent run is scheduled from the previous result.

- Streams `deploy-test` stdout/stderr and watches for `=== Deployment live ===` (logs when a lease is up).
- **Success** (`Done.` + exit 0): next run in **7 days**
- **Failure** (non-zero exit): next run in **12 hours**

**Ctrl+C** stops the scheduler and forwards SIGINT to an in-flight deploy. Wait for `Deployments closed during shutdown.` before restarting.

```powershell
npm start              # website + scheduler (typical production)
npm run deploy:cron    # scheduler only, no static site
```

Run one of the above under a process manager (systemd, pm2, etc.). Do not run both at the same time.
