import path from "node:path";
import { fileURLToPath } from "node:url";
import { Secp256k1HdWallet } from "@cosmjs/amino";
import {
  createChainNodeSDK,
  createStargateClient,
  generateManifest,
  generateManifestVersion,
  manifestToSortedJSON,
  yaml,
  JwtTokenManager,
} from "@akashnetwork/chain-sdk";
import { loadLocalEnv, parseArgs, requireEnv, sleep } from "./lib/env.mjs";
import { fetchOneclawSecrets } from "./lib/oneclaw.mjs";
import { pollStatusEvents } from "./lib/d1.mjs";
import { fetchH100GpuPrices } from "./lib/h100-requirements.mjs";
import {
  buildParallelDeployCards,
  formatGpuCard,
  formatRequirements,
  loadDeployRequirements,
  resolveRaceDepositUact,
  resolveWinnerDepositUact,
  scaleParallelCardsToBalance,
} from "./lib/sdl-fit.mjs";

const TAG = "[deploy-test]";
const log = (...args) => console.log(TAG, ...args);
const err = (...args) => console.error(TAG, ...args);

// Module-scope state for the SIGTERM/SIGINT handler.
let sdk = null;
let ownerAddress = null;
let activeDseq = null;
const activeDseqs = new Set();
let closing = false;

const BLOCKS_PER_HOUR = 600;
const DEFAULT_MAX_USD_PER_HOUR = 2.8;
const DEFAULT_LEASE_READY_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_LEASE_POLL_INTERVAL_MS = 10_000;
const DEFAULT_KEEPALIVE_MS = 30 * 60 * 1000;
const DEFAULT_ACT_MINT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_ACT_MINT_POLL_INTERVAL_MS = 10_000;
const DEFAULT_BID_MAX_WAIT_MS = 30_000;
const DEFAULT_BID_POLL_INTERVAL_MS = 10_000;
const LEDGER_PENDING = 1;
const DEPLOYMENT_ACTIVE = 1;
const GAS_RESERVE_UAKT = Number(process.env.AKASH_GAS_RESERVE_UAKT) || 500_000;
const ESCROW_RETURN_TIMEOUT_MS = Number(process.env.AKASH_ESCROW_RETURN_TIMEOUT_MS) || 30_000;
const DEBUG_INGEST =
  "http://127.0.0.1:7489/ingest/97f57820-b361-4122-b4b5-2a6f59135d51";
const DEBUG_SESSION = "15148f";

