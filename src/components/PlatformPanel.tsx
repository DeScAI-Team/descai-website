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
        "w-full rounded-[24px] border border-[#263e6c] bg-[linear-gradient(145deg,rgba(29,45,92,0.9),rgba(6,12,30,0.96))] p-[1px] shadow-[0_20px_58px_rgba(1,4,18,0.65),0_0_28px_rgba(68,121,214,0.12)]",
        className
      )}
    >
      <div className="flex h-full flex-col gap-4 rounded-[23px] border border-[#263f72] bg-[#071126]/92 p-6 shadow-[inset_0_1px_0_rgba(80,126,205,0.12)]">
        <div className="mt-3 text-center">
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
                    "overflow-hidden rounded-[18px] border border-[#263f72] bg-[#0b1835]/82 shadow-[inset_0_1px_0_rgba(80,126,205,0.1)] transition",
                    openGroups[group.title] && "border-[#365589] bg-[#0f1f45]/88"
                  )}
                >
                  <button
                    className="flex w-full items-center justify-between gap-3 rounded-[17px] bg-[#16264e]/88 px-4 py-3 text-left transition hover:bg-[#1a2d5d]"
                    onClick={() => toggleGroup(group.title)}
                  >
                    <p className="text-[1.08rem] font-semibold uppercase tracking-wide text-[#a9c5ff]">
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
                    <ul className="space-y-1 px-4 pb-4 pt-2 text-[0.98rem] text-white/72">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[#59b8ff]" aria-hidden />
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
