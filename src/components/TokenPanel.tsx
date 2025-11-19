import { projectTokens } from "@/data/content";
import clsx from "clsx";

const TokenPanel = () => {
  return (
    <article className="rounded-[32px] bg-gradient-to-br from-[#ff44ff] via-[#a14bff] to-[#3f2bff] p-[4px] shadow-[0_0_35px_rgba(255,68,255,0.35)]">
      <div className="rounded-[28px] bg-[#050018]/95 px-6 py-7">
        <header className="flex items-center justify-between text-white">
          <h4 className="font-display text-lg uppercase tracking-[0.35em]">Project Tokens</h4>
          <div className="flex gap-2 text-sm text-white/70">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10">↗</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10">≡</span>
          </div>
        </header>

        <div className="mt-6 text-[0.65rem] uppercase tracking-[0.35em] text-white/40">
          <div className="grid grid-cols-[110px_minmax(0,1.3fr)_110px_90px_70px] justify-items-center gap-3 text-center">
            <span className="block w-full text-center">Ticker</span>
            <span className="block w-full text-center">Name</span>
            <span className="block w-full text-center">Price</span>
            <span className="block w-full text-center">24h</span>
            <span className="block w-full text-center">Chain</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-white/80">
          {projectTokens.map((token) => (
            <div
              key={token.ticker}
              className="grid grid-cols-[110px_minmax(0,1.3fr)_110px_90px_70px] items-center gap-3 rounded-[20px] bg-gradient-to-r from-[#1a063a]/90 to-[#09001f]/80 px-4 py-3 text-center shadow-[inset_0_0_10px_rgba(255,255,255,0.04)]"
            >
              <span className="whitespace-nowrap font-semibold text-[#ffb9ff]">{token.ticker}</span>
              <span className="min-w-0 truncate font-medium">{token.name}</span>
              <span className="whitespace-nowrap text-white">{token.price}</span>
              <span
                className={clsx(
                  "font-semibold",
                  token.trend === "up" ? "text-[#7affb2]" : "text-[#ff7a93]"
                )}
              >
                {token.change}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-center text-xs uppercase tracking-[0.2em] text-white/70">
                {token.chain}
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
};

export default TokenPanel;
