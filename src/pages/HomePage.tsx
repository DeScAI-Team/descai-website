import { useEffect, useState } from "react";
import clsx from "clsx";
import { useSearchParams } from "react-router-dom";
import { fetchReviewIndex } from "@/api/arweaveLoader";
import {
  fetchOverviewSidebarsFromArweave,
  getOverviewAgentAddress,
  type OverviewArticleRef,
  type OverviewPlatformGroup
} from "@/api/fetchOverviewSidebarsFromArweave";
import FeaturedPanel from "@/components/FeaturedPanel";
import Navbar from "@/components/Navbar";
import TokenPanel from "@/components/TokenPanel";
import Footer from "@/components/Footer";
import SnapshotsAside from "@/snapshot/SnapshotsAside";
import SnapshotsAccessView from "@/snapshot/SnapshotsAccessView";
import HomeArweaveInsightsPanel from "@/pages/home/HomeArweaveInsightsPanel";
import HomeArweavePlatformPanel from "@/pages/home/HomeArweavePlatformPanel";
import TermsDisclaimerModal from "@/components/TermsDisclaimerModal";

const HomePage = () => {
  const [searchParams] = useSearchParams();
  const snapshotsMode = searchParams.get("snapshots") === "1";

  const [featuredTxids, setFeaturedTxids] = useState<string[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState<string | null>(null);

  const [overviewPlatformGroups, setOverviewPlatformGroups] = useState<OverviewPlatformGroup[]>([]);
  const [overviewLatest, setOverviewLatest] = useState<OverviewArticleRef[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(() => Boolean(getOverviewAgentAddress()));
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const overviewAgentAddress = getOverviewAgentAddress();
  const overviewEmptyHint = overviewAgentAddress
    ? undefined
    : "Set ARWEAVE_WALLET_ADDRESS in .env to load doctype:overview items from Arweave.";

  useEffect(() => {
    let cancelled = false;

    const loadFeaturedTxids = async () => {
      setFeaturedLoading(true);
      setFeaturedError(null);

      try {
        const { featuredTxids: rankedTxids } = await fetchReviewIndex();
        if (!cancelled) {
          setFeaturedTxids(rankedTxids);
        }
      } catch (error) {
        if (!cancelled) {
          setFeaturedTxids([]);
          setFeaturedError((error as Error).message || "Failed to load featured research index");
        }
      } finally {
        if (!cancelled) {
          setFeaturedLoading(false);
        }
      }
    };

    void loadFeaturedTxids();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!overviewAgentAddress) {
      setOverviewPlatformGroups([]);
      setOverviewLatest([]);
      setOverviewLoading(false);
      setOverviewError(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadOverviews = async () => {
      setOverviewLoading(true);
      setOverviewError(null);

      try {
        const { platformGroups, latest } = await fetchOverviewSidebarsFromArweave(
          overviewAgentAddress,
          controller.signal
        );
        if (!cancelled) {
          setOverviewPlatformGroups(platformGroups);
          setOverviewLatest(latest);
        }
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }
        if (!cancelled) {
          setOverviewPlatformGroups([]);
          setOverviewLatest([]);
          setOverviewError((error as Error).message || "Failed to load overview sidebars");
        }
      } finally {
        if (!cancelled) {
          setOverviewLoading(false);
        }
      }
    };

    void loadOverviews();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [overviewAgentAddress]);

  return (
    <div
      className={clsx(
        "relative min-h-screen bg-midnight text-white",
        snapshotsMode ? "overflow-visible" : "overflow-hidden"
      )}
    >
      <TermsDisclaimerModal />

      <div className="gradient-bg pointer-events-none" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <div className="relative z-10 px-4 pb-10 pt-4 lg:px-6 lg:pb-12 lg:pt-0">
        <div className="sticky top-0 z-50 -mx-4 border-b border-[#263f72]/60 bg-[#050914]/88 px-4 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-xl lg:-mx-6 lg:px-6">
          <div className="mx-auto flex w-full justify-center">
            <Navbar />
          </div>
        </div>

        {snapshotsMode ? (
          <main className="mt-6 flex w-full justify-center px-0 lg:px-4">
            <SnapshotsAccessView />
          </main>
        ) : (
          <main className="mt-6 grid w-full justify-center gap-6 lg:grid-cols-[308px_minmax(0,1032px)_308px] lg:items-start">
            <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
              <HomeArweavePlatformPanel
                className="w-full"
                groups={overviewPlatformGroups}
                loading={overviewLoading}
                error={overviewError}
                emptyHint={overviewEmptyHint}
              />
              <SnapshotsAside />
            </aside>

            <div className="min-w-0">
              <div className="mx-auto flex w-full max-w-[1032px] flex-col gap-6">
                <FeaturedPanel
                  featuredTxids={featuredTxids}
                  sourceLoading={featuredLoading}
                  sourceError={featuredError}
                />
                <TokenPanel />
              </div>
            </div>

            <aside className="lg:sticky lg:top-20 lg:self-start">
              <HomeArweaveInsightsPanel
                items={overviewLatest}
                loading={overviewLoading}
                error={overviewError}
                emptyHint={overviewEmptyHint}
              />
            </aside>
          </main>
        )}

        <div className="mx-auto mt-6 w-full">
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
