import { newsItems, topProjects } from "@/data/content";

const InsightsPanel = () => {
  return (
    <section className="flex flex-col gap-6">
      <article className="rounded-3xl border border-white/10 bg-[#140d25] p-6 shadow-inner shadow-white/5">
        <h3 className="text-xs uppercase tracking-[0.4em] text-amber-200">New Science</h3>
        <div className="mt-5 space-y-5 text-sm">
          {newsItems.map((news) => (
            <div key={news.title} className="space-y-2 text-white/85">
              <p className="font-semibold text-white">{news.title}</p>
              <p className="text-[0.9rem] leading-relaxed text-white/70">{news.body}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#49112a] to-[#182c56] p-6 text-center text-sm leading-relaxed text-white/80">
        <h4 className="text-xs uppercase tracking-[0.5em] text-white">DeSci SnapShots</h4>
        <p className="mt-3">
          Access past DeSci snapshots and donate for access to our most recent!
        </p>
      </article>

      <article className="rounded-2xl border border-white/10 bg-[#080918e6] p-6 shadow-inner shadow-white/5">
        <h4 className="text-xs uppercase tracking-[0.5em] text-white">Top Projects</h4>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {topProjects.map(({ icon, grade }) => (
            <div
              key={icon + grade}
              className="flex h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-gradient-to-br from-[#5d8cff33] to-[#8926ff33] text-2xl"
            >
              <span>{icon}</span>
              <strong className="text-base">{grade}</strong>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
};

export default InsightsPanel;
