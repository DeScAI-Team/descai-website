import clsx from "clsx";

type SnapshotsPanelProps = {
  className?: string;
};

const SnapshotsPanel = ({ className }: SnapshotsPanelProps) => {
  return (
    <article
      className={clsx(
        "w-full rounded-[16px] border border-border-panel bg-surface-card p-5 text-center text-sm leading-relaxed text-content-secondary shadow-panel",
        className
      )}
    >
      <div className="text-center">
        <p className="neon-heading text-[0.85rem]">Snapshots</p>
        <span className="neon-underline" />
      </div>

      <p className="mt-4 text-content-muted text-sm">
        Access past snapshots and donate for access to our most recent releases.
      </p>

      <button
        type="button"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border-panel bg-surface-subtle px-4 py-2.5 text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-content-primary transition hover:border-accent-primary hover:bg-surface-elevated"
      >
        View snapshots
        <span aria-hidden className="text-content-dim">
          ↗
        </span>
      </button>
    </article>
  );
};

export default SnapshotsPanel;
