import {
  featuredRatings,
  featuredStandouts,
  recentFeaturedResearch
} from "@/data/content";

const ratingColors: Record<string, string> = {
  Originality: "#ff4444",
  "Data Transparency": "#b546ff",
  Accuracy: "#ff6b2d",
  Clarity: "#3b8cff",
  Rigor: "#52ff92"
};
const FeaturedPanel = () => {
  const standoutCards = featuredStandouts;
  const marqueeItems = [...recentFeaturedResearch, ...recentFeaturedResearch];

  return (
    <section className="rounded-[36px] bg-gradient-to-br from-[#ff44ff] via-[#a14bff] to-[#3f2bff] p-[5px] shadow-[0_0_45px_rgba(255,68,255,0.35)]">
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#06051eea] px-10 py-12 text-white shadow-[0_25px_60px_rgba(1,0,22,0.75)]">
        <div className="absolute inset-0 -z-10 opacity-50">
          <div className="neon-blur left-1/3 top-6 translate-x-1/2 bg-[#ff6bd5]" />
          <div className="neon-blur left-1/4 top-1/2 bg-[#7b9dff]" />
        </div>

        <h2 className="mx-auto mb-8 max-w-md text-center font-display text-xl uppercase tracking-[0.3em] text-white drop-shadow-neon">
          Featured Research
        </h2>

      <article className="space-y-6 rounded-[28px] border border-white/5 bg-[#0c0d23] p-8 shadow-inner shadow-white/5">
        <header className="space-y-3">
          <h3 className="text-2xl font-semibold leading-tight">
            ARTAN Bio - Mutation-Specific Codon Suppression for Aging and Longevity
          </h3>
          <a
            className="text-plasma-cyan transition hover:text-white"
            href="https://www.vitadao.com/projects/artan-bio"
            target="_blank"
            rel="noreferrer"
          >
            https://www.vitadao.com/projects/artan-b...
          </a>
        </header>

        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <dt className="text-white/60">Platform</dt>
            <dd className="font-semibold">VitaDao</dd>
          </div>
          <div>
            <dt className="text-white/60">Field</dt>
            <dd className="font-semibold">Longevity</dd>
          </div>
          <div>
            <dt className="text-white/60">Stage</dt>
            <dd className="font-semibold">Lab Testing</dd>
          </div>
          <div>
            <dt className="text-white/60">Token</dt>
            <dd className="font-semibold">$VITARNA</dd>
          </div>
        </dl>

        <section className="space-y-3 text-sm leading-relaxed text-white/80">
          <h4 className="text-base uppercase tracking-[0.4em] text-white/70">Overview</h4>
          <p>
            ArtanBIO is exploring the promising field of gene therapies that could help address
            aging-related genetic factors. The company's approach aims to develop therapeutic
            candidates that could potentially suppress mutations that may drive aging. ARTAN is led
            by two entrepreneurs who have advanced drug development platforms into human trials.
          </p>
        </section>

        <div className="grid grid-cols-5 gap-4 justify-items-center">
          {featuredRatings.map(({ label, value }, index) => {
            const arcColor = ratingColors[label] ?? "#ff6bd5";
            const angle = value * 3.6;
            const columnPositions = [2, 4, 1, 3, 5];
            return (
              <div
                key={label}
                className="flex flex-col items-center gap-3 text-xs uppercase tracking-wide"
                style={{ gridColumn: `${columnPositions[index]} / span 1` }}
              >
                <span className="text-center text-white/70">
                  {label.replace("Data ", "").toUpperCase()}
                </span>
                <div
                  className="relative h-24 w-24 rounded-full"
                  style={{
                    background:
                      `radial-gradient(circle at center, #0c0d23 63%, transparent 64%), ` +
                      `conic-gradient(${arcColor} ${angle}deg, rgba(255,255,255,0.12) 0)`
                  }}
                >
                  <div className="absolute inset-[12px] flex flex-col items-center justify-center rounded-full bg-[#050410] text-lg font-semibold text-white">
                    {value}
                    <span className="text-[0.65rem] font-normal text-white/60">%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </article>

        <article className="mt-8 rounded-[28px] border border-white/10 bg-[#08081e] p-6 text-white/80 shadow-inner shadow-white/5">
          <div className="space-y-6 md:flex md:flex-nowrap md:gap-6 md:space-y-0">
            {standoutCards[0] && (
              <div className="flex min-w-0 flex-1">
                <StandoutCard standout={standoutCards[0]} />
              </div>
            )}

            <div className="flex min-w-0 flex-[1.2] flex-col justify-center rounded-[24px] border border-white/10 bg-[#0d0f26] px-6 py-5 text-center text-sm text-white/70 md:border-x md:border-white/20">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Featured</p>
              <div className="mt-4 h-28 overflow-hidden">
                <div className="featured-scroll space-y-2">
                  {marqueeItems.map(({ title, score }, index) => (
                    <div
                      key={`${title}-${index}`}
                      className="flex items-center justify-between text-left font-semibold tracking-[0.2em] text-white/60"
                    >
                      <span className="truncate pr-3 text-white/80">{title}</span>
                      <span className="text-white">{score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {standoutCards[1] && (
              <div className="flex min-w-0 flex-1">
                <StandoutCard standout={standoutCards[1]} />
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
};

const StandoutCard = ({
  standout
}: {
  standout: (typeof featuredStandouts)[number];
}) => {
  return (
    <div className="flex h-full w-full flex-col items-center rounded-[24px] border border-white/10 bg-[#0f1028] px-6 py-5 text-center text-white shadow-[inset_0_0_30px_rgba(255,255,255,0.04)]">
      <p className="text-xs uppercase tracking-[0.35em] text-white/60">{standout.title}</p>
      <div className="mt-4 text-5xl font-semibold text-white">{standout.score}</div>
      <p className="mt-2 text-sm font-semibold text-white/80">{standout.platform}</p>
      <p className="text-xs text-white/60">{standout.date}</p>
    </div>
  );
};

export default FeaturedPanel;
