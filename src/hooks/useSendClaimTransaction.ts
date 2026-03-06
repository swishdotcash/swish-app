import { useCallback, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { API_BASE_URL } from "@/constants/api";

interface PrepareResponse {
  activityId: string;
  unsignedDepositTx: string;
  lastValidBlockHeight: number;
  passphrase: string;
  burnerAddress: string;
}

interface SubmitResponse {
  activityId: string;
  depositTx: string;
  withdrawTx: string;
  claimLink: string;
  burnerAddress: string;
}

interface SendClaimParams {
  amount: number;
  token?: string;
  message?: string;
  signature: string;
  senderPublicKey: string;
}

interface SendClaimResult {
  activityId: string;
  claimLink: string;
  passphrase: string;
  depositTx: string;
  withdrawTx: string;
}

export function useSendClaimTransaction() {
  const { signTransaction } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendClaim = useCallback(
    async (params: SendClaimParams): Promise<SendClaimResult> => {
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
        const prepareRes = await fetch(`${API_BASE_URL}/api/send_claim/prepare`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Signature": params.signature,
          },
          body: JSON.stringify({
            senderPublicKey: params.senderPublicKey,
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
        const passphrase = prepareResult.passphrase;

        // Step 2: Decode & sign
        const depositTxBytes = Uint8Array.from(
          atob(prepareResult.unsignedDepositTx),
          (c) => c.charCodeAt(0)
        );

        let signedBytes: Uint8Array;
        try {
          signedBytes = await signTransaction(depositTxBytes);
        } catch (signError: any) {
          if (activityId) {
            await cancelActivity(activityId);
          }
          throw new Error(signError.message || "Transaction signing rejected");
        }

        const signedDepositTx = btoa(
          String.fromCharCode(...new Uint8Array(signedBytes))
        );

        // Step 3: Submit
        const submitRes = await fetch(`${API_BASE_URL}/api/send_claim/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Signature": params.signature,
          },
          body: JSON.stringify({
            signedDepositTx,
            activityId: prepareResult.activityId,
            senderPublicKey: params.senderPublicKey,
            lastValidBlockHeight: prepareResult.lastValidBlockHeight,
          }),
        });

        if (!submitRes.ok) {
          const errorData = await submitRes.json();
          throw new Error(errorData.error || "Failed to submit transaction");
        }

        const submitResult: SubmitResponse = await submitRes.json();

        return {
          activityId: submitResult.activityId,
          claimLink: submitResult.claimLink,
          passphrase,
          depositTx: submitResult.depositTx,
          withdrawTx: submitResult.withdrawTx,
        };
      } catch (err: any) {
        setError(err.message || "Transaction failed");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [signTransaction]
  );

  return { sendClaim, isLoading, error };
}
