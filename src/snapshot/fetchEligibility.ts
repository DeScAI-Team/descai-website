import type { SnapshotClientConfig } from "./config";

const SNAPSHOT_MIN_USD = 15;

type BlockscoutTxRow = {
  from?: string;
  to?: string;
  value?: string;
  isError?: string;
};

type BlockscoutTxListJson = {
  status?: string;
  message?: string;
  result?: BlockscoutTxRow[] | string;
};

const weiSentToTreasury = (rows: BlockscoutTxRow[], donorLower: string, treasuryLower: string) => {
  let sum = 0n;
  for (const row of rows) {
    if (row.isError && row.isError !== "0") continue;
    const from = row.from?.toLowerCase();
    const to = row.to?.toLowerCase();
    if (from !== donorLower || to !== treasuryLower) continue;
    const raw = row.value ?? "0";
    try {
      sum += BigInt(raw);
    } catch {
      continue;
    }
  }
  return sum;
};

const fetchTxPage = async (indexerApiBase: string, donor: string, page: number, offset: number) => {
  const base = indexerApiBase.replace(/\/$/, "");
  const url = `${base}?module=account&action=txlist&address=${encodeURIComponent(donor)}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=asc`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Indexer request failed (${response.status}).`);
  }
  return (await response.json()) as BlockscoutTxListJson;
};

/** Paginates Blockscout-style `txlist` until a short page or cap. */
export const sumBaseEthWeiToTreasury = async (
  config: Pick<SnapshotClientConfig, "indexerApiBase" | "treasuryEth">,
  donorAddress: string
) => {
  const donorLower = donorAddress.toLowerCase();
  const treasuryLower = config.treasuryEth.toLowerCase();
  const offset = 1000;
  const maxPages = 30;
  let total = 0n;

  for (let page = 1; page <= maxPages; page += 1) {
    const payload = await fetchTxPage(config.indexerApiBase, donorAddress, page, offset);
    if (payload.status !== "1" || !Array.isArray(payload.result)) {
      const msg = typeof payload.result === "string" ? payload.result : payload.message;
      throw new Error(typeof msg === "string" && msg ? msg : "Unexpected indexer response.");
    }

    const rows = payload.result;
    total += weiSentToTreasury(rows, donorLower, treasuryLower);

    if (rows.length < offset) {
      break;
    }
  }

  return total;
};

type LlamaCoin = { price?: number };
type LlamaResponse = { coins?: Record<string, LlamaCoin> };

export const fetchEthUsd = async (defillamaBaseUrl: string) => {
  const base = defillamaBaseUrl.replace(/\/$/, "");
  const url = `${base}/prices/current/coingecko:ethereum`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Price request failed (${response.status}).`);
  }
  const body = (await response.json()) as LlamaResponse;
  const price = body.coins?.["coingecko:ethereum"]?.price;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error("Could not read ETH/USD price.");
  }
  return price;
};

export type EligibilityResult = {
  totalWei: bigint;
  totalUsd: number;
  eligible: boolean;
};

export const evaluateEligibility = async (
  config: SnapshotClientConfig,
  donorAddress: string
): Promise<EligibilityResult> => {
  const [totalWei, ethUsd] = await Promise.all([
    sumBaseEthWeiToTreasury(config, donorAddress),
    fetchEthUsd(config.defillamaBaseUrl)
  ]);

  const ethFloat = Number(totalWei) / 1e18;
  const totalUsd = ethFloat * ethUsd;
  const eligible = totalUsd > SNAPSHOT_MIN_USD;

  return { totalWei, totalUsd, eligible };
};
