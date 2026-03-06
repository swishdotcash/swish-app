import { useCallback, useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/providers/AuthProvider";

const SESSION_SIGNATURE_KEY = "session_signature";
const SESSION_ADDRESS_KEY = "session_address";
const SESSION_MESSAGE = "Privacy Money account sign in";

interface SessionSignatureState {
  signature: string | null;
  isLoading: boolean;
  needsSignature: boolean;
  error: string | null;
}

export function useSessionSignature() {
  const { authenticated, address, signMessage, authMethod } = useAuth();
  const signatureRequestedRef = useRef(false);

  const [state, setState] = useState<SessionSignatureState>({
    signature: null,
    isLoading: true,
    needsSignature: false,
    error: null,
  });

  // Check for existing signature on mount / auth change
  useEffect(() => {
    async function checkStoredSignature() {
      if (!authenticated || !address) {
        setState({
          signature: null,
          isLoading: false,
          needsSignature: false,
          error: null,
        });
        return;
      }

      try {
        const storedSignature = await SecureStore.getItemAsync(
          SESSION_SIGNATURE_KEY
        );
        const storedAddress = await SecureStore.getItemAsync(
          SESSION_ADDRESS_KEY
        );

        if (storedSignature && storedAddress === address) {
          signatureRequestedRef.current = false;
          setState({
            signature: storedSignature,
            isLoading: false,
            needsSignature: false,
            error: null,
          });
          return;
        }

        setState({
          signature: null,
          isLoading: false,
          needsSignature: true,
          error: null,
        });
      } catch {
        setState({
          signature: null,
          isLoading: false,
          needsSignature: true,
          error: null,
        });
      }
    }

    checkStoredSignature();
  }, [authenticated, address]);

  const requestSignature = useCallback(async () => {
    if (!address) {
      setState((prev) => ({ ...prev, error: "No wallet connected" }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const messageBytes = new TextEncoder().encode(SESSION_MESSAGE);
      const signatureBytes = await signMessage(messageBytes);
      const signatureBase64 = btoa(
        String.fromCharCode(...new Uint8Array(signatureBytes))
      );

      await SecureStore.setItemAsync(SESSION_SIGNATURE_KEY, signatureBase64);
      await SecureStore.setItemAsync(SESSION_ADDRESS_KEY, address);

      signatureRequestedRef.current = false;
      setState({
        signature: signatureBase64,
        isLoading: false,
        needsSignature: false,
        error: null,
      });

      return true;
    } catch (error: any) {
      console.error("Failed to get signature:", error);
      signatureRequestedRef.current = false;
      setState({
        signature: null,
        isLoading: false,
        needsSignature: false,
        error: error.message || "Failed to sign message",
      });
      return false;
    }
  }, [address, signMessage]);

  // Auto-request signature when needed
  useEffect(() => {
    if (
      state.needsSignature &&
      !state.isLoading &&
      address &&
      !signatureRequestedRef.current
    ) {
      signatureRequestedRef.current = true;
      requestSignature();
    }
  }, [state.needsSignature, state.isLoading, address, requestSignature]);

  // Clear on logout
  useEffect(() => {
    if (!authenticated) {
      signatureRequestedRef.current = false;
      SecureStore.deleteItemAsync(SESSION_SIGNATURE_KEY).catch(() => {});
      SecureStore.deleteItemAsync(SESSION_ADDRESS_KEY).catch(() => {});
      setState({
        signature: null,
        isLoading: false,
        needsSignature: false,
        error: null,
      });
    }
  }, [authenticated]);

  const clearSignature = useCallback(() => {
    SecureStore.deleteItemAsync(SESSION_SIGNATURE_KEY).catch(() => {});
    SecureStore.deleteItemAsync(SESSION_ADDRESS_KEY).catch(() => {});
    setState({
      signature: null,
      isLoading: false,
      needsSignature: false,
      error: null,
    });
  }, []);

  return {
    signature: state.signature,
    address,
    isLoading: state.isLoading,
    needsSignature: state.needsSignature,
    error: state.error,
    requestSignature,
    clearSignature,
    isAuthenticated: authenticated && !!state.signature,
  };
}
