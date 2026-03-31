const Footer = () => {
  return (
    <footer className="w-full max-w-6xl rounded-[16px] border border-white/15 bg-gradient-to-r from-[#121937]/92 via-[#1a244f]/88 to-[#121937]/92 px-6 py-4 text-sm text-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
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
          <span className="hidden h-3 w-px bg-white/20 md:block" aria-hidden />
          <span>Stony Brook University</span>
          <span className="hidden h-3 w-px bg-white/20 md:block" aria-hidden />
          <span>Blockchain Business Lab</span>
        </div>
        <a
          href="https://x.com/DeScAiTeam"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white hover:bg-white/10"
          aria-label="Visit DeScAI on X"
        >
          <img src="/x-logo.svg" alt="X" className="h-6 w-6" />
        </a>
      </div>
    </footer>
  );
};

export default Footer;
