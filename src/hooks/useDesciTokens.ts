import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DiscoveredToken, TokenMarketSnapshot, TokenWithMarketData } from "@/types/token";
import { getCachedMarketSnapshots, getDiscoveredTokens, mergeTokensWithMarket, pickRotationChunk, refreshSnapshots } from "@/services/desciTokens";

type UseDesciTokensOptions = {
  mode: "home" | "all";
  prioritizedCoinKeys?: string[];
  rotationBatchSize?: number;
};

type UseDesciTokensResult = {
  tokens: TokenWithMarketData[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshNow: () => Promise<void>;
  lastMarketUpdate: number | null;
};

const REFRESH_INTERVAL_MS = 60_000;

const snapshotsTimestamp = (snapshots: Record<string, TokenMarketSnapshot>): number | null => {
  const timestamps = Object.values(snapshots).map((snapshot) => snapshot.timestampMs);
  if (!timestamps.length) return null;
  return Math.max(...timestamps);
};

const marketPriority = (token: DiscoveredToken, snapshots: Record<string, TokenMarketSnapshot>) => {
  const snapshot = token.coinKey ? snapshots[token.coinKey] : undefined;
  return (
    snapshot?.fdv ??
    snapshot?.marketCap ??
    token.marketSeed?.fdv ??
    token.marketSeed?.marketCap ??
    snapshot?.price ??
    token.marketSeed?.price ??
    -1
  );
};

export const useDesciTokens = ({
  mode,
  prioritizedCoinKeys = [],
  rotationBatchSize = 60
}: UseDesciTokensOptions): UseDesciTokensResult => {
  const [discovered, setDiscovered] = useState<DiscoveredToken[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, TokenMarketSnapshot>>(() => getCachedMarketSnapshots());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => snapshotsTimestamp(getCachedMarketSnapshots()));

  const discoveredRef = useRef<DiscoveredToken[]>([]);
  const snapshotsRef = useRef<Record<string, TokenMarketSnapshot>>(snapshots);

  useEffect(() => {
    discoveredRef.current = discovered;
  }, [discovered]);

  useEffect(() => {
    snapshotsRef.current = snapshots;
  }, [snapshots]);

  const selectHomeTargets = useCallback(
    (tokens: DiscoveredToken[]) => {
      return [...tokens]
        .sort((left, right) => marketPriority(right, snapshotsRef.current) - marketPriority(left, snapshotsRef.current))
        .slice(0, 24);
    },
    []
  );

  const buildRefreshTargets = useCallback((): DiscoveredToken[] => {
    const tokens = discoveredRef.current;
    if (!tokens.length) return [];

    const prioritized = new Set(prioritizedCoinKeys);
    const prioritizedTokens = tokens.filter((token) => token.coinKey && prioritized.has(token.coinKey));

    if (mode === "all") {
      const rotation = pickRotationChunk(tokens, rotationBatchSize);
      const merged = new Map<string, DiscoveredToken>();
      for (const token of [...prioritizedTokens, ...rotation]) {
        merged.set(token.coinKey ?? token.id, token);
      }
      return Array.from(merged.values());
    }

    const homeTargets = selectHomeTargets(tokens);
    const merged = new Map<string, DiscoveredToken>();
    for (const token of [...prioritizedTokens, ...homeTargets]) {
      merged.set(token.coinKey ?? token.id, token);
    }
    return Array.from(merged.values());
  }, [mode, prioritizedCoinKeys, rotationBatchSize, selectHomeTargets]);

  const refreshNow = useCallback(async () => {
    const targets = mode === "all" ? discoveredRef.current : buildRefreshTargets();
    if (!targets.length) return;
    setRefreshing(true);
    try {
      const merged = await refreshSnapshots(targets, snapshotsRef.current);
      setSnapshots(merged);
      setLastSyncAt(Date.now());
      setError(null);
    } catch (refreshError) {
      setError((refreshError as Error).message || "Token refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [buildRefreshTargets, mode]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      setLoading(true);
      setError(null);

      try {
        const tokens = await getDiscoveredTokens(false);
        if (cancelled) return;
        setDiscovered(tokens);

        const initialTargets = mode === "all" ? tokens : selectHomeTargets(tokens);
        if (initialTargets.length) {
          const merged = await refreshSnapshots(initialTargets, snapshotsRef.current);
          if (!cancelled) {
            setSnapshots(merged);
            setLastSyncAt(Date.now());
          }
        } else if (!cancelled) {
          setLastSyncAt(Date.now());
        }
      } catch (bootError) {
        if (!cancelled) {
          setError((bootError as Error).message || "Failed to load DeSci tokens");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [mode, selectHomeTargets]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const targets = buildRefreshTargets();
      if (!targets.length) return;
      void refreshSnapshots(targets, snapshotsRef.current)
        .then((merged) => {
          setSnapshots(merged);
          setLastSyncAt(Date.now());
        })
        .catch((intervalError) => {
          setError((intervalError as Error).message || "Periodic token refresh failed");
        });
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [buildRefreshTargets]);

  const tokens = useMemo<TokenWithMarketData[]>(
    () => mergeTokensWithMarket(discovered, snapshots),
    [discovered, snapshots]
  );

  return {
    tokens,
    loading,
    refreshing,
    error,
    refreshNow,
    lastMarketUpdate: lastSyncAt ?? snapshotsTimestamp(snapshots)
  };
};
