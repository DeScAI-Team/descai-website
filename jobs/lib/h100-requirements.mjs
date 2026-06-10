/** SDL resource profile used by jobs/deploy-test.mjs */
export const DEPLOY_REQUIREMENTS = {
  cpuUnits: 38,
  memoryGb: 64,
  storageGi: 128,
  gpu: {
    vendor: "nvidia",
    model: "h100",
    ram: "80Gi",
    interface: "sxm",
  },
};

const CONSOLE_API = "https://console-api.akash.network/v1/providers";
const GPU_PRICES_API = "https://console-api.akash.network/v1/gpu-prices";

export function normalizeInterface(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** SDL `sxm` should match provider listings like SXM5 on the marketplace. */
export function interfacesCompatible(requested, offered) {
  const req = normalizeInterface(requested);
  const off = normalizeInterface(offered);
  if (!req) return true;
  if (!off) return false;
  if (req === off) return true;
  if (req === "sxm" && (off === "sxm5" || off === "sxm4" || off === "sxm")) return true;
  if (req === "pcie" && off === "pcie") return true;
  return false;
}

export function parseMemoryGiB(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 0;
  return bytes / 1024 ** 3;
}

/** CPU stats from Console API are in millicores (1000 = 1 CPU). */
export function parseCpuCores(millicores) {
  if (!Number.isFinite(millicores) || millicores <= 0) return 0;
  return millicores / 1000;
}

export function matchingGpuModels(gpuModels = [], model = "h100") {
  const pattern = new RegExp(model, "i");
  return gpuModels.filter((gpu) => pattern.test(gpu.model ?? ""));
}

export function h100GpuModels(gpuModels = []) {
  return matchingGpuModels(gpuModels, "h100");
}

export function gpuMatchesRequirements(gpu, requirements = DEPLOY_REQUIREMENTS.gpu) {
  if (!gpu || !requirements.model) return false;
  if (!new RegExp(requirements.model, "i").test(gpu.model ?? "")) return false;
  if (requirements.ram && gpu.ram && gpu.ram !== requirements.ram) return false;
  if (requirements.interface && !interfacesCompatible(requirements.interface, gpu.interface)) {
    return false;
  }
  return true;
}

export function providerAttribute(provider, key) {
  return provider.attributes?.find((entry) => entry.key === key)?.value ?? null;
}

export function evaluateProvider(provider, requirements = DEPLOY_REQUIREMENTS) {
  const model = requirements.gpu?.model ?? "h100";
  const h100Models = matchingGpuModels(provider.gpuModels, model);
  const matchingGpus = h100Models.filter((gpu) => gpuMatchesRequirements(gpu, requirements.gpu));
  const gpuAvailable = provider.stats?.gpu?.available ?? 0;
  const cpuAvailable = parseCpuCores(provider.stats?.cpu?.available ?? 0);
  const memoryGiBAvailable = parseMemoryGiB(provider.stats?.memory?.available ?? 0);
  const storageGiBAvailable = parseMemoryGiB(
    provider.stats?.storage?.ephemeral?.available ?? provider.stats?.storage?.total?.available ?? 0
  );

  const blockers = [];
  if (!provider.isOnline) blockers.push("offline");
  if (h100Models.length === 0) blockers.push("no-h100-inventory");
  if (matchingGpus.length === 0 && h100Models.length > 0) {
    blockers.push(`gpu-mismatch (${h100Models.map((g) => g.interface ?? "?").join(", ")})`);
  }
  if (gpuAvailable < 1) blockers.push("no-gpu-available");
  if (cpuAvailable < requirements.cpuUnits) {
    blockers.push(`cpu (${cpuAvailable.toFixed(0)}/${requirements.cpuUnits})`);
  }
  if (memoryGiBAvailable < requirements.memoryGb) {
    blockers.push(`memory (${memoryGiBAvailable.toFixed(0)}/${requirements.memoryGb} GiB)`);
  }
  if (storageGiBAvailable < requirements.storageGi) {
    blockers.push(`storage (${storageGiBAvailable.toFixed(0)}/${requirements.storageGi} GiB)`);
  }

  return {
    owner: provider.owner,
    hostUri: provider.hostUri ?? null,
    organization: providerAttribute(provider, "organization"),
    country: providerAttribute(provider, "country"),
    city: providerAttribute(provider, "city"),
    isOnline: Boolean(provider.isOnline),
    h100Models,
    matchingGpus,
    gpuAvailable,
    cpuAvailable,
    memoryGiBAvailable,
    storageGiBAvailable,
    canFulfill: blockers.length === 0,
    blockers,
  };
}

export async function fetchAkashProviders() {
  const response = await fetch(CONSOLE_API);
  if (!response.ok) {
    throw new Error(`Console API ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function fetchH100GpuPrices() {
  const response = await fetch(GPU_PRICES_API);
  if (!response.ok) {
    throw new Error(`GPU prices API ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return (data.models ?? []).filter((model) => /h100/i.test(model.model ?? ""));
}

export function uactPerBlockFromUsdPerHour(usdPerHour, blocksPerHour = 600) {
  return Math.max(1, Math.floor((usdPerHour * 1_000_000) / blocksPerHour));
}

export function summarizeH100Availability(providers, requirements = DEPLOY_REQUIREMENTS) {
  const onlineH100 = providers.filter(
    (provider) => provider.isOnline && h100GpuModels(provider.gpuModels).length > 0
  );
  const evaluated = onlineH100.map((provider) => evaluateProvider(provider, requirements));
  const withGpu = evaluated.filter((row) => row.gpuAvailable > 0);
  const canFulfill = evaluated.filter((row) => row.canFulfill);

  const interfaceCounts = {};
  for (const provider of onlineH100) {
    for (const gpu of h100GpuModels(provider.gpuModels)) {
      const iface = gpu.interface ?? "unknown";
      interfaceCounts[iface] = (interfaceCounts[iface] ?? 0) + 1;
    }
  }

  return {
    scannedAt: new Date().toISOString(),
    requirements,
    perNodeWarning:
      requirements.cpuUnits > 24
        ? `${requirements.cpuUnits} CPU is checked against datacenter totals, not per-GPU node bundles — high CPU can block bids even when providers look READY.`
        : null,
    totals: {
      providersOnline: providers.filter((p) => p.isOnline).length,
      h100ProvidersOnline: onlineH100.length,
      h100WithAvailableGpu: withGpu.length,
      h100CanFulfillDeploy: canFulfill.length,
      h100GpusAvailable: withGpu.reduce((sum, row) => sum + row.gpuAvailable, 0),
    },
    interfaceCounts,
    providers: evaluated.sort((a, b) => Number(b.canFulfill) - Number(a.canFulfill)),
    canFulfill,
  };
}
