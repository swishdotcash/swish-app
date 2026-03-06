import { useCallback, useState } from "react";
import {
  transact,
  Web3MobileWallet,
} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

const APP_IDENTITY = {
  name: "Swish",
  uri: "https://swish.cash",
  icon: "favicon.ico",
};

interface MWAState {
  publicKey: PublicKey | null;
  authToken: string | null;
  isConnecting: boolean;
  error: string | null;
}

export function useMWA() {
  const [state, setState] = useState<MWAState>({
    publicKey: null,
    authToken: null,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const result = await transact(async (wallet: Web3MobileWallet) => {
        const auth = await wallet.authorize({
          cluster: "mainnet-beta",
          identity: APP_IDENTITY,
        });
        return auth;
      });

      // MWA returns accounts array with base64-encoded addresses
      const addressBase64 = result.accounts[0]?.address;
      if (!addressBase64) throw new Error("No account returned from wallet");
      const addressBytes = Uint8Array.from(atob(addressBase64), (c) =>
        c.charCodeAt(0)
      );
      const publicKey = new PublicKey(addressBytes);

      setState({
        publicKey,
        authToken: result.auth_token,
        isConnecting: false,
        error: null,
      });

      return publicKey;
    } catch (err: any) {
      console.error("MWA connect failed:", err);
      setState({
        publicKey: null,
        authToken: null,
        isConnecting: false,
        error: err.message || "Failed to connect wallet",
      });
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (state.authToken) {
      transact(async (wallet: Web3MobileWallet) => {
        await wallet.deauthorize({ auth_token: state.authToken! });
      }).catch(() => {});
    }

    setState({
      publicKey: null,
      authToken: null,
      isConnecting: false,
      error: null,
    });
  }, [state.authToken]);

  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      if (!state.publicKey || !state.authToken) {
        throw new Error("Wallet not connected");
      }

      const result = await transact(async (wallet: Web3MobileWallet) => {
        await wallet.reauthorize({
          auth_token: state.authToken!,
          identity: APP_IDENTITY,
        });

        const address = state.publicKey!.toBase58();
        const signatures = await wallet.signMessages({
          addresses: [btoa(address)],
          payloads: [message],
        });

        return signatures[0];
      });

      return result;
    },
    [state.publicKey, state.authToken]
  );

  const signTransaction = useCallback(
    async <T extends import("@solana/web3.js").VersionedTransaction>(
      transaction: T
    ): Promise<T> => {
      if (!state.authToken) {
        throw new Error("Wallet not connected");
      }

      const result = await transact(async (wallet: Web3MobileWallet) => {
        await wallet.reauthorize({
          auth_token: state.authToken!,
          identity: APP_IDENTITY,
        });

        const signed = await wallet.signTransactions({
          transactions: [transaction],
        });

        return signed[0] as T;
      });

      return result;
    },
    [state.authToken]
  );

  return {
    publicKey: state.publicKey,
    address: state.publicKey?.toBase58() || null,
    authToken: state.authToken,
    isConnecting: state.isConnecting,
    isConnected: !!state.publicKey,
    error: state.error,
    connect,
    disconnect,
    signMessage,
    signTransaction,
  };
}
