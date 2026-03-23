const Footer = () => {
  return (
    <footer className="w-full max-w-6xl rounded-[14px] border border-border-panel bg-surface-sidebar/90 px-5 py-4 text-sm text-content-muted shadow-panel backdrop-blur-sm">
      <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
        <span className="font-semibold text-content-primary">DeScAI</span>
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.15em] text-content-subtle">
          <span>
            Website built by{" "}
            <a
              href="https://zurabikoch-portfolio.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-content-muted hover:text-accent-highlight underline-offset-4 hover:underline transition"
            >
              Zurabi Kochiashvili
            </a>
          </span>
          <span className="hidden h-3 w-px bg-border md:block" aria-hidden />
          <span>Stony Brook University</span>
          <span className="hidden h-3 w-px bg-border md:block" aria-hidden />
          <span>Blockchain Business Lab</span>
        </div>
        <a
          href="https://x.com/DeScAiTeam"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-2 text-content-muted transition hover:bg-surface-elevated hover:text-content-primary"
          aria-label="Visit DeScAI on X"
        >
          <img src="/x-logo.svg" alt="X" className="h-5 w-5" />
        </a>
      </div>
    </footer>
  );
};

export default Footer;
