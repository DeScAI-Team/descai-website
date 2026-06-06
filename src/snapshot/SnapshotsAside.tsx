import clsx from "clsx";
import { Link } from "react-router-dom";

type SnapshotsAsideProps = {
  className?: string;
};

/** Home-only snapshots promo; mirrors `SnapshotsPanel` styling with a working CTA. */
const SnapshotsAside = ({ className }: SnapshotsAsideProps) => {
  return (
    <section
      className={clsx(
        "w-full rounded-[24px] border border-[#263e6c] bg-[linear-gradient(145deg,rgba(29,45,92,0.9),rgba(6,12,30,0.96))] p-[1px] shadow-[0_20px_58px_rgba(1,4,18,0.65),0_0_28px_rgba(68,121,214,0.12)]",
        className
      )}
    >
      <article className="w-full overflow-hidden rounded-[23px] border border-[#263f72] bg-[#071126]/92 p-6 text-center text-sm leading-relaxed text-white/80 shadow-[inset_0_1px_0_rgba(80,126,205,0.12)]">
        <div>
          <div className="text-center">
            <p className="neon-heading text-[0.95rem]">Snapshots</p>
            <span className="neon-underline" />
          </div>

          <p className="mt-4 text-white/75">
            Access past snapshots and donate for access to our most recent releases.
          </p>

          <Link
            to="/?snapshots=1"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#263f72] bg-[#0b1835]/70 px-4 py-3 text-[0.85rem] font-semibold uppercase tracking-[0.22em] text-white transition hover:border-[#74b6ff]/35 hover:bg-[#13244c]"
          >
            View snapshots
            <span aria-hidden className="text-white/60">
              ↗
            </span>
          </Link>
        </div>
      </article>
    </section>
  );
};

export default SnapshotsAside;
