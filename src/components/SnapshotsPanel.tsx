import clsx from "clsx";

type SnapshotsPanelProps = {
  className?: string;
};

const SnapshotsPanel = ({ className }: SnapshotsPanelProps) => {
  return (
    <article
      className={clsx(
        "relative w-full overflow-hidden rounded-[20px] border border-white/15 bg-gradient-to-br from-[#1c2b47] via-[#16233c] to-[#111a2e] p-6 text-center text-sm leading-relaxed text-white/80 shadow-[0_18px_38px_rgba(0,0,0,0.45)]",
        className
      )}
    >
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
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-[0.85rem] font-semibold uppercase tracking-[0.22em] text-white opacity-90"
        >
          View snapshots
          <span aria-hidden className="text-white/60">↗</span>
        </button>
      </div>

      <div
        className="absolute inset-0 z-10 flex items-center justify-center bg-[linear-gradient(180deg,rgba(10,14,24,0.1)_0%,rgba(10,14,24,0.18)_32%,rgba(10,14,24,0.44)_100%)] backdrop-blur-[2px]"
        aria-hidden="true"
      >
        <div className="flex flex-col items-center gap-2 rounded-[18px] border border-white/15 bg-[#0f172a]/62 px-6 py-4 text-center shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[#d8ebff]">
            Coming Soon
          </span>
          <span className="max-w-[16rem] text-xs leading-relaxed text-white/72">
            Snapshot access is being prepared.
          </span>
        </div>
      </div>
    </article>
  );
};

export default SnapshotsPanel;
