import { useEffect, useState, useCallback } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { API_BASE_URL } from "@/constants/api";

const RPC_URL = process.env.EXPO_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";

interface UseSOLBalanceResult {
  balance: number | null;
  balanceUSD: number | null;
  solPrice: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSOLBalance(walletAddress: string | null): UseSOLBalanceResult {
  const [balance, setBalance] = useState<number | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(null);
      setSolPrice(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const pubkey = new PublicKey(walletAddress);

      const [lamports, feeRes] = await Promise.all([
        connection.getBalance(pubkey),
        fetch(`${API_BASE_URL}/api/fee`)
          .then((r) => r.json())
          .catch(() => null),
      ]);

      const solBalance = lamports / LAMPORTS_PER_SOL;
      setBalance(solBalance);

      if (feeRes?.solPrice) {
        setSolPrice(feeRes.solPrice);
      }
    } catch (err: any) {
      console.error("Failed to fetch SOL balance:", err);
      setError(err.message || "Failed to fetch SOL balance");
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const balanceUSD =
    balance !== null && solPrice !== null ? balance * solPrice : null;

  return {
    balance,
    balanceUSD,
    solPrice,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}
