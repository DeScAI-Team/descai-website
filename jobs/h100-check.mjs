import { loadLocalEnv, parseArgs } from "./lib/env.mjs";
import {
  DEPLOY_REQUIREMENTS,
  fetchAkashProviders,
  fetchH100GpuPrices,
  summarizeH100Availability,
  uactPerBlockFromUsdPerHour,
} from "./lib/h100-requirements.mjs";
import {
  buildParallelDeployCards,
  findBestGpuProvider,
  formatGpuCard,
  loadDeployRequirements,
  resolvePerCardDepositUact,
} from "./lib/sdl-fit.mjs";

const TAG = "[h100-check]";
const log = (...args) => console.log(TAG, ...args);

function parseH100Args(argv = process.argv.slice(2)) {
  const options = { ...parseArgs(argv), json: false, all: false };
  for (const arg of argv) {
    if (arg === "--json") options.json = true;
    if (arg === "--all") options.all = true;
  }
  return options;
}

function printMarketPricing(marketPrices, maxUsdPerHour) {
  if (!marketPrices?.length) return;

  log("");
  log("Recent H100 market prices (Console API):");
  for (const row of marketPrices) {
    const p = row.price;
    if (!p) continue;
    log(
      `  ${row.interface ?? "?"} — $${p.min?.toFixed(2)}–$${p.max?.toFixed(2)}/hr (avg $${p.avg?.toFixed(2)})`
    );
  }

  const sxm = marketPrices.find((row) => /sxm/i.test(row.interface ?? ""));
  if (sxm?.price && maxUsdPerHour) {
    const ceiling = uactPerBlockFromUsdPerHour(maxUsdPerHour);
    if (maxUsdPerHour >= sxm.price.min) {
      log(
        `  Your ceiling $${maxUsdPerHour}/hr (${ceiling} uact/block) is at or above current SXM market min ($${sxm.price.min.toFixed(2)}/hr).`
      );
    }
  }
}

function printHumanReport(summary, marketPrices, maxUsdPerHour) {
  const { requirements, totals, interfaceCounts, providers, canFulfill, perNodeWarning } =
    summary;
  const perCardDeposit = resolvePerCardDepositUact();
  const cards = summary.parallelCards ?? [];

  log("Akash GPU availability (Console API)");
  log(`Scanned at ${summary.scannedAt}`);
  log("");
  log("Parallel deploy race (jobs/deploy-test.mjs):");
  log(
    `  ${cards.length} cards in parallel, $${(perCardDeposit / 1_000_000).toFixed(2)} ACT deposit each — first bid wins`
  );
  for (const card of cards) {
    const match = summary.cardProviders?.[card.id];
    const inv = match?.provider
      ? `${match.provider.organization ?? "?"} (${match.provider.gpuAvailable} free)`
      : "no inventory";
    log(`  ${formatGpuCard(card)} — ${inv}`);
  }

  log("");
  log(`H100 aggregate check (${requirements.cpuUnits} CPU, ${requirements.memoryGb}GiB RAM):`);
  log(
    `Online providers: ${totals.providersOnline} total, ${totals.h100ProvidersOnline} list H100, ${totals.h100WithAvailableGpu} have free H100 (${totals.h100GpusAvailable} GPUs)`
  );
  if (perNodeWarning) {
    log(`  Warning: ${perNodeWarning}`);
  }

  printMarketPricing(marketPrices, maxUsdPerHour);

  if (canFulfill.length > 0) {
    log("");
    log("H100 providers with aggregate capacity:");
    for (const row of canFulfill) {
      log(`  ${row.organization ?? row.owner} — ${row.gpuAvailable} GPU free`);
    }
  }

  log("");
  log("Next: npm run deploy:test — parallel GPU race, 30s bid window.");
}

async function main() {
  loadLocalEnv();
  const options = parseH100Args();
  const maxUsdPerHour = Number(process.env.AKASH_MAX_USD_PER_HOUR ?? 2.8);

  log("Fetching Akash provider inventory…");
  const [providers, marketPrices] = await Promise.all([
    fetchAkashProviders(),
    fetchH100GpuPrices().catch(() => []),
  ]);

  const baseRequirements = loadDeployRequirements();
  const parallelCards = buildParallelDeployCards(baseRequirements);
  const cardProviders = {};
  for (const card of parallelCards) {
    cardProviders[card.id] = findBestGpuProvider(providers, card.requirements);
  }

  const summary = summarizeH100Availability(providers, baseRequirements);
  summary.marketPrices = marketPrices;
  summary.parallelCards = parallelCards;
  summary.cardProviders = cardProviders;

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  printHumanReport(summary, marketPrices, maxUsdPerHour);
}

main().catch((error) => {
  console.error(TAG, error instanceof Error ? error.message : error);
  process.exit(1);
});
