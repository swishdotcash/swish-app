import { useCallback, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { API_BASE_URL } from "@/constants/api";

interface PrepareResponse {
  activityId: string;
  unsignedDepositTx: string;
  lastValidBlockHeight: number;
  estimatedFeeLamports: number;
  estimatedFeeSOL: number;
}

interface SubmitResponse {
  activityId: string;
  depositTx: string;
  withdrawTx: string;
}

interface SendParams {
  receiverAddress: string;
  amount: number;
  token?: string;
  message?: string;
  signature: string;
  senderPublicKey: string;
}

export function useSendTransaction() {
  const { signTransaction } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (params: SendParams): Promise<SubmitResponse> => {
      if (!params.signature || !params.senderPublicKey) {
        throw new Error("No session signature. Please reconnect wallet.");
      }

      setIsLoading(true);
      setError(null);

      const cancelActivity = async (activityId: string) => {
        try {
          await fetch(`${API_BASE_URL}/api/activity/cancel`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Session-Signature": params.signature,
            },
            body: JSON.stringify({
              activityId,
              senderPublicKey: params.senderPublicKey,
            }),
          });
        } catch (e) {
          console.error("Failed to cancel activity:", e);
        }
      };

      let activityId: string | null = null;

      try {
        // Step 1: Prepare
        const prepareRes = await fetch(`${API_BASE_URL}/api/send/prepare`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Signature": params.signature,
          },
          body: JSON.stringify({
            senderPublicKey: params.senderPublicKey,
            receiverAddress: params.receiverAddress,
            amount: params.amount,
            token: params.token || "USDC",
            message: params.message,
          }),
        });

        if (!prepareRes.ok) {
          const errorData = await prepareRes.json();
          throw new Error(errorData.error || "Failed to prepare transaction");
        }

        const prepareResult: PrepareResponse = await prepareRes.json();
        activityId = prepareResult.activityId;

        // Step 2: Decode unsigned deposit transaction
        const depositTxBytes = Uint8Array.from(
          atob(prepareResult.unsignedDepositTx),
          (c) => c.charCodeAt(0)
        );

        // Step 3: Sign deposit transaction
        let signedBytes: Uint8Array;
        try {
          signedBytes = await signTransaction(depositTxBytes);
        } catch (signError: any) {
          if (activityId) {
            await cancelActivity(activityId);
          }
          throw new Error(signError.message || "Transaction signing rejected");
        }

        // Convert signed transaction to base64
        const signedDepositTx = btoa(
          String.fromCharCode(...new Uint8Array(signedBytes))
        );

        // Step 4: Submit
        const submitRes = await fetch(`${API_BASE_URL}/api/send/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Signature": params.signature,
          },
          body: JSON.stringify({
            signedDepositTx,
            activityId: prepareResult.activityId,
            senderPublicKey: params.senderPublicKey,
            receiverAddress: params.receiverAddress,
            amount: params.amount,
            token: params.token || "USDC",
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

  return { send, isLoading, error };
}
