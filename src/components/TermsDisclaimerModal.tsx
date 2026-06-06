import { useEffect, useState } from "react";
import clsx from "clsx";

const STORAGE_KEY = "descai-terms-accepted-v1";

export const hasAcceptedTerms = (): boolean => {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
};

export const acceptTerms = () => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, "true");
};

const disclaimerPoints = [
  {
    title: "AI-generated content",
    body: "Research summaries, reviews, and other material on this site are produced by an autonomous AI agent. Outputs may be incomplete, outdated, or inaccurate."
  },
  {
    title: "Hallucinations are possible",
    body: "The agent can generate plausible-sounding statements that are not factually correct. Do not treat any content here as verified financial, legal, or scientific advice."
  },
  {
    title: "Token & investment risk",
    body: "Any decision to buy, sell, or hold project tokens mentioned on this site is entirely at your own risk. Always conduct your own research (DYOR) and consult qualified professionals before investing."
  },
  {
    title: "No liability",
    body: "DeScAI and its contributors provide this platform and its content on an \"as is\" basis. We disclaim all warranties and are not liable for any losses, damages, or decisions arising from your use of this site."
  }
];

const TermsDisclaimerModal = () => {
  const [visible, setVisible] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!hasAcceptedTerms()) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  const handleEnter = () => {
    if (!accepted) return;
    acceptTerms();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-disclaimer-title"
    >
      <div
        className="absolute inset-0 bg-[#020610]/82 backdrop-blur-md"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg animate-[fadeIn_0.35s_ease-out] sm:max-w-xl">
        <div className="rounded-[24px] border border-[#243c68] bg-[linear-gradient(145deg,rgba(30,44,90,0.92),rgba(6,11,27,0.98)_45%,rgba(18,16,59,0.94))] p-[1px] shadow-[0_24px_80px_rgba(1,4,18,0.88),0_0_48px_rgba(87,115,255,0.18)]">
          <div className="relative overflow-hidden rounded-[23px] border border-[#263f72] bg-[#071025]/96 px-5 py-6 text-white shadow-[inset_0_1px_0_rgba(80,126,205,0.14)] sm:px-7 sm:py-7">
            <div className="pointer-events-none absolute inset-0 -z-10 opacity-45" aria-hidden="true">
              <div className="neon-blur left-1/4 top-0 bg-[#2b5176]" />
              <div className="neon-blur right-0 top-1/3 bg-[#7e47ff]" />
            </div>

            <header className="text-center">
              <img
                src="/DeScAILogo.png"
                alt=""
                aria-hidden="true"
                className="mx-auto h-10 w-auto object-contain opacity-90 sm:h-11"
              />
              <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-[0.38em] text-[#7eb4ff]/80">
                Before you continue
              </p>
              <h2 id="terms-disclaimer-title" className="mt-2">
                <span className="neon-heading text-[0.95rem] sm:text-[1.05rem]">Terms & Disclaimer</span>
              </h2>
              <span className="neon-underline" aria-hidden="true" />
            </header>

            <div className="custom-scroll mt-5 max-h-[min(42vh,320px)] space-y-3 overflow-y-auto pr-1 sm:max-h-[min(44vh,360px)]">
              {disclaimerPoints.map(({ title, body }) => (
                <div
                  key={title}
                  className="rounded-[14px] border border-[#263f72] bg-[#14214a]/55 px-4 py-3 shadow-[inset_0_1px_0_rgba(80,126,205,0.08)]"
                >
                  <h3 className="text-sm font-semibold text-[#9fc3ff]">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/72">{body}</p>
                </div>
              ))}
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[14px] border border-[#2f4a82]/70 bg-[#0a1530]/80 px-4 py-3 transition hover:border-[#4867af]/60">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[#4867af] bg-[#14214a] text-[#6938e8] accent-[#6938e8] focus:ring-2 focus:ring-[#6938e8]/40 focus:ring-offset-0"
              />
              <span className="text-sm leading-snug text-white/80">
                I have read and accept the terms of use and disclaimer. I understand that content is AI-generated and
                that I am solely responsible for any investment decisions I make.
              </span>
            </label>

            <button
              type="button"
              onClick={handleEnter}
              disabled={!accepted}
              className={clsx(
                "mt-5 w-full rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] transition",
                accepted
                  ? "border border-[#6938e8]/50 bg-[linear-gradient(135deg,#6938e8,#4a6dff)] text-white shadow-[0_6px_18px_rgba(79,52,225,0.28)] hover:shadow-[0_8px_22px_rgba(79,52,225,0.32)] hover:brightness-[1.03] active:scale-[0.99] active:border-[#6938e8]/40 active:shadow-[0_2px_8px_rgba(79,52,225,0.16)] active:brightness-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6938e8]/20"
                  : "cursor-not-allowed border border-[#263f72] bg-[#14214a]/60 text-white/35"
              )}
            >
              Enter Site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsDisclaimerModal;
