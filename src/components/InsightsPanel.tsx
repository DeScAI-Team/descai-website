import { newsItems } from "@/data/content";

const InsightsPanel = () => {
  const getSnippet = (text: string) => (text.length > 110 ? `${text.slice(0, 110)}...` : text);

  return (
    <section className="flex flex-col gap-6">
      <article className="rounded-[20px] bg-gradient-to-br from-[#3c537f] via-[#273960] to-[#16213c] p-[4px] shadow-[0_0_26px_rgba(60,83,127,0.22)]">
        <div className="rounded-[16px] border border-white/15 bg-[#141c3d]/95 px-7 py-9">
          <div className="text-center">
            <p className="neon-heading">Latest</p>
            <span className="neon-underline" />
          </div>

          <div className="mt-4 divide-y divide-white/15 text-sm text-white/85">
            {newsItems.map((news) => (
              <article key={news.title} className="py-5">
                <header className="flex items-start justify-between gap-4">
                  <p className="text-base font-semibold tracking-wide text-[#9fc3ff]">
                    {news.title}
                  </p>
                  {news.score && (
                    <span className="font-display text-[0.7rem] tracking-[0.2em] text-white/65">
                      {news.score}
                    </span>
                  )}
                </header>
                <p className="mt-2 text-[0.95rem] leading-snug text-white/80">
                  {getSnippet(news.body)}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-[0.7rem] uppercase tracking-[0.35em] text-white/55">
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
