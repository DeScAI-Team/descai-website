import clsx from "clsx";
import { useLayoutEffect, useRef, useState } from "react";
import { platformGroups } from "@/data/content";

type PlatformPanelProps = {
  className?: string;
};

const PlatformPanel = ({ className }: PlatformPanelProps) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    platformGroups.reduce((acc, group) => ({ ...acc, [group.title]: true }), {} as Record<string, boolean>)
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!lockedHeight && scrollRef.current) {
      setLockedHeight(scrollRef.current.getBoundingClientRect().height);
    }
  }, [lockedHeight]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <section
      className={clsx(
        "panel-border w-full",
        className
      )}
    >
      <div className="panel-inner flex h-full flex-col gap-4 p-5">
        <div className="text-center mt-2">
          <h3 className="neon-heading">By Platform</h3>
          <span className="neon-underline" />
        </div>

        <div
          ref={scrollRef}
          className="custom-scroll overflow-y-auto"
          style={lockedHeight ? { height: lockedHeight } : undefined}
        >
          <div className="flex flex-col gap-2.5 text-sm">
            {platformGroups.map((group) => {
              return (
                <div
                  key={group.title}
                  className={clsx(
                    "rounded-[10px] border border-border bg-surface-subtle transition",
                    openGroups[group.title] && "border-border-panel bg-surface-elevated"
                  )}
                >
                  <button
                    className="flex w-full items-center justify-between gap-3 rounded-[10px] bg-surface-subtle px-3.5 py-2.5 text-left transition hover:bg-surface-elevated"
                    onClick={() => toggleGroup(group.title)}
                  >
                    <p className="text-sm font-semibold uppercase tracking-wide text-accent-highlight">
                      {group.title}
                    </p>
                    <span
                      className="text-content-muted transition-transform text-xs"
                      aria-label={openGroups[group.title] ? "Collapse platforms" : "Expand platforms"}
                      style={{ transform: openGroups[group.title] ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      ▾
                    </span>
                  </button>
                  {openGroups[group.title] && (
                    <ul className="space-y-1 px-3.5 pb-3.5 pt-1.5 text-content-secondary">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm">
                          <span className="h-1 w-1 rounded-full bg-accent-primary opacity-60" aria-hidden />
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
