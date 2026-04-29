/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type WalletType = "metamask" | "wander";

type WalletContextValue = {
  address: string | null;
  walletType: WalletType | null;
  isConnected: boolean;
  error: string | null;
  clearError: () => void;
  connect: (type: WalletType) => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (txParams: unknown) => Promise<unknown>;
  signMessage: (message: string) => Promise<unknown>;
};

const CONNECTED_WALLET_KEY = "connectedWallet";
const WANDER_PERMISSIONS = ["ACCESS_ADDRESS", "SIGN_TRANSACTION", "SIGNATURE"] as const;

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const getMetaMaskProvider = () => window.ethereum;
const getWanderProvider = () => window.arweaveWallet;

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Wallet request failed");

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const persistConnection = useCallback((type: WalletType, nextAddress: string) => {
    setWalletType(type);
    setAddress(nextAddress);
    localStorage.setItem(CONNECTED_WALLET_KEY, type);
  }, []);

  const clearConnection = useCallback(() => {
    setAddress(null);
    setWalletType(null);
    localStorage.removeItem(CONNECTED_WALLET_KEY);
  }, []);

  const connectMetaMask = useCallback(
    async (silent = false) => {
      const provider = getMetaMaskProvider();
      if (!provider) {
        throw new Error("MetaMask is not installed.");
      }

      const method = silent ? "eth_accounts" : "eth_requestAccounts";
      const accounts = await provider.request<string[]>({ method });
      const nextAddress = accounts?.[0];
      if (!nextAddress) {
        throw new Error("No MetaMask account is available.");
      }

      persistConnection("metamask", nextAddress);
    },
    [persistConnection]
  );

  const connectWander = useCallback(
    async (silent = false) => {
      const provider = getWanderProvider();
      if (!provider) {
        throw new Error("Wander is not installed.");
      }

      if (!silent) {
        await provider.connect([...WANDER_PERMISSIONS]);
      }

      const nextAddress = await provider.getActiveAddress();
      if (!nextAddress) {
        throw new Error("No Wander account is available.");
      }

      persistConnection("wander", nextAddress);
    },
    [persistConnection]
  );

  const connect = useCallback(
    async (type: WalletType) => {
      setError(null);
      try {
        if (type === "metamask") {
          await connectMetaMask(false);
          return;
        }

        await connectWander(false);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        throw err;
      }
    },
    [connectMetaMask, connectWander]
  );

  const disconnect = useCallback(async () => {
    if (walletType === "wander") {
      await getWanderProvider()?.disconnect();
    }

    clearConnection();
    setError(null);
  }, [clearConnection, walletType]);

  const sendTransaction = useCallback(
    async (txParams: unknown) => {
      if (!walletType || !address) {
        throw new Error("Connect a wallet before sending a transaction.");
      }

      if (walletType === "metamask") {
        const provider = getMetaMaskProvider();
        if (!provider) throw new Error("MetaMask is not installed.");

        const requestParams =
          typeof txParams === "object" && txParams !== null && !Array.isArray(txParams)
            ? [{ from: address, ...txParams }]
            : [txParams];

        return provider.request({ method: "eth_sendTransaction", params: requestParams });
      }

      const provider = getWanderProvider();
      if (!provider) throw new Error("Wander is not installed.");
      return provider.sign(txParams);
    },
    [address, walletType]
  );

  const signMessage = useCallback(
    async (message: string) => {
      if (!walletType || !address) {
        throw new Error("Connect a wallet before signing a message.");
      }

      if (walletType === "metamask") {
        const provider = getMetaMaskProvider();
        if (!provider) throw new Error("MetaMask is not installed.");
        return provider.request({ method: "personal_sign", params: [message, address] });
      }

      const provider = getWanderProvider();
      if (!provider) throw new Error("Wander is not installed.");
      return provider.signMessage(new TextEncoder().encode(message));
    },
    [address, walletType]
  );

  useEffect(() => {
    const storedWallet = localStorage.getItem(CONNECTED_WALLET_KEY) as WalletType | null;
    if (storedWallet !== "metamask" && storedWallet !== "wander") return;

    const reconnect = async () => {
      try {
        if (storedWallet === "metamask") {
          await connectMetaMask(true);
          return;
        }

        await connectWander(true);
      } catch {
        clearConnection();
      }
    };

    void reconnect();
  }, [clearConnection, connectMetaMask, connectWander]);

  useEffect(() => {
    const provider = getMetaMaskProvider();
    if (!provider) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (walletType !== "metamask") return;
      const nextAddress = accounts[0];
      if (nextAddress) {
        persistConnection("metamask", nextAddress);
        return;
      }

      clearConnection();
    };

    const handleChainChanged = () => {
      if (walletType === "metamask") {
        void connectMetaMask(true).catch(() => clearConnection());
      }
    };

    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [clearConnection, connectMetaMask, persistConnection, walletType]);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      walletType,
      isConnected: Boolean(address),
      error,
      clearError,
      connect,
      disconnect,
      sendTransaction,
      signMessage
    }),
    [address, clearError, connect, disconnect, error, sendTransaction, signMessage, walletType]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider.");
  }

  return context;
};
