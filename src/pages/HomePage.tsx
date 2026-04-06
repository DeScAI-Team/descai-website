import { useEffect, useState } from "react";
import { fetchReviewIndex } from "@/api/arweaveLoader";
import FeaturedPanel from "@/components/FeaturedPanel";
import InsightsPanel from "@/components/InsightsPanel";
import Navbar from "@/components/Navbar";
import PlatformPanel from "@/components/PlatformPanel";
import SnapshotsPanel from "@/components/SnapshotsPanel";
import TokenPanel from "@/components/TokenPanel";
import Footer from "@/components/Footer";

const HomePage = () => {
  const [featuredTxids, setFeaturedTxids] = useState<string[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState<string | null>(null);

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-midnight text-white">
      <div className="gradient-bg pointer-events-none" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <div className="relative z-10 px-4 pb-10 pt-4 lg:px-6 lg:pb-12 lg:pt-0">
        <div className="sticky top-0 z-50 -mx-4 bg-midnight/92 px-4 py-4 backdrop-blur lg:-mx-6 lg:px-6">
          <div className="mx-auto flex w-full justify-center">
            <Navbar />
          </div>
        </div>

        <main className="mt-6 grid w-full gap-6 lg:grid-cols-[280px_minmax(0,1fr)_280px] lg:items-start">
          <aside className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
            <PlatformPanel className="w-full" />
            <SnapshotsPanel />
          </aside>

          <div className="min-w-0">
            <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6">
              <FeaturedPanel
                featuredTxids={featuredTxids}
                sourceLoading={featuredLoading}
                sourceError={featuredError}
              />
              <TokenPanel />
              <Footer />
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <InsightsPanel />
          </aside>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
