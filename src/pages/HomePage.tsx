import FeaturedPanel from "@/components/FeaturedPanel";
import InsightsPanel from "@/components/InsightsPanel";
import Navbar from "@/components/Navbar";
import PlatformPanel from "@/components/PlatformPanel";
import TokenPanel from "@/components/TokenPanel";
import Footer from "@/components/Footer";

const HomePage = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-midnight px-4 py-10 text-white">
      <div className="gradient-bg pointer-events-none" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <div className="relative z-10 flex flex-col items-center gap-10">
        <Navbar />

        <main className="grid w-full max-w-6xl gap-6 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
          <PlatformPanel />
          <div className="flex flex-col gap-6">
            <FeaturedPanel />
            <TokenPanel />
          </div>
          <InsightsPanel />
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default HomePage;
