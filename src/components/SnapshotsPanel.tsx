import clsx from "clsx";

type SnapshotsPanelProps = {
  className?: string;
};

const SnapshotsPanel = ({ className }: SnapshotsPanelProps) => {
  return (
    <article
      className={clsx(
        "w-full rounded-[20px] border border-white/10 bg-gradient-to-br from-[#49112a] via-[#2d1240] to-[#182c56] p-6 text-center text-sm leading-relaxed text-white/80 shadow-[0_18px_38px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      <div className="text-center">
        <p className="neon-heading text-[0.95rem]">Snapshots</p>
        <span className="neon-underline" />
      </div>

      <p className="mt-4 text-white/75">
        Access past snapshots and donate for access to our most recent releases.
      </p>

      <button
        type="button"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-[0.85rem] font-semibold uppercase tracking-[0.22em] text-white transition hover:border-white/30 hover:bg-white/10"
      >
        View snapshots
        <span aria-hidden className="text-white/60">↗</span>
      </button>
    </article>
  );
};

export default SnapshotsPanel;