function debugLog(hypothesisId, location, message, data = {}) {
  // #region agent log
  fetch(DEBUG_INGEST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function decodeQuantity(val) {
  if (!val?.val) return null;
  return Buffer.from(Object.values(val.val)).toString();
}

/** v1beta5 bids expose lease identity on bid.id (not bid.bidId). */
function extractBidId(bid) {
  const raw = bid?.bidId ?? bid?.id;
  if (!raw) return null;

  const dseq =
    raw.dseq != null && typeof raw.dseq === "object" && "low" in raw.dseq
      ? Number(raw.dseq.low)
      : Number(raw.dseq);

  return {
    ...raw,
    dseq: Number.isFinite(dseq) ? dseq : raw.dseq,
  };
}

async function inspectMarketState({ address, dseq, groupSpecs, maxUactPerBlock }) {
  const spec = groupSpecs?.[0];
  const resource = spec?.resources?.[0];

  let deploymentState = null;
  let orderState = null;
  let orderPrice = null;
  let orderCpu = null;
  let orderMem = null;
  let orderGpuAttrs = null;
  let openBidsCount = 0;
  let allBidsCount = 0;
  let openH100OrdersOnNetwork = 0;

  try {
    const dep = await sdk.akash.deployment.v1beta4.getDeployment({
      id: { owner: address, dseq },
    });
    deploymentState = dep.deployment?.state ?? dep.state ?? null;
  } catch (e) {
    deploymentState = `error:${e.message}`;
  }

  try {
    const orders = await sdk.akash.market.v1beta5.getOrders({
      filters: { owner: address, dseq },
    });
    const order = orders.orders?.[0];
    orderState = order?.order?.state ?? order?.state ?? null;
    const orderSpec = order?.order?.spec ?? order?.spec;
    const res = orderSpec?.resources?.[0];
    orderPrice = res?.price ?? null;
    orderCpu = decodeQuantity(res?.resource?.cpu?.units);
    orderMem = decodeQuantity(res?.resource?.memory?.quantity);
    orderGpuAttrs = res?.resource?.gpu?.attributes ?? null;
  } catch (e) {
    orderState = `error:${e.message}`;
  }

  try {
    const openBids = await sdk.akash.market.v1beta5.getBids({
      filters: { owner: address, dseq, state: "open" },
    });
    openBidsCount = openBids.bids?.length ?? 0;
    const allBids = await sdk.akash.market.v1beta5.getBids({
      filters: { owner: address, dseq },
    });
    allBidsCount = allBids.bids?.length ?? 0;
  } catch (e) {
    openBidsCount = -1;
    allBidsCount = -1;
  }

  try {
    const networkOrders = await sdk.akash.market.v1beta5.getOrders({
      filters: { state: "open" },
      pagination: { limit: 50 },
    });
    openH100OrdersOnNetwork = (networkOrders.orders ?? []).filter((entry) => {
      const orderSpec = entry.order?.spec ?? entry.spec;
      const attrs = orderSpec?.resources?.[0]?.resource?.gpu?.attributes ?? [];
      return attrs.some((attr) => /h100/i.test(attr.key ?? ""));
    }).length;
  } catch (_) {
    openH100OrdersOnNetwork = -1;
  }

  const payload = {
    dseq,
    dseqType: typeof dseq,
    maxUactPerBlock,
    deploymentState,
    orderState,
    orderPrice,
    orderCpu,
    orderMem,
    orderGpuAttrs,
    openBidsCount,
    allBidsCount,
    openH100OrdersOnNetwork,
    submittedPrice: resource?.price ?? null,
    submittedGpuAttrs: resource?.resource?.gpu?.attributes ?? null,
    submittedCpu: decodeQuantity(resource?.resource?.cpu?.units),
    submittedMem: decodeQuantity(resource?.resource?.memory?.quantity),
  };

  debugLog("A,C,D", "deploy-test.mjs:inspectMarketState", "post-deploy market snapshot", payload);
  debugLog("B", "deploy-test.mjs:inspectMarketState", "bid query counts", {
    dseq,
    openBidsCount,
    allBidsCount,
    orderState,
  });

  return payload;
}

async function closeDeploy(owner, dseq) {
  try {
    await sdk.akash.deployment.v1beta4.closeDeployment({
      id: { owner, dseq },
    });
  } catch (_) {
    /* best-effort */
  }
  activeDseq = null;
  activeDseqs.delete(dseq);
}

async function closeAllDeployments(owner) {
  const targets = [...activeDseqs];
  if (activeDseq && !targets.includes(activeDseq)) targets.push(activeDseq);
  for (const dseq of targets) {
    await closeDeploy(owner, dseq);
  }
}

async function shutdown(signal) {
  if (closing) return;
  closing = true;
  log(`Received ${signal}, cleaning up…`);
  if (sdk && ownerAddress) {
    try {
      await closeAllDeployments(ownerAddress);
      log("Deployments closed during shutdown.");
    } catch (e) {
      err("Shutdown close failed:", e.message);
    }
  }
  process.exit(1);
}

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => shutdown(sig));
}

/** Some providers validate JWT times against host clock, which can lag local time by months. */
const DEFAULT_JWT_IAT_SKEW_SEC = 365 * 24 * 3600;
const DEFAULT_JWT_EXP_OFFSET_SEC = 900;

async function makeJwt(mnemonic) {
  const w = await Secp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "akash" });
  const [{ address }] = await w.getAccounts();
  const tm = new JwtTokenManager(w);
  const localNow = Math.floor(Date.now() / 1000);
  const iatSkewSec =
    Number(process.env.AKASH_JWT_IAT_SKEW_SEC) || DEFAULT_JWT_IAT_SKEW_SEC;
  const expOffsetSec =
    Number(process.env.AKASH_JWT_EXP_OFFSET_SEC) || DEFAULT_JWT_EXP_OFFSET_SEC;
  const iat = localNow - iatSkewSec;
  const nbf = iat;
  const exp = localNow + expOffsetSec;

  const token = await tm.generateToken({
    iss: address,
    exp,
    iat,
    nbf,
    version: "v1",
    leases: { access: "full" },
  });

  // #region agent log
  debugLog("J", "deploy-test.mjs:makeJwt", "provider jwt built", {
    localNow,
    iat,
    nbf,
    exp,
    iatSkewSec,
    expOffsetSec,
    leaseAccess: "full",
  });
  // #endregion

  return token;
}

async function fetchAktUsdPrice() {
  const override = process.env.AKASH_AKT_USD_PRICE;
  if (override) {
    const price = Number(override);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("AKASH_AKT_USD_PRICE must be a positive number");
    }
    log("Using AKASH_AKT_USD_PRICE override:", price);
    return price;
  }

  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=akash-network&vs_currencies=usd"
  );
  if (!res.ok) {
    throw new Error(`CoinGecko price fetch failed: ${res.status}`);
  }

  const data = await res.json();
  const price = data?.["akash-network"]?.usd;
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("CoinGecko returned invalid AKT price");
  }

  return price;
}

