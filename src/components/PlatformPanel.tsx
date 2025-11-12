import { platformGroups } from "@/data/content";

const PlatformPanel = () => {
  return (
    <section className="panel-gradient flex flex-col gap-5 rounded-3xl border border-white/10 bg-[#0b1024e6] p-6 shadow-[0_25px_45px_rgba(2,0,18,0.6)]">
      <div className="flex gap-3 text-[0.65rem] uppercase tracking-[0.35em] text-white/70">
        <button className="flex-1 rounded-full border border-white/15 bg-gradient-to-r from-[#8a7bff] to-[#ff58e4] px-3 py-2 font-semibold text-xs">
          By Platform
        </button>
        <button className="flex-1 rounded-full border border-white/15 bg-transparent px-3 py-2 font-semibold text-xs">
          By Field
        </button>
      </div>

      <div className="flex flex-col gap-5 text-sm">
        {platformGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-1 font-semibold uppercase tracking-widest text-indigo-100/70">
              {group.title}
            </p>
            <ul className="space-y-1 text-white/80">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PlatformPanel;
