import { useCallback, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { API_BASE_URL } from "@/constants/api";

interface WithdrawParams {
  receiverAddress: string;
  amount: number;
  signature: string;
  senderPublicKey: string;
}

export function useWithdrawTransaction() {
  const { signTransaction } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdraw = useCallback(
    async (params: WithdrawParams): Promise<{ signature: string }> => {
      if (!params.signature || !params.senderPublicKey) {
        throw new Error("No session signature. Please reconnect wallet.");
      }

      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Prepare — server builds tx with sponsor as fee payer, partial-signs
        const prepareRes = await fetch(`${API_BASE_URL}/api/withdraw`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Signature": params.signature,
          },
          body: JSON.stringify({
            senderPublicKey: params.senderPublicKey,
            receiverAddress: params.receiverAddress,
            amount: params.amount,
          }),
        });

        if (!prepareRes.ok) {
          const errorData = await prepareRes.json();
          throw new Error(errorData.error || "Failed to prepare withdraw");
        }

        const { transaction, blockhash, lastValidBlockHeight } =
          await prepareRes.json();

        // Step 2: Client co-signs the partially signed tx
        const txBytes = Uint8Array.from(atob(transaction), (c) =>
          c.charCodeAt(0)
        );

        let signedBytes: Uint8Array;
        try {
          signedBytes = await signTransaction(txBytes);
        } catch (signError: any) {
          throw new Error(signError.message || "Transaction signing rejected");
        }

        const signedTx = btoa(
          String.fromCharCode(...new Uint8Array(signedBytes))
        );

        // Step 3: Submit fully signed tx
        const submitRes = await fetch(`${API_BASE_URL}/api/withdraw/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signedTransaction: signedTx,
            blockhash,
            lastValidBlockHeight,
          }),
        });

        if (!submitRes.ok) {
          const errorData = await submitRes.json();
          throw new Error(errorData.error || "Failed to submit withdraw");
        }

        return await submitRes.json();
      } catch (err: any) {
        setError(err.message || "Withdraw failed");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [signTransaction]
  );

  return { withdraw, isLoading, error };
}