function computeMaxUactPerBlock(maxUsdPerHour) {
  const uactPerHour = maxUsdPerHour * 1_000_000;
  return Math.max(1, Math.floor(uactPerHour / BLOCKS_PER_HOUR));
}

function uaktNeededForUact(requiredUact, aktUsdPrice) {
  const actNeeded = requiredUact / 1_000_000;
  return Math.max(1, Math.ceil((actNeeded / aktUsdPrice) * 1_000_000));
}

async function getUactBalance(sdk, address) {
  const res = await sdk.cosmos.bank.v1beta1.getBalance({ address, denom: "uact" });
  return Number(res.balance?.amount ?? 0);
}

async function getUaktBalance(sdk, address) {
  const res = await sdk.cosmos.bank.v1beta1.getBalance({ address, denom: "uakt" });
  return Number(res.balance?.amount ?? 0);
}

async function closeStaleActiveDeployments(address) {
  const res = await sdk.akash.deployment.v1beta4.getDeployments({
    filters: { owner: address },
  });
  let closed = 0;

  for (const entry of res.deployments ?? []) {
    const state = entry.deployment?.state ?? entry.state;
    if (state !== DEPLOYMENT_ACTIVE) continue;

    const rawDseq = entry.deployment?.id?.dseq ?? entry.id?.dseq;
    const dseq = Number(rawDseq?.low ?? rawDseq);
    if (!Number.isFinite(dseq)) continue;

    log(`Closing stale deployment dseq ${dseq} to recover escrow…`);
    await closeDeploy(address, dseq);
    closed++;
  }

  return closed;
}

async function waitForEscrowReturn({ sdk, address, previousUact }) {
  const deadline = Date.now() + ESCROW_RETURN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const current = await getUactBalance(sdk, address);
    if (current > previousUact + 1000) {
      log(`Escrow returned — ${current} uact available (was ${previousUact}).`);
      return current;
    }
    await sleep(2000);
  }

  return getUactBalance(sdk, address);
}

