import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <header className="w-full max-w-6xl rounded-full border border-white/10 bg-gradient-to-r from-[#030514]/95 to-[#070c2a]/80 px-6 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex flex-1 min-w-[220px] items-center gap-3 rounded-full border border-white/10 bg-[#0c132f] px-4 py-2 text-sm text-white/70">
          <input
            className="w-full bg-transparent text-white placeholder:text-white/40 focus:outline-none"
            placeholder="Search..."
          />
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-white to-white/60 text-[#12163d]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M10.5 3a7.5 7.5 0 015.96 12.02l4.26 4.27-1.42 1.41-4.27-4.26A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" />
            </svg>
          </span>
        </label>

        <nav className="flex flex-1 justify-center gap-6 text-sm uppercase tracking-wide text-white/80">
          <Link className="transition hover:text-plasma-pink" to="/">
            Home
          </Link>
          <Link className="transition hover:text-plasma-pink" to="/">
            All Reviews
          </Link>
          <Link className="transition hover:text-plasma-pink" to="/">
            About
          </Link>
        </nav>

        <button className="rounded-full border border-amber-200/50 bg-gradient-to-br from-[#221402] to-[#5b3600] px-5 py-2 text-sm font-semibold tracking-wider text-amber-100 shadow-[0_10px_25px_rgba(0,0,0,0.45)]">
          Connect Wallet
        </button>
      </div>
    </header>
  );
};

export default Navbar;
