import { newsItems } from "@/data/content";

const InsightsPanel = () => {
  const getSnippet = (text: string) => (text.length > 110 ? `${text.slice(0, 110)}...` : text);

  return (
    <section className="flex flex-col gap-6">
      <article className="rounded-[24px] border border-[#263e6c] bg-[linear-gradient(145deg,rgba(29,45,92,0.9),rgba(6,12,30,0.96))] p-[1px] shadow-[0_20px_58px_rgba(1,4,18,0.65),0_0_28px_rgba(68,121,214,0.12)]">
        <div className="rounded-[23px] border border-[#263f72] bg-[#071126]/92 px-7 py-9 shadow-[inset_0_1px_0_rgba(80,126,205,0.12)]">
          <div className="text-center">
            <p className="neon-heading">Latest</p>
            <span className="neon-underline" />
          </div>

          <div className="mt-4 overflow-hidden rounded-[18px] border border-[#263f72] bg-[#0b1835]/70 text-sm text-white/85">
            {newsItems.map((news) => (
              <article key={news.title} className="border-b border-[#263f72] px-5 py-5 last:border-b-0">
                <header className="flex items-start justify-between gap-4">
                  <p className="text-base font-semibold leading-relaxed tracking-wide text-[#a9c5ff]">
                    {news.title}
                  </p>
                  {news.score && (
                    <span className="font-display text-[0.7rem] tracking-[0.2em] text-white/65">
                      {news.score}
                    </span>
                  )}
                </header>
                <p className="mt-3 text-[0.95rem] leading-snug text-white/70">
                  {getSnippet(news.body)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#b7c9ff]">
                  <span className="rounded-[9px] bg-[#403496]/72 px-3 py-2">{news.platform}</span>
                  <span className="rounded-[9px] bg-[#403496]/72 px-3 py-2">{news.field}</span>
                  <span className="ml-auto text-white/52">{news.date}</span>
                </div>
              </article>
            ))}
          </div>

          <a
            href="#latest"
            className="mt-4 flex min-h-[56px] items-center justify-center gap-3 rounded-[14px] border border-[#263f72] bg-[#0b1835]/72 text-sm font-semibold text-[#b7c9ff] transition hover:bg-[#13244c]"
          >
            View all latest
            <span aria-hidden>{"->"}</span>
          </a>
        </div>
      </article>

    </section>
  );
};

export default InsightsPanel;
