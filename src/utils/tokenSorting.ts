import type { SortDirection, TokenSortField, TokenWithMarketData } from "@/types/token";

export type SortState = {
  field: TokenSortField;
  direction: SortDirection;
};

const alphaCompare = (left: string, right: string) => left.localeCompare(right, undefined, { sensitivity: "base" });

const platformLabel = (token: TokenWithMarketData) => {
  if (token.platforms.length) return token.platforms.join(" / ");
  return token.platform;
};

const compareNullableNumber = (left: number | null | undefined, right: number | null | undefined) => {
  const safeLeft = typeof left === "number" ? left : Number.NEGATIVE_INFINITY;
  const safeRight = typeof right === "number" ? right : Number.NEGATIVE_INFINITY;
  return safeLeft - safeRight;
};

export const compareTokens = (left: TokenWithMarketData, right: TokenWithMarketData, sort: SortState) => {
  const direction = sort.direction === "asc" ? 1 : -1;

  switch (sort.field) {
    case "symbol":
      return direction * alphaCompare(left.symbol, right.symbol);
    case "name":
      return direction * alphaCompare(left.name, right.name);
    case "chain":
      return direction * alphaCompare(left.chain, right.chain);
    case "platform":
      return direction * alphaCompare(platformLabel(left), platformLabel(right));
    case "price":
      return direction * compareNullableNumber(left.market?.price, right.market?.price);
    case "priceChange24h":
      return direction * compareNullableNumber(left.market?.priceChange24h, right.market?.priceChange24h);
    case "marketCap":
      return direction * compareNullableNumber(left.market?.marketCap, right.market?.marketCap);
    case "fdv":
    default:
      return direction * compareNullableNumber(left.market?.fdv, right.market?.fdv);
  }
};

export const toggleSort = (current: SortState, field: TokenSortField): SortState => {
  if (current.field !== field) {
    return {
      field,
      direction: field === "symbol" || field === "name" || field === "chain" || field === "platform" ? "asc" : "desc"
    };
  }
  return {
    field,
    direction: current.direction === "asc" ? "desc" : "asc"
  };
};
