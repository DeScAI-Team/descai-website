type InjectedEthereum = NonNullable<Window["ethereum"]>;

/** Prefer the MetaMask EIP-1193 instance when multiple wallets inject `window.ethereum`. */
export const getMetaMaskProvider = (): InjectedEthereum | undefined => {
  if (typeof window === "undefined") return undefined;

  const root = window.ethereum;
  if (!root) return undefined;

  if (Array.isArray(root)) {
    return (root as InjectedEthereum[]).find((p) => p.isMetaMask);
  }

  if (root.providers?.length) {
    return root.providers.find((p) => p.isMetaMask);
  }

  return root;
};

export const BASE_CHAIN_ID_HEX = "0x2105";

export const readChainIdHex = async (): Promise<string | null> => {
  const provider = getMetaMaskProvider();
  if (!provider) return null;
  try {
    const id = await provider.request<string>({ method: "eth_chainId" });
    return typeof id === "string" ? id.toLowerCase() : null;
  } catch {
    return null;
  }
};
