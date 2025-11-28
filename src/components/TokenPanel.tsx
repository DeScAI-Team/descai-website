import { projectTokens } from "@/data/content";
import clsx from "clsx";

const TokenPanel = () => {
  const formatPrice = (price: string) => {
    const num = Number(price.replace(/[^0-9.-]/g, ""));
    if (Number.isNaN(num)) return price;
    return `$${num.toFixed(3)}`;
  };

  const formatChange = (change: string) => {
    const num = Number(change.replace(/[^0-9.-]/g, ""));
    if (Number.isNaN(num)) return change;
    const sign = change.trim().startsWith("-") ? "-" : "";
    return `${sign}${Math.abs(num).toFixed(2)}%`;
  };

  return (
    <article className="rounded-[20px] bg-gradient-to-br from-[#ff44ff] via-[#a14bff] to-[#3f2bff] p-[4px] shadow-[0_0_35px_rgba(255,68,255,0.35)]">
      <div className="rounded-[16px] bg-[#050018]/95 px-6 py-7">
        <header className="flex items-center justify-between text-white">
          <h4 className="neon-heading neon-heading-left text-left text-lg">Project Tokens</h4>
          <div className="flex gap-2 text-sm text-white/70">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10">↗</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10">≡</span>
          </div>
        </header>

        <div className="mt-6 text-[0.65rem] uppercase tracking-[0.35em] text-white/40">
          <div className="grid grid-cols-[0.9fr_2fr_0.9fr_0.8fr_0.7fr] justify-items-start gap-2 px-2 text-left">
            <span className="block w-full">Ticker</span>
            <span className="block w-full">Name</span>
            <span className="block w-full">Price</span>
            <span className="block w-full">24h</span>
            <span className="block w-full">Chain</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-white/80">
          {projectTokens.map((token) => (
            <div
              key={token.ticker}
              className="grid grid-cols-[0.9fr_2fr_0.9fr_0.8fr_0.7fr] items-center gap-2 rounded-[12px] bg-gradient-to-r from-[#1a063a]/90 to-[#09001f]/80 px-4 py-3 text-left shadow-[inset_0_0_10px_rgba(255,255,255,0.04)]"
            >
              <span className="whitespace-nowrap font-semibold text-[#ffb9ff]">{token.ticker}</span>
              <span className="min-w-0 truncate font-medium">{token.name}</span>
              <span className="whitespace-nowrap text-white">{formatPrice(token.price)}</span>
              <span
                className={clsx(
                  "font-semibold",
                  token.trend === "up" ? "text-[#7affb2]" : "text-[#ff7a93]"
                )}
              >
                {formatChange(token.change)}
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
