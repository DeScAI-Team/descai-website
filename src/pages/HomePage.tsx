import FeaturedPanel from "@/components/FeaturedPanel";
import InsightsPanel from "@/components/InsightsPanel";
import Navbar from "@/components/Navbar";
import PlatformPanel from "@/components/PlatformPanel";
import SnapshotsPanel from "@/components/SnapshotsPanel";
import TokenPanel from "@/components/TokenPanel";
import Footer from "@/components/Footer";

const HomePage = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-base px-4 py-8 text-content-primary">
      <div className="gradient-bg pointer-events-none" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <Navbar />

        <main className="grid w-full max-w-6xl gap-5 lg:grid-cols-[240px_minmax(0,1fr)_240px]">
          {/* Left sidebar */}
          <div className="flex h-full w-full flex-col items-stretch gap-5 lg:min-h-0">
            <div className="flex w-full">
              <PlatformPanel className="h-full w-full" />
            </div>
            <SnapshotsPanel />
          </div>

          {/* Main content */}
          <div className="flex flex-col gap-5">
            <FeaturedPanel />
            <TokenPanel />
          </div>

          {/* Right rail */}
          <InsightsPanel />
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default HomePage;
