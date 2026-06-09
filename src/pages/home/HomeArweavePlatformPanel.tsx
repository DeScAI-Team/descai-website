import clsx from "clsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { OverviewPlatformGroup } from "@/api/fetchOverviewSidebarsFromArweave";

type HomeArweavePlatformPanelProps = {
  className?: string;
  groups: OverviewPlatformGroup[];
  loading: boolean;
  error: string | null;
  emptyHint?: string;
  itemsLimit?: number;
};

const chipBase =
  "border-[#3d5694]/55 bg-[#0a1428]/90 text-[#9eb6ef] hover:border-[#4a68a8]/70 hover:bg-[#0f1a35]/95 hover:text-[#b6cffc]";

const chipPalettes = [
  chipBase,
  "border-[#365589]/60 bg-[#081020]/92 text-[#8eb0ef] hover:border-[#4a68a8]/70 hover:bg-[#0c1830]/95 hover:text-[#a8c4ff]",
  "border-[#3d5ea3]/55 bg-[#0a162e]/90 text-[#a8c4ff] hover:border-[#5a7ec8]/70 hover:bg-[#0f1f3d]/95 hover:text-[#c6d9ff]",
  "border-[#2f4a82]/65 bg-[#0f1a32]/88 text-[#9eb6ef] hover:border-[#3d5ea3]/70 hover:bg-[#122040]/95 hover:text-[#b6cffc]",
  "border-[#4a5f94]/50 bg-[#0c1428]/90 text-[#7ea8ff] hover:border-[#5a7ec8]/65 hover:bg-[#101c38]/95 hover:text-[#a8c4ff]"
] as const;

const chipPaletteForCategory = (category: string | null) => {
  if (!category) return chipPalettes[0];
  let hash = 0;
  for (const char of category.toLowerCase()) {
    hash = (hash + char.charCodeAt(0)) % chipPalettes.length;
  }
  return chipPalettes[hash];
};

const HomeArweavePlatformPanel = ({
  className,
  groups,
  loading,
  error,
  emptyHint,
  itemsLimit = 20
}: HomeArweavePlatformPanelProps) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenGroups(
      groups.reduce(
        (acc, group) => {
          acc[group.platform] = false;
          return acc;
        },
        {} as Record<string, boolean>
      )
    );
  }, [groups]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <section
      className={clsx(
        "w-full rounded-[20px] border border-[#2a4580]/85 bg-[linear-gradient(148deg,rgba(32,52,102,0.88),rgba(7,12,28,0.98))] p-px shadow-[0_16px_44px_rgba(1,4,18,0.55),0_0_20px_rgba(68,121,214,0.1)]",
        className
      )}
    >
      <div className="flex h-full flex-col gap-3 rounded-[19px] border border-[#2f4a82]/90 bg-[#060f22]/95 px-3 pt-4 pb-6 shadow-[inset_0_1px_0_rgba(88,132,210,0.1)]">
        <div className="text-center">
          <h3 className="neon-heading">By Platform</h3>
          <span className="neon-underline" />
        </div>

        <div>
          {loading && <p className="text-center text-[0.875rem] text-white/60">Loading platforms…</p>}
          {error && <p className="text-center text-[0.875rem] text-rose-300/90">{error}</p>}
          {!loading && !error && groups.length === 0 && (
            <p className="text-center text-[0.875rem] text-white/60">{emptyHint ?? "No overview items yet."}</p>
          )}

          <div className="flex flex-col gap-3 text-[0.98rem]">
            {groups.map((group) => {
              const visibleItems = group.items.slice(0, itemsLimit);
              const hasMore = group.items.length > itemsLimit;

              return (
                <div
                  key={group.platform}
                  className={clsx(
                    "overflow-hidden rounded-[18px] border border-[#263f72] bg-[#0b1835]/82 shadow-[inset_0_1px_0_rgba(80,126,205,0.1)] transition",
                    openGroups[group.platform] && "border-[#365589] bg-[#0f1f45]/88"
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-[17px] bg-[#16264e]/88 px-3 py-3 text-left transition hover:bg-[#1a2d5d]"
                    onClick={() => toggleGroup(group.platform)}
                  >
                    <p className="text-[1.08rem] font-semibold uppercase tracking-wide text-[#a9c5ff]">
                      {group.platform}
                    </p>
                    <span
                      className="text-white/70 transition-transform"
                      aria-label={openGroups[group.platform] ? "Collapse platforms" : "Expand platforms"}
                      style={{ transform: openGroups[group.platform] ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      ▾
                    </span>
                  </button>
                  {openGroups[group.platform] && (
                    <div className="px-3 pb-4 pt-2">
                      <div className="mx-2 border-t border-[#263d70]" aria-hidden />
                      <div className="mt-2 flex flex-wrap gap-2">
                      {visibleItems.map((item) => (
                        <Link
                          key={item.txid}
                          to={`/review/${item.txid}`}
                          title={item.category ? `${item.name} · ${item.category}` : item.name}
                          className={clsx(
                            "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-medium leading-snug shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition",
                            chipPaletteForCategory(item.category)
                          )}
                        >
                          <span className="truncate">
                            {item.name ? item.name.charAt(0).toUpperCase() + item.name.slice(1) : item.name}
                          </span>
                        </Link>
                      ))}
                      {hasMore ? (
                        <Link
                          to={`/search?q=${encodeURIComponent(group.platform)}`}
                          className="inline-flex items-center rounded-full border border-dashed border-[#3d5ea3]/55 bg-[#152848]/85 px-2.5 py-1 text-[0.68rem] font-semibold tracking-wide text-[#7ea8ff] transition hover:border-[#5a7ec8]/70 hover:bg-[#1a3058]/90 hover:text-[#a8c4ff]"
                        >
                          See All…
                        </Link>
                      ) : null}
                      </div>
                    </div>
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

export default HomeArweavePlatformPanel;
