import { useCallback, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { API_BASE_URL } from "@/constants/api";

interface FulfillParams {
  activityId: string;
  signature: string;
  payerPublicKey: string;
}

interface PrepareResponse {
  activityId: string;
  unsignedDepositTx: string;
  lastValidBlockHeight: number;
}

export function useFulfillRequest() {
  const { signTransaction } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fulfill = useCallback(
    async (params: FulfillParams) => {
      if (!params.signature || !params.payerPublicKey) {
        throw new Error("No session signature. Please reconnect wallet.");
      }

      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Prepare
        const prepareRes = await fetch(`${API_BASE_URL}/api/request/fulfill/prepare`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Signature": params.signature,
          },
          body: JSON.stringify({
            activityId: params.activityId,
            payerPublicKey: params.payerPublicKey,
          }),
        });

        if (!prepareRes.ok) {
          const errorData = await prepareRes.json();
          throw new Error(errorData.error || "Failed to prepare transaction");
        }

        const prepareResult: PrepareResponse = await prepareRes.json();

        // Step 2: Decode & sign
        const depositTxBytes = Uint8Array.from(
          atob(prepareResult.unsignedDepositTx),
          (c) => c.charCodeAt(0)
        );

        let signedBytes: Uint8Array;
        try {
          signedBytes = await signTransaction(depositTxBytes);
        } catch (signError: any) {
          throw new Error(signError.message || "Transaction signing rejected");
        }

        const signedDepositTx = btoa(
          String.fromCharCode(...new Uint8Array(signedBytes))
        );

        // Step 3: Submit
        const submitRes = await fetch(`${API_BASE_URL}/api/request/fulfill/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Signature": params.signature,
          },
          body: JSON.stringify({
            signedDepositTx,
            activityId: prepareResult.activityId,
            payerPublicKey: params.payerPublicKey,
            lastValidBlockHeight: prepareResult.lastValidBlockHeight,
          }),
        });

        if (!submitRes.ok) {
          const errorData = await submitRes.json();
          throw new Error(errorData.error || "Failed to submit transaction");
        }

        return await submitRes.json();
      } catch (err: any) {
        setError(err.message || "Transaction failed");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [signTransaction]
  );

  return { fulfill, isLoading, error };
}
