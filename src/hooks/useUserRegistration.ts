import { useEffect, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { API_BASE_URL } from "@/constants/api";

export function useUserRegistration() {
  const { authenticated, address, authMethod, twitterHandle } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!authenticated || !address || registeredRef.current) return;

    const connectionType = authMethod === "twitter" ? "x" : "wallet";

    registeredRef.current = true;

    fetch(`${API_BASE_URL}/api/user/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress: address,
        connectionType,
        twitterHandle: twitterHandle || null,
      }),
    }).catch((err) => {
      console.error("User registration failed:", err);
      registeredRef.current = false;
    });
  }, [authenticated, address, authMethod, twitterHandle]);

  // Reset on logout
  useEffect(() => {
    if (!authenticated) {
      registeredRef.current = false;
    }
  }, [authenticated]);
}
