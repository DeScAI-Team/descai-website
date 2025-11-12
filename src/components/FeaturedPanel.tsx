import { featuredHighlights, featuredRatings } from "@/data/content";
import clsx from "clsx";

const FeaturedPanel = () => {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#06051eea] px-10 py-12 text-white shadow-[0_25px_60px_rgba(1,0,22,0.75)]">
      <div className="absolute inset-0 -z-10 opacity-50">
        <div className="neon-blur left-1/3 top-6 translate-x-1/2 bg-[#ff6bd5]" />
        <div className="neon-blur left-1/4 top-1/2 bg-[#7b9dff]" />
      </div>

      <h2 className="mb-8 text-center font-display text-xl uppercase tracking-[0.5em] text-white drop-shadow-neon">
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

        <div className="grid gap-4 md:grid-cols-5">
          {featuredRatings.map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-xs uppercase tracking-wide">
              <span>{label}</span>
              <div
                className={clsx(
                  "grid h-20 w-20 place-items-center rounded-full border border-white/10 text-lg font-semibold",
                  "bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18),transparent_60%)]"
                )}
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 60%), " +
                    `conic-gradient(#ff74f4 ${value * 0.01 * 360}deg, rgba(255,255,255,0.08) 0)`
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Featured</p>
          <ul className="mt-2 space-y-1 text-white/80">
            {featuredHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </article>
    </section>
  );
};

export default FeaturedPanel;
