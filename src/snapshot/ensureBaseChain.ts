import { BASE_CHAIN_ID_HEX, getMetaMaskProvider } from "./ethereumProvider";

const defaultBaseRpc = "https://mainnet.base.org";

export const ensureBaseChain = async (rpcUrlFromEnv: string) => {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error("MetaMask is not installed.");
  }

  const rpcForAdd = rpcUrlFromEnv || defaultBaseRpc;

  const chainId = await provider.request<string>({ method: "eth_chainId" });
  if (typeof chainId === "string" && chainId.toLowerCase() === BASE_CHAIN_ID_HEX) {
    return;
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_CHAIN_ID_HEX }]
    });
    return;
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: number }).code : undefined;
    if (code !== 4902) {
      throw error;
    }
  }

  await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: BASE_CHAIN_ID_HEX,
        chainName: "Base",
        nativeCurrency: { name: "Base ETH", symbol: "ETH", decimals: 18 },
        rpcUrls: [rpcForAdd],
        blockExplorerUrls: ["https://basescan.org"]
      }
    ]
  });
};