async function waitForActBalance({
  sdk,
  address,
  requiredUact,
  timeoutMs = Number(process.env.AKASH_ACT_MINT_TIMEOUT_MS) || DEFAULT_ACT_MINT_TIMEOUT_MS,
  intervalMs = Number(process.env.AKASH_ACT_MINT_POLL_INTERVAL_MS) || DEFAULT_ACT_MINT_POLL_INTERVAL_MS,
}) {
  const deadline = Date.now() + timeoutMs;
  const startedAt = Date.now();
  while (Date.now() < deadline) {
    const current = await getUactBalance(sdk, address);
    if (current >= requiredUact) {
      log(`ACT balance ready — ${current} uact available.`);
      return current;
    }
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
    log(
      `Waiting for ACT mint settlement… (${current}/${requiredUact} uact, ${elapsedSec}s — BME often takes 1–5 min)`
    );
    await sleep(intervalMs);
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${requiredUact} uact.`);
}

async function ensureActBalance({ sdk, address, requiredUact, aktUsdPrice }) {
  let current = await getUactBalance(sdk, address);
  if (current >= requiredUact) {
    log(`ACT balance ok — ${current} uact available (${requiredUact} required).`);
    return;
  }

  const shortfall = requiredUact - current;
  const bmeStatus = await sdk.akash.bme.v1.getStatus({});
  if (!bmeStatus.mintsAllowed) {
    throw new Error(
      `Need ${shortfall} more uact but BME minting is halted (collateral ratio ${bmeStatus.collateralRatio}).`
    );
  }

  const ledger = await sdk.akash.bme.v1.getLedgerRecords({
    owner: address,
    pagination: { limit: 5 },
  });
  const pendingMint = ledger.records?.find(
    (record) =>
      record.status === LEDGER_PENDING &&
      record.pendingRecord?.denomToMint === "uact" &&
      record.pendingRecord?.owner === address
  );

  const uaktToBurn = uaktNeededForUact(shortfall, aktUsdPrice);
  const uaktAvailable = await getUaktBalance(sdk, address);
  const uaktSpendable = Math.max(0, uaktAvailable - GAS_RESERVE_UAKT);

  // #region agent log
  debugLog("F", "deploy-test.mjs:ensureActBalance", "balance check before mint", {
    currentUact: current,
    requiredUact,
    shortfall,
    uaktToBurn,
    uaktAvailable,
    uaktSpendable,
  });
  // #endregion

  if (uaktToBurn > uaktSpendable) {
    const aktShort = ((uaktToBurn - uaktSpendable) / 1_000_000).toFixed(2);
    throw new Error(
      `Cannot mint ${shortfall} uact — wallet has ${current} uact free (need ${requiredUact} for deposit). ` +
        `Mint needs ${uaktToBurn} uakt but only ${uaktSpendable} uakt is available after gas reserve ` +
        `(~${aktShort} more AKT). Stale deployments are closed at startup to recover escrow; ` +
        `otherwise lower AKASH_DEPOSIT or add AKT.`
    );
  }

  if (!pendingMint) {
    log(
      `Minting ACT — burning ${uaktToBurn} uakt to cover ${shortfall} uact shortfall @ $${aktUsdPrice}/AKT…`
    );
    await sdk.akash.bme.v1.mintACT({
      owner: address,
      to: address,
      coinsToBurn: { denom: "uakt", amount: String(uaktToBurn) },
    });
  } else {
    log("ACT mint already pending on BME ledger; waiting for settlement…");
  }

  log(
    `Need ${requiredUact} uact total — have ${current}. ${pendingMint ? "Pending mint on chain." : "Mint submitted."} Waiting for BME credit…`
  );

  await waitForActBalance({ sdk, address, requiredUact });
}

function formatEnvEntry(name, value) {
  return `${name}=${value}`;
}

function buildSdl({ maxUactPerBlock, secrets, requirements }) {
  const gpu = requirements.gpu;
  const ageEnvEntry = formatEnvEntry("AGE_SECRET_KEY_ENV", secrets.AGE_SECRET_KEY_ENV);
  const arweaveEnvEntry = formatEnvEntry(
    "AGE_SECRET_KEY_ARWEAVE",
    secrets.AGE_SECRET_KEY_ARWEAVE
  );
  // #region agent log
  const ageValue = ageEnvEntry.slice(ageEnvEntry.indexOf("=") + 1);
  debugLog("E1", "deploy-test.mjs:buildSdl", "age env shape", {
    valueLen: ageValue.length,
    char0: ageValue.charCodeAt(0),
    char58: ageValue.charCodeAt(58),
    last: ageValue.charCodeAt(ageValue.length - 1),
    hasWrappingQuotes: ageValue.charCodeAt(0) === 34 || ageValue.charCodeAt(ageValue.length - 1) === 34,
  });
  // #endregion
  return yaml`
---
version: "2.0"
services:
  descai-test-2:
    image: cobymnun/descai-agent_core:v5-fa-on
    expose:
      - port: 80
        as: 80
        to:
          - global: true
    env:
      - ${ageEnvEntry}
      - ${arweaveEnvEntry}
profiles:
  compute:
    descai-test-2:
      resources:
        cpu:
          units: ${requirements.cpuUnits}
        memory:
          size: ${requirements.memoryGb}Gb
        storage:
          - size: ${requirements.storageGi}Gi
        gpu:
          units: 1
          attributes:
            vendor:
              nvidia:
                - model: ${gpu.model}
                  ram: ${gpu.ram}
                  interface: ${gpu.interface}
  placement:
    dcloud:
      pricing:
        descai-test-2:
          denom: uact
          amount: ${maxUactPerBlock}
deployment:
  descai-test-2:
    dcloud:
      profile: descai-test-2
      count: 1
`;
}

function validateManifest(sdl) {
  const manifest = generateManifest(sdl, "mainnet");
  if (!manifest.ok) {
    err("SDL validation failed:", JSON.stringify(manifest.value));
    process.exit(1);
  }
  return manifest.value;
}

async function pollForBids({
  address,
  dseq,
  bidMaxWaitMs,
  bidPollIntervalMs,
  maxUactPerBlock,
}) {
  const bidPollAttempts = Math.max(1, Math.ceil(bidMaxWaitMs / bidPollIntervalMs));
  log(
    `Polling for bids (up to ${Math.round(bidMaxWaitMs / 1000)}s, every ${Math.round(bidPollIntervalMs / 1000)}s)…`
  );

  let bids = [];
  for (let i = 0; i < bidPollAttempts; i++) {
    await sleep(bidPollIntervalMs);
    try {
      const res = await sdk.akash.market.v1beta5.getBids({
        filters: { owner: address, dseq, state: "open" },
      });
      bids = res.bids ?? [];
      log(`Poll ${i + 1}/${bidPollAttempts} — ${bids.length} bid(s)`);
      if (i === 0 || bids.length > 0) {
        // #region agent log
        debugLog("B,E", "deploy-test.mjs:pollForBids", "bid poll tick", {
          poll: i + 1,
          dseq,
          dseqType: typeof dseq,
          openBids: bids.length,
          maxUactPerBlock,
          bidPrices: bids.slice(0, 5).map((entry) => ({
            provider: extractBidId(entry.bid)?.provider?.slice(0, 20),
            amount: entry.bid?.price?.amount,
            denom: entry.bid?.price?.denom,
            state: entry.bid?.state,
          })),
        });
        // #endregion
      }
      if (bids.length > 0) break;
    } catch (e) {
      err(`Poll ${i + 1} error:`, e.message);
    }
  }

  const affordable = bids
    .filter((b) => Number(b.bid.price.amount) <= maxUactPerBlock)
    .sort((a, b) => Number(a.bid.price.amount) - Number(b.bid.price.amount));

  return { bids, affordable };
}

async function waitForUniqueDseq(usedDseqs, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const latestBlock =
      await sdk.cosmos.base.tendermint.v1beta1.getLatestBlock({});
    const dseq = Number(latestBlock.block.header.height);
    if (!usedDseqs.has(dseq)) return dseq;
    await sleep(2000);
  }
  throw new Error("Timed out waiting for a unique deployment dseq.");
}

const DEPOSIT_SCOPE_DEPLOYMENT = 1;
const DEPOSIT_SOURCE_BALANCE = 1;

async function topUpWinnerDeposit({
  address,
  dseq,
  raceDepositUact,
  winnerDepositUact,
  aktUsdPrice,
}) {
  const topUpUact = winnerDepositUact - raceDepositUact;
  if (topUpUact <= 0) {
    log(
      `Winner escrow already ${winnerDepositUact} uact (race deposit ${raceDepositUact}) — no top-up.`
    );
    return;
  }

  await ensureActBalance({
    sdk,
    address,
    requiredUact: topUpUact,
    aktUsdPrice,
  });

  log(
    `Topping up winner dseq ${dseq}: +${topUpUact} uact ($${(topUpUact / 1_000_000).toFixed(2)} ACT) → $${(winnerDepositUact / 1_000_000).toFixed(2)} ACT total`
  );

  await sdk.akash.escrow.v1.accountDeposit({
    signer: address,
    id: {
      scope: DEPOSIT_SCOPE_DEPLOYMENT,
      xid: `${address}/${dseq}`,
    },
    deposit: {
      amount: { denom: "uact", amount: String(topUpUact) },
      sources: [DEPOSIT_SOURCE_BALANCE],
    },
  });

  log("Winner escrow topped up.");
}

async function createDeploymentOnChain({
  address,
  groupSpecs,
  hash,
  depositUact,
  usedDseqs,
  label,
}) {
  const dseq = await waitForUniqueDseq(usedDseqs);
  activeDseq = dseq;
  activeDseqs.add(dseq);
  log(`[${label}] dseq: ${dseq} (deposit ${depositUact} uact)`);

  await sdk.akash.deployment.v1beta4.createDeployment({
    id: { owner: address, dseq },
    groups: groupSpecs,
    hash,
    deposit: {
      amount: { denom: "uact", amount: String(depositUact) },
      sources: [1],
    },
  });
  usedDseqs.add(dseq);
  log(`[${label}] deployment created.`);

  return dseq;
}

async function pollParallelForBids({
  address,
  deployments,
  bidMaxWaitMs,
  bidPollIntervalMs,
  maxUactPerBlock,
}) {
  const bidPollAttempts = Math.max(1, Math.ceil(bidMaxWaitMs / bidPollIntervalMs));
  log(
    `Polling ${deployments.length} parallel deployment(s) (up to ${Math.round(bidMaxWaitMs / 1000)}s, every ${Math.round(bidPollIntervalMs / 1000)}s)…`
  );

  for (let i = 0; i < bidPollAttempts; i++) {
    await sleep(bidPollIntervalMs);

    for (const deployment of deployments) {
      if (deployment.closed) continue;

      try {
        const res = await sdk.akash.market.v1beta5.getBids({
          filters: { owner: address, dseq: deployment.dseq, state: "open" },
        });
        const bids = res.bids ?? [];
        const affordable = bids
          .filter((b) => Number(b.bid.price.amount) <= maxUactPerBlock)
          .sort((a, b) => Number(a.bid.price.amount) - Number(b.bid.price.amount));

        log(
          `Poll ${i + 1}/${bidPollAttempts} — [${deployment.id}] ${bids.length} bid(s)${affordable.length ? " ✓" : ""}`
        );

        if (affordable.length > 0) {
          return { deployment, affordable, allBids: bids };
        }

        if (bids.length > 0 && affordable.length === 0) {
          deployment.overPrice = true;
        }
      } catch (e) {
        err(`Poll ${i + 1} [${deployment.id}] error:`, e.message);
      }
    }
  }

  return null;
}

function isLeaseReady(status) {
  if (!status || typeof status !== "object") return false;

  const services = status.services;
  if (services && typeof services === "object") {
    for (const service of Object.values(services)) {
      if (!service || typeof service !== "object") continue;

      const available = Number(service.available ?? service.available_replicas ?? 0);
      const ready = Number(service.ready_replicas ?? 0);
      const total = Number(service.total ?? service.replicas ?? 0);
      const uris = Array.isArray(service.uris) ? service.uris : [];

      if (available >= 1 || ready >= 1) return true;
      if (total >= 1 && uris.length > 0) return true;
    }
  }

  const forwardedPorts = status.forwarded_ports;
  if (forwardedPorts && typeof forwardedPorts === "object") {
    for (const ports of Object.values(forwardedPorts)) {
      if (Array.isArray(ports) && ports.length > 0) return true;
    }
  }

  return false;
}

async function fetchLeaseStatus(providerHostUri, dseq, bidId, mnemonic) {
  const token = await makeJwt(mnemonic);
  const url = `${providerHostUri}/lease/${dseq}/${bidId.gseq}/${bidId.oseq}/status`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Lease status returned ${res.status}`);
  }

  return res.json();
}

