import {
  DEPLOY_REQUIREMENTS,
  evaluateProvider,
  interfacesCompatible,
  matchingGpuModels,
} from "./h100-requirements.mjs";

/** $2 ACT escrow per parallel race card — enough to attract bids (default). */
export const DEFAULT_RACE_DEPOSIT_UACT = 2_000_000;

/** $30 ACT total escrow on the winning deployment after top-up (default). */
export const DEFAULT_WINNER_DEPOSIT_UACT = 30_000_000;

/** @deprecated Use DEFAULT_RACE_DEPOSIT_UACT */
export const DEFAULT_PARALLEL_DEPOSIT_UACT = DEFAULT_RACE_DEPOSIT_UACT;

/** GPU cards raced in parallel — first affordable bid wins (H100/H200 only). */
export const PARALLEL_GPU_CARDS = [
  { id: "h100-sxm", model: "h100", ram: "80Gi", interface: "sxm" },
  { id: "h100-pcie", model: "h100", ram: "80Gi", interface: "pcie" },
  { id: "h200-sxm", model: "h200", ram: "141Gi", interface: "sxm" },
];

export function resolveRaceDepositUact() {
  const override = process.env.AKASH_PARALLEL_DEPOSIT_UACT?.trim();
  if (override) {
    const value = Number(override);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return DEFAULT_RACE_DEPOSIT_UACT;
}

export function resolveWinnerDepositUact() {
  const override = process.env.AKASH_WINNER_DEPOSIT_UACT?.trim();
  if (override) {
    const value = Number(override);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return DEFAULT_WINNER_DEPOSIT_UACT;
}

/** Free ACT needed in wallet before parallel deploy (race escrow + winner top-up). */
export function computePrefundUact({ requiredRaceEscrow, winnerDepositUact }) {
  return Math.max(requiredRaceEscrow, winnerDepositUact);
}

/** Race-card deposit (alias). */
export function resolvePerCardDepositUact() {
  return resolveRaceDepositUact();
}

export function loadDeployRequirements() {
  const requirements = {
    ...DEPLOY_REQUIREMENTS,
    gpu: { ...DEPLOY_REQUIREMENTS.gpu },
  };

  const cpu = Number(process.env.AKASH_SDL_CPU_UNITS);
  const memory = Number(process.env.AKASH_SDL_MEMORY_GB);
  const storage = Number(process.env.AKASH_SDL_STORAGE_GI);

  if (Number.isFinite(cpu) && cpu > 0) requirements.cpuUnits = cpu;
  if (Number.isFinite(memory) && memory > 0) requirements.memoryGb = memory;
  if (Number.isFinite(storage) && storage > 0) requirements.storageGi = storage;

  return requirements;
}

export function isAutoFitEnabled(cliOptions = {}) {
  if (cliOptions.noSdlFit) return false;
  const flag = process.env.AKASH_SDL_AUTO_FIT?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return true;
}

function gpuMatchesForFit(gpu, gpuRequirements) {
  if (!gpu || !gpuRequirements.model) return false;
  if (!new RegExp(`^${gpuRequirements.model}$`, "i").test(gpu.model ?? "")) return false;
  if (gpuRequirements.ram && gpu.ram && gpu.ram !== gpuRequirements.ram) return false;
  if (
    gpuRequirements.interface &&
    !interfacesCompatible(gpuRequirements.interface, gpu.interface)
  ) {
    return false;
  }
  return true;
}

function providersWithFreeMatchingGpu(providers, requirements) {
  return providers.filter((provider) => {
    if (!provider.isOnline) return false;
    const gpuAvailable = provider.stats?.gpu?.available ?? 0;
    if (gpuAvailable < 1) return false;
    const models = matchingGpuModels(provider.gpuModels, requirements.gpu.model).filter(
      (gpu) => gpuMatchesForFit(gpu, requirements.gpu)
    );
    return models.length > 0;
  });
}

export function buildParallelDeployCards(baseRequirements) {
  return PARALLEL_GPU_CARDS.map((card) => ({
    id: card.id,
    requirements: {
      cpuUnits: baseRequirements.cpuUnits,
      memoryGb: baseRequirements.memoryGb,
      storageGi: baseRequirements.storageGi,
      gpu: {
        vendor: "nvidia",
        model: card.model,
        ram: card.ram,
        interface: card.interface,
      },
    },
  }));
}

export function findBestGpuProvider(providers, requirements) {
  const candidates = providersWithFreeMatchingGpu(providers, requirements);
  const rows = candidates
    .map((provider) => {
      const row = evaluateProvider(provider, requirements);
      if (row.gpuAvailable < 1) return null;
      const matching = matchingGpuModels(provider.gpuModels, requirements.gpu.model).filter(
        (gpu) => gpuMatchesForFit(gpu, requirements.gpu)
      );
      if (matching.length === 0) return null;
      return {
        owner: row.owner,
        organization: row.organization,
        country: row.country,
        gpuAvailable: row.gpuAvailable,
        model: requirements.gpu.model,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.gpuAvailable - a.gpuAvailable);

  if (rows.length === 0) {
    return { provider: null, reason: `no-free-${requirements.gpu.model}` };
  }

  return { provider: rows[0], reason: "found" };
}

export function formatRequirements(requirements) {
  const iface = requirements.gpu.interface ?? "any";
  return `${requirements.cpuUnits} CPU, ${requirements.memoryGb}Gb RAM, ${requirements.storageGi}Gi storage, 1x ${requirements.gpu.model} ${requirements.gpu.ram} (${iface})`;
}

export function formatGpuCard(card) {
  return `${card.id}: ${formatRequirements(card.requirements)}`;
}

/** Deploy only as many parallel cards as free uact can fund at per-card deposit. */
export function scaleParallelCardsToBalance(cards, availableUact, perCardDeposit) {
  const affordableCount = Math.floor(availableUact / perCardDeposit);
  if (affordableCount >= cards.length) {
    return { cards, requiredEscrow: perCardDeposit * cards.length, scaled: false };
  }
  if (affordableCount >= 1) {
    const scaled = cards.slice(0, affordableCount);
    return {
      cards: scaled,
      requiredEscrow: perCardDeposit * scaled.length,
      scaled: true,
      skipped: cards.slice(affordableCount).map((card) => card.id),
    };
  }
  return { cards: cards.slice(0, 1), requiredEscrow: perCardDeposit, scaled: true, skipped: cards.slice(1).map((c) => c.id) };
}
