import { createContext, useContext, useCallback, useMemo } from "react";
import {
  usePrivy,
  useLoginWithOAuth,
  useEmbeddedSolanaWallet,
  isConnected,
} from "@privy-io/expo";
import { useMWA } from "@/hooks/useMWA";

type AuthMethod = "twitter" | "wallet" | null;

interface AuthContextType {
  authenticated: boolean;
  isLoading: boolean;
  authMethod: AuthMethod;
  address: string | null;
  twitterHandle: string | null;
  loginWithTwitter: () => void;
  connectWallet: () => Promise<void>;
  logout: () => void;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction: (transaction: Uint8Array) => Promise<Uint8Array>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isReady, logout: privyLogout } = usePrivy();
  const { login: oauthLogin } = useLoginWithOAuth();
  const embeddedWallet = useEmbeddedSolanaWallet();
  const mwa = useMWA();

  const isTwitterUser = !!user?.linked_accounts?.find(
    (a: any) => a.type === "twitter_oauth"
  );
  const twitterAccount = user?.linked_accounts?.find(
    (a: any) => a.type === "twitter_oauth"
  ) as any;

  const authMethod: AuthMethod = useMemo(() => {
    if (isTwitterUser && user) return "twitter";
    if (mwa.isConnected) return "wallet";
    return null;
  }, [isTwitterUser, user, mwa.isConnected]);

  const address: string | null = useMemo(() => {
    if (authMethod === "twitter") {
      if (isConnected(embeddedWallet)) {
        // Get address from linked Solana embedded wallet account
        const solanaEmbedded = user?.linked_accounts?.find(
          (a: any) => a.type === "solana" && a.wallet_client_type === "privy"
        ) as any;
        return solanaEmbedded?.address || null;
      }
      return null;
    }
    if (authMethod === "wallet") {
      return mwa.address;
    }
    return null;
  }, [authMethod, embeddedWallet, user, mwa.address]);

  const authenticated = !!authMethod && !!address;

  const loginWithTwitter = useCallback(() => {
    oauthLogin({ provider: "twitter" });
  }, [oauthLogin]);

  const connectWallet = useCallback(async () => {
    await mwa.connect();
  }, [mwa]);

  const logout = useCallback(() => {
    if (authMethod === "twitter") {
      privyLogout();
    } else if (authMethod === "wallet") {
      mwa.disconnect();
    }
  }, [authMethod, privyLogout, mwa]);

  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      if (authMethod === "twitter") {
        if (!isConnected(embeddedWallet)) {
          throw new Error("Embedded wallet not ready");
        }
        const provider = await embeddedWallet.getProvider();
        // Provider expects message as UTF-8 string
        const messageStr = new TextDecoder().decode(message);
        const result = await provider.request({
          method: "signMessage",
          params: { message: messageStr },
        });
        // Result signature is base58 string, convert to bytes
        const bs58 = (await import("bs58")).default;
        return bs58.decode(result.signature);
      }
      if (authMethod === "wallet") {
        return mwa.signMessage(message);
      }
      throw new Error("Not authenticated");
    },
    [authMethod, embeddedWallet, mwa]
  );

  const signTransaction = useCallback(
    async (transaction: Uint8Array): Promise<Uint8Array> => {
      if (authMethod === "twitter") {
        if (!isConnected(embeddedWallet)) {
          throw new Error("Embedded wallet not ready");
        }
        const provider = await embeddedWallet.getProvider();
        const { VersionedTransaction } = await import("@solana/web3.js");
        const tx = VersionedTransaction.deserialize(transaction);
        const result = await provider.request({
          method: "signTransaction",
          params: { transaction: tx },
        });
        return result.signedTransaction.serialize();
      }
      if (authMethod === "wallet") {
        // MWA signTransaction works with VersionedTransaction objects
        // For raw bytes, we need to deserialize, sign, reserialize
        const { VersionedTransaction } = await import("@solana/web3.js");
        const tx = VersionedTransaction.deserialize(transaction);
        const signed = await mwa.signTransaction(tx);
        return signed.serialize();
      }
      throw new Error("Not authenticated");
    },
    [authMethod, embeddedWallet, mwa]
  );

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        isLoading: !isReady || mwa.isConnecting,
        authMethod,
        address,
        twitterHandle: twitterAccount?.username || null,
        loginWithTwitter,
        connectWallet,
        logout,
        signMessage,
        signTransaction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
