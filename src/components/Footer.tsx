type FooterProps = {
  className?: string;
};

const Footer = ({ className = "" }: FooterProps) => {
  return (
    <div className={`w-full rounded-[20px] border border-[#263e6c] bg-[linear-gradient(145deg,rgba(29,45,92,0.9),rgba(6,12,30,0.96))] p-[1px] shadow-[0_20px_58px_rgba(1,4,18,0.65),0_0_28px_rgba(68,121,214,0.12)] ${className}`}>
      <footer className="rounded-[19px] border border-[#263f72] bg-[#071126]/92 px-8 py-5 text-sm text-white/80 shadow-[inset_0_1px_0_rgba(80,126,205,0.16)] backdrop-blur-xl">
        <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <span className="font-semibold text-white">DeScAI</span>
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/70">
            <span>
              Website built by{" "}
              <a
                href="https://zurabikoch-portfolio.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#9fc3ff] underline-offset-4 hover:underline"
              >
                Zurabi Kochiashvili
              </a>
            </span>
            <span className="hidden h-3 w-px bg-[#20315e] md:block" aria-hidden />
            <span>Stony Brook University</span>
            <span className="hidden h-3 w-px bg-[#20315e] md:block" aria-hidden />
            <span>Blockchain Business Lab</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/DeScAI-Team"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-[#263f72] bg-[#0b1835]/70 px-3 py-2 text-white hover:bg-[#14214a]/72"
              aria-label="Visit DeScAI on GitHub"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
                <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 008 10.93c.58.1.79-.25.79-.56v-2.17c-3.25.71-3.94-1.39-3.94-1.39-.53-1.34-1.3-1.7-1.3-1.7-1.06-.73.08-.72.08-.72 1.17.08 1.79 1.2 1.79 1.2 1.05 1.79 2.74 1.28 3.41.98.1-.76.41-1.28.74-1.58-2.59-.29-5.31-1.3-5.31-5.77 0-1.27.45-2.31 1.2-3.13-.12-.3-.52-1.5.11-3.13 0 0 .98-.31 3.2 1.2a11.1 11.1 0 015.82 0c2.22-1.51 3.2-1.2 3.2-1.2.63 1.63.23 2.83.11 3.13.75.82 1.2 1.86 1.2 3.13 0 4.48-2.72 5.48-5.32 5.77.42.36.8 1.08.8 2.18v3.23c0 .31.21.67.8.56A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
              </svg>
            </a>
            <a
              href="https://x.com/DeScAiTeam"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-[#263f72] bg-[#0b1835]/70 px-3 py-2 text-white hover:bg-[#14214a]/72"
              aria-label="Visit DeScAI on X"
            >
              <img src="/x-logo.svg" alt="X" className="h-6 w-6" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
