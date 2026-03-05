import { useEffect, useState, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { API_BASE_URL } from "@/constants/api";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const RPC_URL = process.env.EXPO_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";

interface UseUSDCBalanceResult {
  balance: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUSDCBalance(walletAddress: string | null): UseUSDCBalanceResult {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const ownerPubkey = new PublicKey(walletAddress);

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        ownerPubkey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const usdcAccount = tokenAccounts.value.find(
        (account) =>
          account.account.data.parsed.info.mint === USDC_MINT.toString()
      );

      if (usdcAccount) {
        const tokenAmount = usdcAccount.account.data.parsed.info.tokenAmount;
        setBalance(tokenAmount.uiAmount || 0);
      } else {
        setBalance(0);
      }
    } catch (err: any) {
      console.error("Failed to fetch USDC balance:", err);
      setError(err.message || "Failed to fetch balance");
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}
