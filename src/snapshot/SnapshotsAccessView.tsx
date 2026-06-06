import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { useWallet } from "@/context/WalletContext";
import { getSnapshotClientConfig, isSnapshotConfigComplete } from "./config";
import { ensureBaseChain } from "./ensureBaseChain";
import { evaluateEligibility, type EligibilityResult } from "./fetchEligibility";
import { BASE_CHAIN_ID_HEX, getMetaMaskProvider, readChainIdHex } from "./ethereumProvider";

const formatUsd = (value: number) =>
  value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const formatEth = (wei: bigint) => {
  const eth = Number(wei) / 1e18;
  return eth.toLocaleString(undefined, { maximumFractionDigits: 6 });
};

const truncateMiddle = (value: string, lead = 8, tail = 6) => {
  if (value.length <= lead + tail + 3) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
};

const CopyRow = ({ label, address }: { label: string; address: string }) => {
  const [copied, setCopied] = useState(false);
  const hasAddress = Boolean(address);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-3 rounded-[14px] border border-[#263f72]/60 bg-[#0b1835]/40 px-4 py-3 text-left sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">{label}</p>
        <p
          className={clsx(
            "mt-1 break-all font-mono text-[0.8rem]",
            hasAddress ? "text-[#c8ddff]" : "text-white/45"
          )}
          title={hasAddress ? address : undefined}
        >
          {hasAddress ? truncateMiddle(address) : "Not configured — set addresses in .env (see .env.example)."}
        </p>
      </div>
      <button
        type="button"
        disabled={!hasAddress}
        onClick={() => void handleCopy()}
        className="shrink-0 self-center rounded-full border border-[#35538a]/80 bg-[#13244c] px-3 py-1.5 text-xs font-semibold text-[#d5ebff] transition hover:bg-[#1a2f5a] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#13244c]"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
};

type CheckPhase = "idle" | "chain" | "eligibility";

const SnapshotsAccessView = () => {
  const { address, walletType, connect, error: walletError, clearError } = useWallet();
  const config = useMemo(() => getSnapshotClientConfig(), []);
  const configOk = useMemo(() => isSnapshotConfigComplete(config), [config]);

  const [phase, setPhase] = useState<CheckPhase>("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [checkedDonor, setCheckedDonor] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runEligibilityForAddress = useCallback(
    async (donor: string) => {
      if (!configOk) return;
      setPhase("eligibility");
      setActionError(null);
      setCheckedDonor(donor);
      try {
        const result = await evaluateEligibility(config, donor);
        setEligibility(result);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Eligibility check failed.");
        setEligibility(null);
        setCheckedDonor(null);
      } finally {
        setPhase("idle");
      }
    },
    [config, configOk]
  );

  const runChainThenEligibilityForAddress = useCallback(
    async (donor: string) => {
      if (!configOk) return;
      setActionError(null);
      setEligibility(null);
      setCheckedDonor(null);
      setPhase("chain");
      try {
        await ensureBaseChain(config.rpcUrl);
        const chainId = await readChainIdHex();
        if (chainId !== BASE_CHAIN_ID_HEX) {
          throw new Error("Wallet is not on Base. Switch to Base and try again.");
        }
        await runEligibilityForAddress(donor);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Something went wrong.");
        setPhase("idle");
      }
    },
    [config.rpcUrl, configOk, runEligibilityForAddress]
  );

  useEffect(() => {
    if (!configOk || walletType !== "metamask" || !address) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const run = async () => {
      try {
        await ensureBaseChain(config.rpcUrl);
        if (controller.signal.aborted) return;
        const chainId = await readChainIdHex();
        if (controller.signal.aborted) return;
        if (chainId !== BASE_CHAIN_ID_HEX) {
          setActionError("Wallet is not on Base. Switch to Base and try again.");
          setEligibility(null);
          setCheckedDonor(null);
          return;
        }
        setPhase("eligibility");
        setActionError(null);
        setCheckedDonor(address);
        const result = await evaluateEligibility(config, address);
        if (controller.signal.aborted) return;
        setEligibility(result);
      } catch (err) {
        if (!controller.signal.aborted) {
          setActionError(err instanceof Error ? err.message : "Eligibility check failed.");
          setEligibility(null);
          setCheckedDonor(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setPhase("idle");
        }
      }
    };

    void run();

    const provider = getMetaMaskProvider();
    const onChainChanged = () => {
      void run();
    };
    provider?.on?.("chainChanged", onChainChanged);

    return () => {
      controller.abort();
      provider?.removeListener?.("chainChanged", onChainChanged);
    };
  }, [address, config, configOk, walletType]);

  useEffect(() => {
    if (walletType !== "metamask") {
      setEligibility(null);
      setCheckedDonor(null);
    }
  }, [walletType]);

  const handleAccessSnapshot = async () => {
    clearError();
    setActionError(null);
    if (!configOk) {
      setActionError("Snapshot access is not configured. Set the VITE_SNAPSHOT_* variables (see src/snapshot/README.md).");
      return;
    }

    try {
      await connect("metamask");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not connect MetaMask.");
      return;
    }

    const provider = getMetaMaskProvider();
    if (!provider) {
      setActionError("MetaMask is not installed.");
      return;
    }

    let donor: string | null = null;
    try {
      const accounts = await provider.request<string[]>({ method: "eth_accounts" });
      donor = accounts?.[0] ?? null;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not read MetaMask account.");
      return;
    }

    if (!donor) {
      setActionError("No MetaMask account is available.");
      return;
    }

    await runChainThenEligibilityForAddress(donor);
  };

  const busy = phase !== "idle";

  const accessCardExpanded = Boolean(
    (checkedDonor && walletType === "metamask") ||
      walletError ||
      actionError ||
      (walletType && walletType !== "metamask")
  );

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-8 pb-8 pt-2">
      <div className="relative">
        <Link
          to="/"
          className="absolute left-0 top-0.5 z-10 text-xs font-semibold uppercase tracking-[0.2em] text-[#9fc3ff] transition hover:text-white"
          style={{
            transform: "translateX(calc(50px - min(33vw, max(0px, (100vw - 40rem) / 2 - 1rem))))"
          }}
        >
          ← Back to home
        </Link>
        <div className="text-center">
          <h1 className="neon-heading text-lg">Snapshots</h1>
          <span className="neon-underline mx-auto mt-2 block max-w-[200px]" />
        </div>
        <p className="mt-4 text-center text-sm leading-relaxed text-white/75">
          To access snapshots, connect a Base wallet with adequate donation history using MetaMask.
        </p>
      </div>

      <div className="flex w-full flex-col items-center">
        <article
          className={clsx(
            "w-full rounded-[23px] border border-[#263f72] bg-[#071126]/92 p-4 text-center shadow-[inset_0_1px_0_rgba(80,126,205,0.12)] sm:p-5",
            accessCardExpanded ? "max-w-[640px]" : "max-w-sm"
          )}
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleAccessSnapshot()}
            className="flex w-full items-center justify-center rounded-[18px] border border-[#35538a]/70 bg-[#0d1a38] py-4 text-base font-semibold tracking-wide text-white shadow-[inset_0_1px_0_rgba(80,126,205,0.15)] transition hover:border-[#74b6ff]/40 hover:bg-[#13244c] disabled:cursor-wait disabled:opacity-70 sm:py-5"
          >
            {busy ? (phase === "chain" ? "Switching to Base…" : "Checking…") : "Access snapshot"}
          </button>

          {walletType && walletType !== "metamask" && (
            <p className="mt-4 text-xs text-amber-100/90">
              Snapshot verification uses MetaMask on Base. Connect MetaMask (Base ETH) to continue; other wallets support
              the site but do not unlock this check.
            </p>
          )}

          {(walletError || actionError) && (
            <p className="mt-4 rounded-[12px] bg-amber-500/10 px-3 py-2 text-xs text-amber-100">{walletError || actionError}</p>
          )}

          {checkedDonor && walletType === "metamask" && (
            <div className="mt-6 space-y-3 text-left text-sm text-white/80">
              <p>
                Checking wallet:{" "}
                <span className="font-mono text-white" title={checkedDonor}>
                  {truncateMiddle(checkedDonor)}
                </span>
              </p>
              {eligibility ? (
                <p>
                  Recorded to treasury: <span className="font-mono text-white">{formatUsd(eligibility.totalUsd)}</span>{" "}
                  ({formatEth(eligibility.totalWei)} ETH, cumulative outgoing Base ETH transfers).
                </p>
              ) : busy ? (
                <p className="text-white/60">Loading donation history…</p>
              ) : null}
              {eligibility?.eligible ? (
                <a
                  href={config.snapshotBucket}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#74b6ff]/35 bg-gradient-to-br from-[#4c91ff] to-[#7f35df] px-4 py-3 text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(66,119,255,0.28)] transition hover:brightness-110"
                >
                  Open snapshots
                  <span aria-hidden className="text-white/80">
                    ↗
                  </span>
                </a>
              ) : eligibility ? (
                <p className="text-white/70">
                  Send more than {formatUsd(15)} worth of Base ETH to the treasury address below to unlock access.
                  {eligibility.totalUsd === 0 ? (
                    <>
                      {" "}
                      If you already donated, confirm MetaMask is on the same account that sent the transfer.
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          )}
        </article>
      </div>

      <section
        className={clsx(
          "w-full rounded-[24px] border border-[#263e6c] bg-[linear-gradient(145deg,rgba(29,45,92,0.9),rgba(6,12,30,0.96))] p-[1px] shadow-[0_20px_58px_rgba(1,4,18,0.65),0_0_28px_rgba(68,121,214,0.12)]"
        )}
      >
        <article className="rounded-[23px] border border-[#263f72] bg-[#071126]/92 p-6 text-sm leading-relaxed text-white/80 shadow-[inset_0_1px_0_rgba(80,126,205,0.12)]">
          <div className="text-center">
            <p className="neon-heading text-[0.95rem]">Donations</p>
            <span className="neon-underline mx-auto mt-2 block max-w-[160px]" />
          </div>
          <p className="mt-4 text-center text-white/75">
            Keep the descai agent running with a donation and access all data ingested by the crawler and used to formulate
            reviews!
          </p>
          <p className="mt-3 rounded-[12px] border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-center text-xs text-amber-100/95">
            Only cumulative Base ETH donations above {formatUsd(15)} to the treasury address unlock snapshot access.
            Arweave and Akash tips support the project but do not satisfy the on-chain Base ETH gate.
          </p>
          <div className="mt-6 space-y-3">
            <CopyRow label="Base ETH (treasury)" address={config.treasuryEth} />
            <CopyRow label="Arweave" address={config.arweaveDonation} />
            <CopyRow label="Akash (AKT)" address={config.aktDonation} />
          </div>
        </article>
      </section>
    </div>
  );
};

export default SnapshotsAccessView;
