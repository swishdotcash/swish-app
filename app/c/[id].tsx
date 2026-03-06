import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useSessionSignature } from "@/hooks/useSessionSignature";
import { useFee } from "@/hooks/useFee";
import { Spinner, ClaimPassphraseModal } from "@/components";
import { formatNumber } from "@/utils";
import { API_BASE_URL } from "@/constants/api";

import ReceiveIcon from "@/assets/receive.svg";
import SuccessAltIcon from "@/assets/success-alt.svg";
import SolIcon from "@/assets/sol-icon.svg";
import XIcon from "@/assets/x-icon.svg";

interface ClaimData {
  id: string;
  amount: number;
  token: string;
  status: string;
  message: string | null;
  createdAt: string;
  isSender: boolean;
}

type PageState =
  | "loading"
  | "ready"
  | "success"
  | "error"
  | "not_found"
  | "already_claimed"
  | "reclaiming"
  | "reclaimed";

export default function ClaimPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authenticated, address, loginWithTwitter, connectWallet } = useAuth();
  const { signature } = useSessionSignature();
  const { baseFee, feePercent } = useFee();
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    async function fetchClaimData() {
      try {
        const url = address
          ? `${API_BASE_URL}/api/send_claim/${id}?wallet=${address}`
          : `${API_BASE_URL}/api/send_claim/${id}`;

        const res = await fetch(url);

        if (res.status === 404) {
          setPageState("not_found");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch claim data");
        }

        const data: ClaimData = await res.json();
        setClaimData(data);

        if (data.status === "settled" || data.status === "cancelled") {
          setPageState("already_claimed");
        } else {
          setPageState("ready");
        }
      } catch (error) {
        console.error("Error fetching claim:", error);
        setPageState("error");
      }
    }

    if (id) fetchClaimData();
  }, [id, address]);

  const handleClaim = () => {
    if (!authenticated || !address) {
      setShowLoginModal(true);
      return;
    }
    setShowPassphraseModal(true);
  };

  const handleClaimSuccess = () => {
    setPageState("success");
  };

  const handleReclaim = async () => {
    if (!signature || !address) return;

    setPageState("reclaiming");
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/send_claim/reclaim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Signature": signature,
        },
        body: JSON.stringify({
          activityId: id,
          senderPublicKey: address,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to reclaim");
      }

      setPageState("reclaimed");
    } catch (error: any) {
      console.error("Reclaim failed:", error);
      setErrorMessage(error.message || "Something went wrong");
      setPageState("error");
    }
  };

  if (pageState === "loading") {
    return (
      <View className="flex-1 items-center justify-center">
        <Spinner size={48} color="#121212" />
        <Text
          className="mt-4 text-dark/70"
          style={{ fontFamily: "Jost_400Regular" }}
        >
          Loading claim...
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
          Claim link not found
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

  if (pageState === "already_claimed") {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <View
          className="w-12 h-12 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(234, 179, 8, 0.1)" }}
        >
          <Text className="text-yellow-600 text-2xl">!</Text>
        </View>
        <Text className="text-dark" style={{ fontFamily: "Jost_500Medium" }}>
          Already claimed
        </Text>
        <Text
          className="text-dark/60 text-sm mt-2"
          style={{ fontFamily: "Jost_400Regular" }}
        >
          This claim link has already been used.
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

  if (pageState === "reclaiming") {
    return (
      <View className="flex-1 items-center justify-center">
        <Spinner size={48} color="#121212" />
        <Text
          className="mt-4 text-dark/70"
          style={{ fontFamily: "Jost_400Regular" }}
        >
          Reclaiming funds...
        </Text>
      </View>
    );
  }

  if (pageState === "reclaimed") {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <View
          className="w-12 h-12 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(0, 136, 52, 0.1)" }}
        >
          <SuccessAltIcon width={24} height={24} />
        </View>
        <Text className="text-dark" style={{ fontFamily: "Jost_500Medium" }}>
          Funds Reclaimed
        </Text>
        <Text
          className="text-dark/60 text-sm mt-2"
          style={{ fontFamily: "Jost_400Regular" }}
        >
          The funds have been returned to your wallet.
        </Text>
      </View>
    );
  }

  if (!claimData) return null;

  const partnerFee = baseFee + claimData.amount * feePercent;
  const youReceive = claimData.amount - partnerFee;

  return (
    <>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 16 }}
      >
        {/* Amount Display */}
        <View className="items-center mb-8">
          <Text
            className="text-6xl text-dark text-center"
            style={{ fontFamily: "Jost_300Light" }}
          >
            {claimData.amount}
          </Text>
          {claimData.message && (
            <Text
              className="mt-2 text-dark/50 text-sm"
              style={{ fontFamily: "Jost_400Regular" }}
            >
              {claimData.message}
            </Text>
          )}
        </View>

        {/* Details */}
        <View className="w-full max-w-[320px] self-center gap-2 mb-8">
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
              {claimData.isSender ? "You get back" : "You receive"}
            </Text>
            <Text className="text-dark" style={{ fontFamily: "Jost_400Regular" }}>
              ~{formatNumber(youReceive)} USDC
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-dark" style={{ fontFamily: "Jost_600SemiBold" }}>
              Total
            </Text>
            <Text className="text-dark" style={{ fontFamily: "Jost_600SemiBold" }}>
              {formatNumber(claimData.amount)} USDC
            </Text>
          </View>
        </View>

        {/* Claim Button (for receivers) */}
        {pageState === "ready" && !claimData.isSender && (
          <Pressable
            onPress={handleClaim}
            className="w-full max-w-[320px] self-center h-12 bg-dark rounded-full items-center justify-center"
            style={{
              shadowColor: "#121212",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <ReceiveIcon width={24} height={24} />
          </Pressable>
        )}

        {/* Reclaim Button (for sender) */}
        {pageState === "ready" && claimData.isSender && (
          <Pressable
            onPress={handleReclaim}
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
              Reclaim
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

      {/* Passphrase Modal */}
      {claimData && address && (
        <ClaimPassphraseModal
          visible={showPassphraseModal}
          onClose={() => setShowPassphraseModal(false)}
          amount={claimData.amount}
          activityId={claimData.id}
          receiverAddress={address}
          onSuccess={handleClaimSuccess}
        />
      )}

      {/* Login Modal */}
      <Modal
        visible={showLoginModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLoginModal(false)}
      >
        <Pressable
          onPress={() => setShowLoginModal(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable
            onPress={() => {}}
            className="bg-light rounded-t-3xl px-6 pb-10 pt-6"
          >
            <View className="items-center mb-2">
              <View className="w-10 h-1 bg-dark/20 rounded-full mb-6" />
            </View>
            <Text
              className="text-lg text-dark text-center mb-6"
              style={{ fontFamily: "Jost_600SemiBold" }}
            >
              Connect
            </Text>

            <Pressable
              onPress={() => {
                setShowLoginModal(false);
                loginWithTwitter();
              }}
              className="w-full h-12 bg-dark rounded-full flex-row items-center justify-center gap-2 mb-3"
              style={{
                shadowColor: "#121212",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <XIcon width={16} height={16} fill="#fafafa" />
              <Text
                className="text-light text-sm"
                style={{ fontFamily: "Jost_600SemiBold" }}
              >
                Continue with X
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowLoginModal(false);
                connectWallet();
              }}
              className="w-full h-12 bg-light rounded-full flex-row items-center justify-center gap-2"
              style={{
                borderWidth: 1,
                borderColor: "rgba(18, 18, 18, 0.2)",
                shadowColor: "#121212",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <SolIcon width={16} height={16} />
              <Text
                className="text-dark text-sm"
                style={{ fontFamily: "Jost_600SemiBold" }}
              >
                Connect Wallet
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