async function waitForLeaseReady({
  providerHostUri,
  dseq,
  bidId,
  mnemonic,
  timeoutMs = Number(process.env.AKASH_LEASE_READY_TIMEOUT_MS) || DEFAULT_LEASE_READY_TIMEOUT_MS,
  intervalMs = Number(process.env.AKASH_LEASE_POLL_INTERVAL_MS) || DEFAULT_LEASE_POLL_INTERVAL_MS,
}) {
  log("Waiting for lease to become ready…");
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const status = await fetchLeaseStatus(providerHostUri, dseq, bidId, mnemonic);
      if (isLeaseReady(status)) {
        log("Lease is ready.");
        return status;
      }
      log("Lease not ready yet; retrying…");
    } catch (e) {
      log("Lease status check failed (retrying):", e.message);
    }

    await sleep(intervalMs);
  }

  throw new Error(`Lease did not become ready within ${timeoutMs}ms`);
}

export async function run(cliOptions = parseArgs()) {
  loadLocalEnv();

  const AKASH_MNEMONIC = requireEnv("AKASH_MNEMONIC", { tag: TAG });
  const AKASH_RPC = requireEnv("AKASH_RPC", { tag: TAG });
  const AKASH_GRPC = requireEnv("AKASH_GRPC", { tag: TAG });

  const maxUsdPerHour = Number(process.env.AKASH_MAX_USD_PER_HOUR ?? DEFAULT_MAX_USD_PER_HOUR);
  if (!Number.isFinite(maxUsdPerHour) || maxUsdPerHour <= 0) {
    err("AKASH_MAX_USD_PER_HOUR must be a positive number");
    process.exit(1);
  }

  log("Fetching secrets from 1claw…");
  const secrets = await fetchOneclawSecrets({ log });

  const aktUsdPrice = await fetchAktUsdPrice();
  const maxUactPerBlock = computeMaxUactPerBlock(maxUsdPerHour);
  log(`Price ceiling: $${maxUsdPerHour}/hr → ${maxUactPerBlock} uact/block`);

  try {
    const h100Prices = await fetchH100GpuPrices();
    const sxm = h100Prices.find((row) => /sxm/i.test(row.interface ?? ""));
    if (sxm?.price) {
      log(
        `H100 SXM market: $${sxm.price.min.toFixed(2)}–$${sxm.price.max.toFixed(2)}/hr (avg $${sxm.price.avg.toFixed(2)})`
      );
    }
  } catch (e) {
    log("H100 market price lookup skipped:", e.message);
  }

  const baseRequirements = loadDeployRequirements();
  const parallelCards = buildParallelDeployCards(baseRequirements);
  const raceDepositUact = resolveRaceDepositUact();
  const winnerDepositUact = resolveWinnerDepositUact();
  const raceEscrowTotal = raceDepositUact * parallelCards.length;

  if (cliOptions.dryRun) {
    log(
      `Parallel GPU race — ${parallelCards.length} cards, $${(raceDepositUact / 1_000_000).toFixed(2)} ACT race deposit each (${raceEscrowTotal} uact total); winner topped to $${(winnerDepositUact / 1_000_000).toFixed(2)} ACT`
    );
    for (const card of parallelCards) {
      log(`  ${formatGpuCard(card)}`);
      validateManifest(
        buildSdl({ maxUactPerBlock, secrets, requirements: card.requirements })
      );
    }
    log("Dry run complete — all cards validated, no chain transactions sent.");
    return;
  }

  log("Initialising wallet…");
  const txSigner = createStargateClient({
    baseUrl: AKASH_RPC,
    signerMnemonic: AKASH_MNEMONIC,
    defaultGasPrice: "0.025uakt",
  });
  const { address } = await txSigner.getAccount();
  ownerAddress = address;
  log("Wallet:", address);

  sdk = createChainNodeSDK({
    query: { baseUrl: AKASH_GRPC },
    tx: { signer: txSigner },
  });

  const uactBeforeClose = await getUactBalance(sdk, address);
  const staleClosed = await closeStaleActiveDeployments(address);
  if (staleClosed > 0) {
    log(`Closed ${staleClosed} stale deployment(s); waiting for escrow…`);
    await waitForEscrowReturn({ sdk, address, previousUact: uactBeforeClose });
  }

  const availableUact = await getUactBalance(sdk, address);
  const scaled = scaleParallelCardsToBalance(
    parallelCards,
    availableUact,
    raceDepositUact
  );
  const cardsToRun = scaled.cards;
  const requiredRaceEscrow = scaled.requiredEscrow;
  const winnerTopUpUact = Math.max(0, winnerDepositUact - raceDepositUact);

  if (scaled.scaled) {
    log(
      `Escrow fits ${cardsToRun.length}/${parallelCards.length} cards at ${availableUact} uact — skipping: ${scaled.skipped?.join(", ") ?? "none"}`
    );
  }

  log(
    `Parallel race — ${cardsToRun.length} GPU card(s), ${raceDepositUact} uact/card ($${(raceDepositUact / 1_000_000).toFixed(2)} ACT race), ${requiredRaceEscrow} uact race escrow; winner → $${(winnerDepositUact / 1_000_000).toFixed(2)} ACT (+$${(winnerTopUpUact / 1_000_000).toFixed(2)} after bid)`
  );

  await ensureActBalance({
    sdk,
    address,
    requiredUact: requiredRaceEscrow,
    aktUsdPrice,
  });

  const bidPollIntervalMs =
    Number(process.env.AKASH_BID_POLL_INTERVAL_MS) || DEFAULT_BID_POLL_INTERVAL_MS;
  const bidMaxWaitMs = Number(process.env.AKASH_BID_MAX_WAIT_MS) || DEFAULT_BID_MAX_WAIT_MS;

  const usedDseqs = new Set();
  const liveDeployments = [];

  log("Creating parallel deployments…");
  for (const card of cardsToRun) {
    const sdl = buildSdl({ maxUactPerBlock, secrets, requirements: card.requirements });
    const manifestValue = validateManifest(sdl);
    const hash = await generateManifestVersion(manifestValue.groups);

    try {
      const dseq = await createDeploymentOnChain({
        address,
        groupSpecs: manifestValue.groupSpecs,
        hash,
        depositUact: raceDepositUact,
        usedDseqs,
        label: card.id,
      });
      liveDeployments.push({
        id: card.id,
        dseq,
        groups: manifestValue.groups,
        requirements: card.requirements,
        closed: false,
      });
      // #region agent log
      debugLog("A", "deploy-test.mjs:run", "parallel deployment created", {
        card: card.id,
        dseq,
        requirements: formatRequirements(card.requirements),
        depositUact: raceDepositUact,
      });
      // #endregion
    } catch (e) {
      err(`[${card.id}] createDeployment failed:`, e.message);
    }
  }

  if (liveDeployments.length === 0) {
    err("No parallel deployments were created.");
    process.exit(1);
  }

  const raceResult = await pollParallelForBids({
    address,
    deployments: liveDeployments,
    bidMaxWaitMs,
    bidPollIntervalMs,
    maxUactPerBlock,
  });

  if (!raceResult) {
    const overPrice = liveDeployments.filter((dep) => dep.overPrice);
    if (overPrice.length === liveDeployments.length && overPrice.length > 0) {
      err(`All bids exceed ${maxUactPerBlock} uact/block ($${maxUsdPerHour}/hr) ceiling.`);
    } else {
      err(`No bids on any of ${liveDeployments.length} parallel deployment(s).`);
    }
    await closeAllDeployments(address);
    process.exit(1);
  }

  const winner = raceResult.deployment;
  const affordable = raceResult.affordable;
  const dseq = winner.dseq;
  const groups = winner.groups;
  activeDseq = dseq;

  log(
    `Winner: [${winner.id}] ${formatRequirements(winner.requirements)} — closing ${liveDeployments.length - 1} other deployment(s)…`
  );

  const uactBeforeCloseLosers = await getUactBalance(sdk, address);
  for (const deployment of liveDeployments) {
    if (deployment.dseq === winner.dseq) continue;
    await closeDeploy(address, deployment.dseq);
    deployment.closed = true;
  }
  if (liveDeployments.length > 1) {
    await waitForEscrowReturn({
      sdk,
      address,
      previousUact: uactBeforeCloseLosers,
    });
  }

  try {
    await topUpWinnerDeposit({
      address,
      dseq,
      raceDepositUact,
      winnerDepositUact,
      aktUsdPrice,
    });
  } catch (e) {
    err("Winner escrow top-up failed:", e.message);
    await closeDeploy(address, dseq);
    process.exit(1);
  }

  const selectedBid = affordable[0].bid;
  const bidId = extractBidId(selectedBid);
  // #region agent log
  debugLog("A", "deploy-test.mjs:run", "winner bid shape", {
    bidKeys: selectedBid ? Object.keys(selectedBid) : [],
    hasBidId: Boolean(selectedBid?.bidId),
    hasId: Boolean(selectedBid?.id),
    extractedProvider: bidId?.provider?.slice(0, 20) ?? null,
    price: selectedBid?.price?.amount,
  });
  // #endregion
  if (!bidId?.provider) {
    throw new Error(
      `Winning bid missing lease id (keys: ${selectedBid ? Object.keys(selectedBid).join(", ") : "none"})`
    );
  }
  const provider = bidId.provider;
  log(`Bid selected — provider: ${provider}, price: ${selectedBid.price.amount} ${selectedBid.price.denom}/block`);

  try {
    await sdk.akash.market.v1beta5.createLease({ bidId });
    log("Lease created.");
  } catch (e) {
    err("createLease failed:", e.message);
    process.exit(1);
  }

  let providerHostUri;
  try {
    const info = await sdk.akash.provider.v1beta4.getProvider({ owner: provider });
    providerHostUri = info.provider.hostUri;
    log("Provider URI:", providerHostUri);
  } catch (e) {
    err("Provider query failed:", e.message);
    process.exit(1);
  }

  try {
    const token = await makeJwt(AKASH_MNEMONIC);
    const url = `${providerHostUri}/deployment/${dseq}/manifest`;
    log("PUT", url);
    const manifestBody = manifestToSortedJSON(groups);
    const cpuVal = groups?.[0]?.services?.[0]?.resources?.cpu?.units?.val;
    const memVal = groups?.[0]?.services?.[0]?.resources?.memory?.quantity?.val;
    // #region agent log
    debugLog("M1", "deploy-test.mjs:run", "manifest body shape", {
      cpuValType: typeof cpuVal,
      cpuValCtor: cpuVal?.constructor?.name ?? null,
      memValType: typeof memVal,
      memValCtor: memVal?.constructor?.name ?? null,
      stringifyCpuVal: JSON.stringify(cpuVal)?.slice(0, 80),
      sortedCpuVal: JSON.parse(manifestBody)?.[0]?.services?.[0]?.resources?.cpu?.units?.val ?? null,
      bodyLen: manifestBody.length,
    });
    // #endregion
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: manifestBody,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      // #region agent log
      debugLog("J", "deploy-test.mjs:run", "manifest PUT failed", {
        status: res.status,
        provider: provider?.slice(0, 20),
        dseq,
        body: body.slice(0, 200),
      });
      // #endregion
      err(`Manifest PUT failed — ${res.status}: ${body}`);
      process.exit(1);
    }
    log("Manifest sent.");
  } catch (e) {
    err("Failed to send manifest:", e.message);
    process.exit(1);
  }

  let leaseStatus;
  try {
    leaseStatus = await waitForLeaseReady({
      providerHostUri,
      dseq,
      bidId,
      mnemonic: AKASH_MNEMONIC,
    });
    log("Lease status:", JSON.stringify(leaseStatus, null, 2));
  } catch (e) {
    err("Lease readiness failed:", e.message);
    await closeDeploy(address, dseq);
    process.exit(1);
  }

  const deploymentStartedAt = new Date().toISOString();
  const leaseId = `${bidId.owner}/${dseq}/${bidId.gseq}/${bidId.oseq}`;
  log("=== Deployment live ===");
  log("  dseq:", dseq);
  log("  provider:", provider);
  log("  lease:", leaseId);
  log("  deploymentStartedAt:", deploymentStartedAt);

  if (cliOptions.skipD1) {
    const keepaliveMs = Number(process.env.AKASH_KEEPALIVE_MS) || DEFAULT_KEEPALIVE_MS;
    log(`--skip-d1: keeping alive for ${keepaliveMs}ms…`);
    await sleep(keepaliveMs);
  } else {
    try {
      const doneEvent = await pollStatusEvents({
        since: deploymentStartedAt,
        pollIntervalMs: cliOptions.pollIntervalMs ?? undefined,
        maxWaitMs: cliOptions.maxWaitMs ?? undefined,
        log,
        onEvent: (row) => {
          log(
            `D1 status event — run_id=${row.run_id} status=${row.status} recorded_at=${row.recorded_at}`
          );
        },
      });
      log(`Agent reported done (run_id=${doneEvent.run_id}, recorded_at=${doneEvent.recorded_at}).`);
    } catch (e) {
      err("D1 polling failed:", e.message);
      await closeDeploy(address, dseq);
      process.exit(1);
    }
  }

  log("Closing deployment…");
  try {
    await sdk.akash.deployment.v1beta4.closeDeployment({
      id: { owner: address, dseq },
    });
    activeDseq = null;
    log("Deployment closed.");
  } catch (e) {
    err("closeDeployment failed:", e.message);
    process.exit(1);
  }

  log("Done.");
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  run(parseArgs())
    .then(() => process.exit(0))
    .catch((e) => {
      err("Unrecoverable error:", e);
      process.exit(1);
    });
}
