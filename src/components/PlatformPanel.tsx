import { platformGroups } from "@/data/content";

const PlatformPanel = () => {
  return (
    <section className="self-start rounded-[32px] bg-gradient-to-br from-[#ff44ff] via-[#a14bff] to-[#3f2bff] p-[4px] shadow-[0_0_35px_rgba(255,68,255,0.35)]">
      <div className="flex flex-col gap-5 rounded-[28px] border border-white/10 bg-[#080927]/95 p-6 shadow-[inset_0_0_35px_rgba(255,255,255,0.06)]">
        <h3 className="text-center text-xs uppercase tracking-[0.4em] text-white">
          By Platform
        </h3>

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
      </div>
    </section>
  );
};

export default PlatformPanel;
