import { useState } from "react";
import { platformGroups } from "@/data/content";

const PlatformPanel = () => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    platformGroups.reduce((acc, group) => ({ ...acc, [group.title]: false }), {} as Record<string, boolean>)
  );

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <section className="self-start rounded-[20px] bg-gradient-to-br from-[#ff44ff] via-[#a14bff] to-[#3f2bff] p-[4px] shadow-[0_0_35px_rgba(255,68,255,0.35)]">
      <div className="flex flex-col gap-4 rounded-[16px] border border-white/10 bg-[#060017]/95 p-6 shadow-[inset_0_0_35px_rgba(255,255,255,0.06)]">
        <div className="text-center mt-3">
          <h3 className="neon-heading">By Platform</h3>
          <span className="neon-underline" />
        </div>

        <div className="custom-scroll max-h-[420px] overflow-y-auto pr-2">
          <div className="flex flex-col gap-3 text-sm">
            {platformGroups.map((group) => {
              const isOpen = openGroups[group.title];
              return (
                <div
                  key={group.title}
                  className={`rounded-[12px] border border-white/10 bg-white/5 transition ${isOpen ? "border-white/25 bg-white/10" : ""}`}
                >
                  <button
                    className="flex w-full items-center justify-between gap-3 rounded-[12px] bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
                    onClick={() => toggleGroup(group.title)}
                  >
                    <p className="text-base font-semibold uppercase tracking-wide text-[#ff9cf5]">
                      {group.title}
                    </p>
                    <span
                      className="text-white/70 transition-transform"
                      aria-label={isOpen ? "Collapse platforms" : "Expand platforms"}
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      ▾
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="space-y-1 px-4 pb-4 pt-2 text-white/80">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#ff9cf5]/70" aria-hidden />
                          <span className="flex-1">{item.replace(/^>\s*/, "")}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlatformPanel;
