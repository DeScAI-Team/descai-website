import clsx from "clsx";

type SnapshotsPanelProps = {
  className?: string;
};

const SnapshotsPanel = ({ className }: SnapshotsPanelProps) => {
  return (
    <section
      className={clsx(
        "w-full rounded-[24px] border border-[#263e6c] bg-[linear-gradient(145deg,rgba(29,45,92,0.9),rgba(6,12,30,0.96))] p-[1px] shadow-[0_20px_58px_rgba(1,4,18,0.65),0_0_28px_rgba(68,121,214,0.12)]",
        className
      )}
    >
      <article className="relative w-full overflow-hidden rounded-[23px] border border-[#263f72] bg-[#071126]/92 p-6 text-center text-sm leading-relaxed text-white/80 shadow-[inset_0_1px_0_rgba(80,126,205,0.12)]">
        <div className="pointer-events-none select-none">
          <div className="text-center">
            <p className="neon-heading text-[0.95rem]">Snapshots</p>
            <span className="neon-underline" />
          </div>

          <p className="mt-4 text-white/75">
            Access past snapshots and donate for access to our most recent releases.
          </p>

          <button
            type="button"
            disabled
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#263f72] bg-[#0b1835]/70 px-4 py-3 text-[0.85rem] font-semibold uppercase tracking-[0.22em] text-white opacity-90"
          >
            View snapshots
            <span aria-hidden className="text-white/60">↗</span>
          </button>
        </div>

        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-[linear-gradient(180deg,rgba(10,14,24,0.1)_0%,rgba(10,14,24,0.18)_32%,rgba(10,14,24,0.44)_100%)] backdrop-blur-[2px]"
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-2 rounded-[18px] border border-[#263f72] bg-[#0f172a]/62 px-6 py-4 text-center shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[#d8ebff]">
              Coming Soon
            </span>
            <span className="max-w-[16rem] text-xs leading-relaxed text-white/72">
              Snapshot access is being prepared.
            </span>
          </div>
        </div>
      </article>
    </section>
  );
};

export default SnapshotsPanel;
