import { newsItems } from "@/data/content";

const InsightsPanel = () => {
  const getSnippet = (text: string) => (text.length > 110 ? `${text.slice(0, 110)}...` : text);

  return (
    <section className="flex flex-col gap-6">
      <article className="rounded-[32px] bg-gradient-to-br from-[#ff44ff] via-[#a14bff] to-[#3f2bff] p-[4px] shadow-[0_0_35px_rgba(255,68,255,0.35)]">
        <div className="rounded-[28px] bg-[#060017]/95 px-7 py-9">
          <div className="text-center">
            <p className="font-display text-lg uppercase tracking-[0.45em] text-[#ffb6ff]">
              New Research
            </p>
            <span className="mx-auto mt-3 block h-[2px] w-16 bg-gradient-to-r from-transparent via-[#ff9dff] to-transparent" />
          </div>

          <div className="mt-6 divide-y divide-white/15 text-sm text-white/85">
            {newsItems.map((news) => (
              <article key={news.title} className="py-5">
                <header className="flex items-start justify-between gap-4">
                  <p className="text-base font-semibold tracking-wide text-[#ff9cf5]">
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

      <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#49112a] to-[#182c56] p-6 text-center text-sm leading-relaxed text-white/80">
        <h4 className="text-xs uppercase tracking-[0.5em] text-white">DeSci SnapShots</h4>
        <p className="mt-3">
          Access past DeSci snapshots and donate for access to our most recent!
        </p>
      </article>

    </section>
  );
};

export default InsightsPanel;
