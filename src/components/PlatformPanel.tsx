import clsx from "clsx";
import { useState } from "react";
import { platformGroups } from "@/data/content";

type PlatformPanelProps = {
  className?: string;
};

const PlatformPanel = ({ className }: PlatformPanelProps) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    platformGroups.reduce((acc, group) => ({ ...acc, [group.title]: true }), {} as Record<string, boolean>)
  );

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <section
      className={clsx(
        "w-full rounded-[20px] bg-gradient-to-br from-[#3c537f] via-[#273960] to-[#16213c] p-[4px] shadow-[0_0_26px_rgba(60,83,127,0.22)]",
        className
      )}
    >
      <div className="flex h-full flex-col gap-4 rounded-[16px] border border-white/15 bg-[#141c3d]/95 p-6 shadow-[inset_0_0_35px_rgba(255,255,255,0.08)]">
        <div className="text-center mt-3">
          <h3 className="neon-heading">By Platform</h3>
          <span className="neon-underline" />
        </div>

        <div>
          <div className="flex flex-col gap-3 text-[0.98rem]">
            {platformGroups.map((group) => {
              return (
                <div
                  key={group.title}
                  className={clsx(
                    "rounded-[12px] border border-white/10 bg-white/5 transition",
                    openGroups[group.title] && "border-white/25 bg-white/10"
                  )}
                >
                  <button
                    className="flex w-full items-center justify-between gap-3 rounded-[12px] bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
                    onClick={() => toggleGroup(group.title)}
                  >
                    <p className="text-[1.05rem] font-semibold uppercase tracking-wide text-[#9fc3ff]">
                      {group.title}
                    </p>
                    <span
                      className="text-white/70 transition-transform"
                      aria-label={openGroups[group.title] ? "Collapse platforms" : "Expand platforms"}
                      style={{ transform: openGroups[group.title] ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      ▾
                    </span>
                  </button>
                  {openGroups[group.title] && (
                    <ul className="space-y-1 px-4 pb-4 pt-2 text-[0.98rem] text-white/80">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#6ed7ff]/70" aria-hidden />
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
