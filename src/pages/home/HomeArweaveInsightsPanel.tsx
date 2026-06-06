import type { OverviewArticleRef } from "@/api/fetchOverviewSidebarsFromArweave";

type HomeArweaveInsightsPanelProps = {
  items: OverviewArticleRef[];
  loading: boolean;
  error: string | null;
  emptyHint?: string;
  latestLimit?: number;
};

const publishedFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
});

const formatPublishedAt = (iso: string) => publishedFormatter.format(new Date(iso));

const HomeArweaveInsightsPanel = ({
  items,
  loading,
  error,
  emptyHint,
  latestLimit = 6
}: HomeArweaveInsightsPanelProps) => {
  const visible = items.slice(0, latestLimit);

  return (
    <section className="flex flex-col gap-6">
      <article className="rounded-[20px] border border-[#2a4580]/85 bg-[linear-gradient(148deg,rgba(32,52,102,0.88),rgba(7,12,28,0.98))] p-px shadow-[0_16px_44px_rgba(1,4,18,0.55),0_0_20px_rgba(68,121,214,0.1)]">
        <div className="rounded-[19px] border border-[#2f4a82]/90 bg-[#060f22]/95 px-3 pt-4 pb-6 shadow-[inset_0_1px_0_rgba(88,132,210,0.1)]">
          <div className="text-center">
            <p className="neon-heading">Latest</p>
            <span className="neon-underline" />
          </div>

          {loading && <p className="mt-4 text-center text-[0.875rem] text-white/60">Loading latest…</p>}
          {error && <p className="mt-4 text-center text-[0.875rem] text-rose-300/90">{error}</p>}
          {!loading && !error && visible.length === 0 && (
            <p className="mt-4 text-center text-[0.875rem] text-white/60">{emptyHint ?? "No overview items yet."}</p>
          )}

          <div className="mt-3 divide-y divide-[#1a2d55]/90 overflow-hidden rounded-[10px] border border-[#1e3560]/95 bg-[linear-gradient(180deg,rgba(10,22,45,0.78),rgba(5,11,24,0.88))] text-[0.8125rem] text-white/85">
            {visible.map((news) => (
              <article key={news.txid} className="flex flex-col gap-2.5 px-3 py-4">
                <header>
                  <p className="line-clamp-2 text-[0.875rem] font-semibold leading-snug tracking-wide text-[#b6cffc]">
                    {news.title}
                  </p>
                </header>
                <a
                  href={news.articleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-left text-[0.75rem] font-semibold tracking-wide text-[#7ea8ff] underline decoration-[#3d5ea3]/80 underline-offset-[4px] transition hover:text-[#a8c4ff] hover:decoration-[#6b8fd6]"
                >
                  Read Review...
                </a>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-[4px] border border-[#3d5694]/55 bg-[#0a1428]/90 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#9eb6ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    {`platform: ${news.platform}`}
                  </span>
                  {news.category ? (
                    <span className="inline-flex items-center rounded-[4px] border border-[#3d5694]/55 bg-[#0a1428]/90 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#9eb6ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      {`category: ${news.category}`}
                    </span>
                  ) : null}
                </div>
                {news.publishedAtIso ? (
                  <time
                    dateTime={news.publishedAtIso}
                    className="mt-1 font-display text-[0.68rem] font-semibold tracking-[0.12em] text-white/72"
                  >
                    {formatPublishedAt(news.publishedAtIso)}
                  </time>
                ) : (
                  <p className="mt-1 font-display text-[0.68rem] font-semibold tracking-[0.12em] text-white/50">
                    Date unavailable
                  </p>
                )}
              </article>
            ))}
          </div>

          <a
            href="#latest"
            className="mt-3 flex min-h-[52px] items-center justify-center gap-2 rounded-[12px] border border-[#2a4580]/80 bg-[#0a162e]/85 text-[0.8125rem] font-semibold text-[#a8c4ff] transition hover:border-[#3d5ea3]/90 hover:bg-[#0f1f3d]/90"
          >
            View all latest
            <span aria-hidden>{"->"}</span>
          </a>
        </div>
      </article>
    </section>
  );
};

export default HomeArweaveInsightsPanel;
