import { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Keyboard,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import { QRScanner } from "./QRScanner";
import { PublicKey } from "@solana/web3.js";
import { Spinner } from "./Spinner";
import { AnimatedBottomSheet } from "./AnimatedBottomSheet";
import { SuccessParticles } from "./SuccessParticles";
import { useSendTransaction } from "@/hooks/useSendTransaction";
import { useFee } from "@/hooks/useFee";
import { formatNumber } from "@/utils";
import { API_BASE_URL } from "@/constants/api";

import { hapticLight, hapticSuccess, hapticError } from "@/utils/haptics";
import { formatError } from "@/utils/formatError";
import SendIcon from "@/assets/send-alt.svg";
import SolIcon from "@/assets/sol-icon.svg";
import XIcon from "@/assets/x-icon.svg";
import ScanIcon from "@/assets/scan-icon.svg";
import SuccessAltIcon from "@/assets/success-alt.svg";

interface SendModalProps {
  visible: boolean;
  onClose: () => void;
  amount: string;
  onSendViaClaim: () => void;
  signature: string | null;
  senderPublicKey: string | null;
}

type ModalState = "input" | "confirm" | "loading" | "success" | "error";
type RecipientType = "wallet" | "x";

function FeeRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  const font = bold ? "Jost_600SemiBold" : "Jost_400Regular";
  return (
    <View className="flex-row justify-between">
      <Text className="text-dark" style={{ fontFamily: font }}>
        {label}
      </Text>
      <Text className="text-dark" style={{ fontFamily: font }}>
        {value}
      </Text>
    </View>
  );
}

