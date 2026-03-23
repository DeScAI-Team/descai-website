import { newsItems } from "@/data/content";

const InsightsPanel = () => {
  const getSnippet = (text: string) => (text.length > 110 ? `${text.slice(0, 110)}...` : text);

  return (
    <section className="flex flex-col gap-6">
      <article className="panel-border">
        <div className="panel-inner px-5 py-6">
          <div className="text-center">
            <p className="neon-heading">Latest</p>
            <span className="neon-underline" />
          </div>

          <div className="mt-4 divide-y divide-border text-sm text-content-secondary">
            {newsItems.map((news) => (
              <article key={news.title} className="py-4">
                <header className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold tracking-wide text-accent-highlight">
                    {news.title}
                  </p>
                  {news.score && (
                    <span className="font-mono text-[0.65rem] tracking-[0.15em] text-content-subtle">
                      {news.score}
                    </span>
                  )}
                </header>
                <p className="mt-2 text-[0.9rem] leading-snug text-content-muted">
                  {getSnippet(news.body)}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-3 text-[0.65rem] uppercase tracking-[0.25em] text-content-dim">
                  <span>{news.platform}</span>
                  <span>{news.field}</span>
                  <span>{news.date}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
};

export default InsightsPanel;
