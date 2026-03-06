import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useSessionSignature } from "@/hooks/useSessionSignature";
import { useFee } from "@/hooks/useFee";
import { useFulfillRequest } from "@/hooks/useFulfillRequest";
import { Spinner } from "@/components";
import { formatNumber } from "@/utils";
import { API_BASE_URL } from "@/constants/api";

import SendIcon from "@/assets/send.svg";
import SuccessAltIcon from "@/assets/success-alt.svg";

interface RequestData {
  id: string;
  amount: number;
  token: string;
  status: string;
  message: string | null;
  createdAt: string;
  receiverAddress?: string;
}

type PageState =
  | "loading"
  | "ready"
  | "processing"
  | "success"
  | "error"
  | "not_found"
  | "already_paid"
  | "cancelled"
  | "cancelling";

export default function RequestPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { authenticated, address, loginWithTwitter, connectWallet } = useAuth();
  const { signature } = useSessionSignature();
  const { baseFee, feePercent } = useFee();
  const { fulfill } = useFulfillRequest();
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    async function fetchRequestData() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/request/${id}`);

        if (res.status === 404) {
          setPageState("not_found");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch request data");
        }

        const data: RequestData = await res.json();
        setRequestData(data);

        if (data.status === "settled") {
          setPageState("already_paid");
        } else if (data.status === "cancelled") {
          setPageState("cancelled");
        } else {
          setPageState("ready");
        }
      } catch (error) {
        console.error("Error fetching request:", error);
        setPageState("error");
      }
    }

    if (id) fetchRequestData();
  }, [id]);

  const isRequestor =
    authenticated &&
    address &&
    requestData?.receiverAddress &&
    address.toLowerCase() === requestData.receiverAddress.toLowerCase();

  const handlePay = async () => {
    if (!authenticated) {
      setShowLoginModal(true);
      return;
    }

    if (!signature || !address) return;

    setPageState("processing");
    setErrorMessage(null);

    try {
      await fulfill({
        activityId: id!,
        signature,
        payerPublicKey: address,
      });
      setPageState("success");
    } catch (error: any) {
      console.error("Pay request failed:", error);
      setErrorMessage(error.message || "Something went wrong");
      setPageState("error");
    }
  };

  const handleCancel = async () => {
    if (!signature || !address) return;

    setPageState("cancelling");
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/request/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Signature": signature,
        },
        body: JSON.stringify({
          activityId: id,
          requesterAddress: address,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to cancel request");
      }

      setPageState("cancelled");
    } catch (error: any) {
      console.error("Cancel request failed:", error);
      setErrorMessage(error.message || "Something went wrong");
      setPageState("error");
    }
  };

  const formatAddress = (addr: string) => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  if (pageState === "loading") {
    return (
      <View className="flex-1 items-center justify-center">
        <Spinner size={48} color="#121212" />
        <Text
          className="mt-4 text-dark/70"
          style={{ fontFamily: "Jost_400Regular" }}
        >
          Loading request...
        </Text>
      </View>
    );
  }

  if (pageState === "not_found") {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <View
          className="w-12 h-12 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
        >
          <Text className="text-red-500 text-2xl">!</Text>
        </View>
        <Text className="text-dark" style={{ fontFamily: "Jost_500Medium" }}>
          Request not found
        </Text>
        <Text
          className="text-dark/60 text-sm mt-2"
          style={{ fontFamily: "Jost_400Regular" }}
        >
          This link may be invalid or expired.
        </Text>
      </View>
    );
  }

  if (pageState === "already_paid") {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <View
          className="w-12 h-12 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(234, 179, 8, 0.1)" }}
        >
          <Text className="text-yellow-600 text-2xl">!</Text>
        </View>
        <Text className="text-dark" style={{ fontFamily: "Jost_500Medium" }}>
          Already paid
        </Text>
        <Text
          className="text-dark/60 text-sm mt-2"
          style={{ fontFamily: "Jost_400Regular" }}
        >
          This request has already been fulfilled.
        </Text>
      </View>
    );
  }

  if (pageState === "cancelled") {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <View
          className="w-12 h-12 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
        >
          <Text style={{ color: "#CB0000", fontSize: 24 }}>!</Text>
        </View>
        <Text className="text-dark" style={{ fontFamily: "Jost_500Medium" }}>
          Request Cancelled
        </Text>
        <Text
          className="text-dark/60 text-sm mt-2"
          style={{ fontFamily: "Jost_400Regular" }}
        >
          This payment request has been cancelled.
        </Text>
      </View>
    );
  }

  if (pageState === "processing" || pageState === "cancelling") {
    return (
      <View className="flex-1 items-center justify-center">
        <Spinner size={48} color="#121212" />
        <Text
          className="mt-4 text-dark/70"
          style={{ fontFamily: "Jost_400Regular" }}
        >
          {pageState === "cancelling" ? "Cancelling request..." : "Processing payment..."}
        </Text>
      </View>
    );
  }

  if (pageState === "error") {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <View
          className="w-12 h-12 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
        >
          <Text className="text-red-500 text-2xl">!</Text>
        </View>
        <Text className="text-dark mb-2" style={{ fontFamily: "Jost_500Medium" }}>
          Something went wrong
        </Text>
        <Text
          className="text-dark/60 text-sm text-center mb-6"
          style={{ fontFamily: "Jost_400Regular" }}
        >
          {errorMessage || "Please try again later."}
        </Text>
        <Pressable
          onPress={() => setPageState("ready")}
          className="px-6 h-10 bg-dark rounded-full items-center justify-center"
          style={{
            shadowColor: "#121212",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <Text className="text-light" style={{ fontFamily: "Jost_600SemiBold" }}>
            Try Again
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!requestData) return null;

  const partnerFee = baseFee + requestData.amount * feePercent;
  const requestorReceives = requestData.amount - partnerFee;

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 16 }}
    >
      {/* Amount Display */}
      <View className="items-center mb-8">
        <Text
          className="text-6xl text-dark text-center"
          style={{ fontFamily: "Jost_300Light" }}
        >
          {requestData.amount}
        </Text>
        {requestData.message && (
          <Text
            className="mt-2 text-dark/50 text-sm"
            style={{ fontFamily: "Jost_400Regular" }}
          >
            {requestData.message}
          </Text>
        )}
      </View>

      {/* Details */}
      <View className="w-full max-w-[320px] self-center gap-2 mb-8">
        {requestData.receiverAddress && (
          <View className="flex-row justify-between">
            <Text className="text-dark" style={{ fontFamily: "Jost_400Regular" }}>
              Requested by
            </Text>
            <Text className="text-dark" style={{ fontFamily: "Jost_400Regular" }}>
              {formatAddress(requestData.receiverAddress)}
            </Text>
          </View>
        )}
        <View className="flex-row justify-between">
          <Text className="text-dark" style={{ fontFamily: "Jost_400Regular" }}>
            Partner fees
          </Text>
          <Text className="text-dark" style={{ fontFamily: "Jost_400Regular" }}>
            ~{formatNumber(partnerFee)} USDC
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-dark" style={{ fontFamily: "Jost_400Regular" }}>
            {isRequestor ? "You receive" : "They receive"}
          </Text>
          <Text className="text-dark" style={{ fontFamily: "Jost_400Regular" }}>
            ~{formatNumber(requestorReceives)} USDC
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-dark" style={{ fontFamily: "Jost_600SemiBold" }}>
            Total
          </Text>
          <Text className="text-dark" style={{ fontFamily: "Jost_600SemiBold" }}>
            {formatNumber(requestData.amount)} USDC
          </Text>
        </View>
      </View>

      {/* Pay Button (for payers) */}
      {pageState === "ready" && !isRequestor && (
        <Pressable
          onPress={handlePay}
          className="w-full max-w-[320px] self-center h-12 bg-dark rounded-full items-center justify-center"
          style={{
            shadowColor: "#121212",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <SendIcon width={24} height={24} />
        </Pressable>
      )}

      {/* Cancel Button (for requestor) */}
      {pageState === "ready" && isRequestor && (
        <Pressable
          onPress={handleCancel}
          className="w-full max-w-[320px] self-center h-12 bg-light rounded-full items-center justify-center"
          style={{
            borderWidth: 1,
            borderColor: "#CB0000",
            shadowColor: "#CB0000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text
            style={{ color: "#CB0000", fontFamily: "Jost_600SemiBold" }}
          >
            Cancel Request
          </Text>
        </Pressable>
      )}

      {/* Success State */}
      {pageState === "success" && (
        <Pressable
          className="w-full max-w-[320px] self-center h-12 bg-light rounded-full items-center justify-center"
          style={{
            borderWidth: 1,
            borderColor: "rgba(18, 18, 18, 0.7)",
            shadowColor: "#121212",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <SuccessAltIcon width={24} height={24} />
        </Pressable>
      )}
    </ScrollView>
  );
}