export function SendModal({
  visible,
  onClose,
  amount,
  onSendViaClaim,
  signature,
  senderPublicKey,
}: SendModalProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType>("wallet");
  const [state, setState] = useState<ModalState>("input");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResolvingX, setIsResolvingX] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { send } = useSendTransaction();
  const { baseFee, feePercent } = useFee();

  const successScale = useSharedValue(0);
  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const numAmount = parseFloat(amount) || 0;
  const partnerFee = baseFee + numAmount * feePercent;
  const total = numAmount - partnerFee;

  const isValidAddress = useMemo(() => {
    if (!walletAddress) return false;
    try {
      new PublicKey(walletAddress);
      return true;
    } catch {
      return false;
    }
  }, [walletAddress]);

  const isValidXHandle = useMemo(() => {
    if (!xHandle) return false;
    return /^[a-zA-Z0-9_]{1,15}$/.test(xHandle);
  }, [xHandle]);

  const canProceed =
    recipientType === "wallet" ? isValidAddress : isValidXHandle;

  const resolveXHandleAddr = async (): Promise<string> => {
    setIsResolvingX(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/resolve-x`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twitterHandle: xHandle }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resolve X handle");
      }
      const { walletAddress: resolved } = await res.json();
      return resolved;
    } finally {
      setIsResolvingX(false);
    }
  };

  // Step 1 → Step 2: resolve if X handle, then show confirm screen
  const handleReview = async () => {
    if (!canProceed) return;

    if (recipientType === "x") {
      setState("loading");
      try {
        const resolved = await resolveXHandleAddr();
        setResolvedAddress(resolved);
        setState("confirm");
      } catch (err: any) {
        setErrorMessage(formatError(err));
        setState("error");
        hapticError();
      }
    } else {
      setResolvedAddress(walletAddress);
      setState("confirm");
    }
  };

  // Step 2: execute the send
  const handleSend = async () => {
    if (!signature || !senderPublicKey) return;
    setState("loading");
    setErrorMessage(null);

    try {
      await send({
        receiverAddress: resolvedAddress,
        amount: numAmount,
        token: "USDC",
        signature,
        senderPublicKey,
      });
      successScale.value = withSpring(1, { damping: 14, stiffness: 200 });
      setState("success");
      hapticSuccess();
    } catch (error: any) {
      console.error("Send failed:", error);
      setErrorMessage(formatError(error));
      setState("error");
      hapticError();
    }
  };

  const handleClose = () => {
    setState("input");
    setWalletAddress("");
    setXHandle("");
    setResolvedAddress("");
    setRecipientType("wallet");
    setErrorMessage(null);
    setIsResolvingX(false);
    setShowScanner(false);
    successScale.value = 0;
    onClose();
  };

  const handleQRScan = useCallback((data: string) => {
    setWalletAddress(data);
    setShowScanner(false);
  }, []);

  const formatAddress = (addr: string) => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const displayRecipient =
    recipientType === "x" && xHandle
      ? `@${xHandle}`
      : formatAddress(resolvedAddress || walletAddress);

  return (
      <AnimatedBottomSheet visible={visible} onClose={handleClose}>
        <Pressable onPress={() => {}} className="bg-light rounded-t-3xl">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            bounces={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 60 : 40,
              paddingTop: 24,
            }}
          >
            {/* Handle bar */}
            <View className="items-center mb-2">
              <View className="w-10 h-1 bg-dark/20 rounded-full mb-4" />
            </View>

            {/* Header */}
            <View className="flex-row items-center gap-2 mb-6">
              <SendIcon width={24} height={24} fill="#121212" />
              <Text
                className="text-2xl text-dark"
                style={{ fontFamily: "Jost_600SemiBold" }}
              >
                {state === "confirm" ? "Review" : "Send"}
              </Text>
            </View>

            {/* ── STEP 1: INPUT ── */}
            {state === "input" && (
              <Animated.View entering={FadeIn.duration(180)}>
                {/* Recipient type toggle */}
                <View className="flex-row mb-4 bg-dark/5 rounded-full p-1">
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setRecipientType("wallet");
                    }}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 h-8 rounded-full ${
                      recipientType === "wallet" ? "bg-dark" : ""
                    }`}
                  >
                    <SolIcon width={14} height={14} />
                    <Text
                      className={`text-sm ${
                        recipientType === "wallet" ? "text-light" : "text-dark/50"
                      }`}
                      style={{ fontFamily: "Jost_500Medium" }}
                    >
                      Wallet
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setRecipientType("x");
                    }}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 h-8 rounded-full ${
                      recipientType === "x" ? "bg-dark" : ""
                    }`}
                  >
                    <XIcon
                      width={14}
                      height={14}
                      fill={recipientType === "x" ? "#fafafa" : "#121212"}
                    />
                    <Text
                      className={`text-sm ${
                        recipientType === "x" ? "text-light" : "text-dark/50"
                      }`}
                      style={{ fontFamily: "Jost_500Medium" }}
                    >
                      X Profile
                    </Text>
                  </Pressable>
                </View>

                {/* Address / handle input */}
                <View className="mb-6">
                  {recipientType === "wallet" ? (
                    <>
                      <Text
                        className="text-sm text-dark/50 mb-1"
                        style={{ fontFamily: "Jost_400Regular" }}
                      >
                        Enter wallet address
                      </Text>
                      <View className="flex-row gap-2">
                        <TextInput
                          value={walletAddress}
                          onChangeText={setWalletAddress}
                          placeholder=""
                          autoCapitalize="none"
                          autoCorrect={false}
                          className="flex-1 h-12 px-4 rounded-full text-dark"
                          style={{
                            fontFamily: "Jost_400Regular",
                            borderWidth: 1,
                            borderColor: "rgba(18, 18, 18, 0.1)",
                          }}
                        />
                        <Pressable
                          onPress={() => {
                            hapticLight();
                            setShowScanner(true);
                          }}
                          className="w-12 h-12 rounded-full items-center justify-center"
                          style={{
                            borderWidth: 1,
                            borderColor: "rgba(18, 18, 18, 0.1)",
                          }}
                        >
                          <ScanIcon width={20} height={20} />
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text
                        className="text-sm text-dark/50 mb-1"
                        style={{ fontFamily: "Jost_400Regular" }}
                      >
                        Enter X profile (without @)
                      </Text>
                      <TextInput
                        value={xHandle}
                        onChangeText={(text) =>
                          setXHandle(text.replace(/^@/, ""))
                        }
                        placeholder=""
                        autoCapitalize="none"
                        autoCorrect={false}
                        className="w-full h-12 px-4 rounded-full text-dark"
                        style={{
                          fontFamily: "Jost_400Regular",
                          borderWidth: 1,
                          borderColor: "rgba(18, 18, 18, 0.1)",
                        }}
                      />
                    </>
                  )}
                </View>

                {/* Fee summary */}
                <View className="gap-2 mb-8">
                  <FeeRow label="Amount" value={`${formatNumber(numAmount)} USDC`} />
                  <FeeRow label="Partner Fees" value={`~${formatNumber(partnerFee)} USDC`} />
                  <FeeRow label="They Receive" value={`~${formatNumber(total)} USDC`} bold />
                </View>

                {/* Review → */}
                <Pressable
                  onPress={() => {
                    hapticLight();
                    handleReview();
                  }}
                  disabled={!canProceed || isResolvingX}
                  className="w-full h-10 bg-dark rounded-full items-center justify-center"
                  style={{
                    opacity: !canProceed || isResolvingX ? 0.4 : 1,
                    shadowColor: "#121212",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 4,
                  }}
                >
                  <Text
                    className="text-light"
                    style={{ fontFamily: "Jost_600SemiBold" }}
                  >
                    Review →
                  </Text>
                </Pressable>

                {recipientType === "wallet" && (
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      handleClose();
                      onSendViaClaim();
                    }}
                    className="w-full mt-4 items-center"
                  >
                    <Text
                      className="text-dark/50 text-sm"
                      style={{
                        fontFamily: "Jost_400Regular",
                        textDecorationLine: "underline",
                        textDecorationStyle: "dashed",
                      }}
                    >
                      Generate a claim link instead
                    </Text>
                  </Pressable>
                )}
              </Animated.View>
            )}

            {/* ── STEP 2: CONFIRM ── */}
            {state === "confirm" && (
              <Animated.View entering={FadeIn.duration(220)}>
                {/* Recipient card */}
                <View
                  className="rounded-2xl p-4 mb-6"
                  style={{
                    backgroundColor: "rgba(18,18,18,0.04)",
                    borderWidth: 1,
                    borderColor: "rgba(18,18,18,0.07)",
                  }}
                >
                  <Text
                    className="text-xs text-dark/40 mb-1"
                    style={{ fontFamily: "Jost_400Regular" }}
                  >
                    Sending to
                  </Text>
                  <Text
                    className="text-dark"
                    style={{ fontFamily: "Jost_500Medium" }}
                  >
                    {displayRecipient}
                  </Text>
                </View>

                {/* Fee breakdown with divider */}
                <View className="gap-2 mb-8">
                  <FeeRow label="Amount" value={`${formatNumber(numAmount)} USDC`} />
                  <FeeRow label="Partner Fees" value={`~${formatNumber(partnerFee)} USDC`} />
                  <View
                    style={{
                      height: 1,
                      backgroundColor: "rgba(18,18,18,0.08)",
                      marginVertical: 4,
                    }}
                  />
                  <FeeRow label="They Receive" value={`~${formatNumber(total)} USDC`} bold />
                </View>

                {/* Send CTA — larger, more prominent */}
                <Pressable
                  onPress={() => {
                    hapticLight();
                    handleSend();
                  }}
                  className="w-full h-12 bg-dark rounded-full items-center justify-center mb-3"
                  style={{
                    shadowColor: "#121212",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 4,
                  }}
                >
                  <Text
                    className="text-light"
                    style={{ fontFamily: "Jost_600SemiBold", fontSize: 16 }}
                  >
                    Send {formatNumber(numAmount)} USDC
                  </Text>
                </Pressable>

                {/* Back link */}
                <Pressable
                  onPress={() => setState("input")}
                  className="w-full items-center py-2"
                >
                  <Text
                    className="text-dark/40 text-sm"
                    style={{ fontFamily: "Jost_400Regular" }}
                  >
                    ← Back
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* ── LOADING ── */}
            {state === "loading" && (
              <View className="items-center justify-center py-12">
                <Spinner size={48} color="#121212" />
                <Text
                  className="mt-4 text-dark/70"
                  style={{ fontFamily: "Jost_400Regular" }}
                >
                  Processing...
                </Text>
              </View>
            )}

            {/* ── SUCCESS ── */}
            {state === "success" && (
              <Animated.View
                entering={FadeIn.duration(200)}
                className="items-center"
              >
                {/* Animated checkmark + particles */}
                <View
                  className="items-center justify-center mb-6"
                  style={{ height: 88 }}
                >
                  <SuccessParticles />
                  <Animated.View style={successStyle}>
                    <View
                      className="w-16 h-16 rounded-full items-center justify-center"
                      style={{ backgroundColor: "rgba(18,18,18,0.06)" }}
                    >
                      <SuccessAltIcon width={30} height={18} />
                    </View>
                  </Animated.View>
                </View>

                <Text
                  className="text-dark mb-1"
                  style={{ fontFamily: "Jost_600SemiBold", fontSize: 20 }}
                >
                  Sent
                </Text>
                <Text
                  className="text-dark/50 text-sm text-center mb-8"
                  style={{ fontFamily: "Jost_400Regular" }}
                >
                  {formatNumber(numAmount)} USDC → {displayRecipient}
                </Text>

                <Pressable
                  onPress={() => {
                    hapticLight();
                    handleClose();
                  }}
                  className="w-full h-10 rounded-full items-center justify-center"
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(18, 18, 18, 0.2)",
                  }}
                >
                  <Text
                    className="text-dark/60"
                    style={{ fontFamily: "Jost_500Medium" }}
                  >
                    Done
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* ── ERROR ── */}
            {state === "error" && (
              <View className="items-center justify-center py-8">
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                >
                  <Text className="text-red-500 text-2xl">!</Text>
                </View>
                <Text
                  className="text-dark mb-2"
                  style={{ fontFamily: "Jost_500Medium" }}
                >
                  Transaction Failed
                </Text>
                <Text
                  className="text-dark/60 text-sm text-center mb-6"
                  style={{ fontFamily: "Jost_400Regular" }}
                >
                  {errorMessage || "Something went wrong"}
                </Text>
                <Pressable
                  onPress={() => {
                    hapticLight();
                    setState("input");
                    setErrorMessage(null);
                  }}
                  className="w-full h-10 bg-dark rounded-full items-center justify-center"
                  style={{
                    shadowColor: "#121212",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 4,
                  }}
                >
                  <Text
                    className="text-light"
                    style={{ fontFamily: "Jost_600SemiBold" }}
                  >
                    Try Again
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </Pressable>
        <QRScanner
          visible={showScanner}
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      </AnimatedBottomSheet>
  );
}
