import { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  Keyboard,
  Platform,
} from "react-native";
import { QRScanner } from "./QRScanner";
import { PublicKey } from "@solana/web3.js";
import { Spinner } from "./Spinner";
import { useSendTransaction } from "@/hooks/useSendTransaction";
import { useFee } from "@/hooks/useFee";
import { formatNumber } from "@/utils";
import { API_BASE_URL } from "@/constants/api";

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

type ModalState = "input" | "loading" | "success" | "error";
type RecipientType = "wallet" | "x";

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
  const [recipientType, setRecipientType] = useState<RecipientType>("wallet");
  const [state, setState] = useState<ModalState>("input");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResolvingX, setIsResolvingX] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { send } = useSendTransaction();
  const { baseFee, feePercent } = useFee();

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

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

  const resolveXHandle = async (): Promise<string | null> => {
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
    } catch (err: any) {
      throw err;
    } finally {
      setIsResolvingX(false);
    }
  };

  const handleProceed = async () => {
    if (!canProceed || !signature || !senderPublicKey) return;

    setState("loading");
    setErrorMessage(null);

    try {
      let receiverAddress = walletAddress;

      if (recipientType === "x") {
        const resolved = await resolveXHandle();
        if (!resolved) {
          throw new Error("Could not resolve X handle to wallet address");
        }
        receiverAddress = resolved;
        setWalletAddress(resolved);
      }

      await send({
        receiverAddress,
        amount: numAmount,
        token: "USDC",
        signature,
        senderPublicKey,
      });
      setState("success");
    } catch (error: any) {
      console.error("Send failed:", error);
      setErrorMessage(error.message || "Transaction failed");
      setState("error");
    }
  };

  const handleClose = () => {
    setState("input");
    setWalletAddress("");
    setXHandle("");
    setRecipientType("wallet");
    setErrorMessage(null);
    setIsResolvingX(false);
    setShowScanner(false);
    onClose();
  };

  const handleQRScan = useCallback((data: string) => {
    setWalletAddress(data);
    setShowScanner(false);
  }, []);

  const handleRetry = () => {
    setState("input");
    setErrorMessage(null);
  };

  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const displayRecipient =
    recipientType === "x" && xHandle
      ? `@${xHandle}`
      : formatAddress(walletAddress);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
        <Pressable
          onPress={handleClose}
          className="flex-1 bg-black/40 justify-end"
        >
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
                Send
              </Text>
            </View>

            {state === "input" && (
              <View>
                {/* Recipient Type Toggle */}
                <View className="flex-row mb-4 bg-dark/5 rounded-full p-1">
                  <Pressable
                    onPress={() => setRecipientType("wallet")}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 h-8 rounded-full ${
                      recipientType === "wallet" ? "bg-dark" : ""
                    }`}
                  >
                    <SolIcon width={14} height={14} />
                    <Text
                      className={`text-sm ${
                        recipientType === "wallet"
                          ? "text-light"
                          : "text-dark/50"
                      }`}
                      style={{ fontFamily: "Jost_500Medium" }}
                    >
                      Wallet
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setRecipientType("x")}
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

                {/* Recipient Input */}
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
                          onPress={() => setShowScanner(true)}
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

                {/* Amount Details */}
                <View className="gap-2 mb-8">
                  <View className="flex-row justify-between">
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      Amount
                    </Text>
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      {formatNumber(numAmount)} USDC
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      Partner Fees
                    </Text>
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      ~{formatNumber(partnerFee)} USDC
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_600SemiBold" }}
                    >
                      They Receive
                    </Text>
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_600SemiBold" }}
                    >
                      ~{formatNumber(total)} USDC
                    </Text>
                  </View>
                </View>

                {/* Proceed Button */}
                <Pressable
                  onPress={handleProceed}
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
                    {isResolvingX ? "Resolving..." : "Proceed"}
                  </Text>
                </Pressable>

                {/* Generate Claim Link */}
                {recipientType === "wallet" && (
                  <Pressable
                    onPress={() => {
                      handleClose();
                      onSendViaClaim();
                    }}
                    className="w-full mt-4 items-center"
                  >
                    <Text
                      className="text-dark/70 text-sm underline"
                      style={{
                        fontFamily: "Jost_400Regular",
                        textDecorationStyle: "dashed",
                      }}
                    >
                      Generate a claim link
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {state === "loading" && (
              <View className="items-center justify-center py-12">
                <Spinner size={48} color="#121212" />
                <Text
                  className="mt-4 text-dark/70"
                  style={{ fontFamily: "Jost_400Regular" }}
                >
                  Processing transaction...
                </Text>
              </View>
            )}

            {state === "success" && (
              <View>
                {/* Success Details */}
                <View className="gap-2 mb-8">
                  <View className="flex-row justify-between">
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      Sent To
                    </Text>
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      {displayRecipient}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      Amount
                    </Text>
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      {formatNumber(numAmount)} USDC
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      Partner Fees
                    </Text>
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      ~{formatNumber(partnerFee)} USDC
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_600SemiBold" }}
                    >
                      They Receive
                    </Text>
                    <Text
                      className="text-dark"
                      style={{ fontFamily: "Jost_600SemiBold" }}
                    >
                      ~{formatNumber(total)} USDC
                    </Text>
                  </View>
                </View>

                {/* Success Button */}
                <Pressable
                  onPress={handleClose}
                  className="w-full h-10 bg-light rounded-full items-center justify-center"
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
              </View>
            )}

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
                  onPress={handleRetry}
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
        </Pressable>

      {/* QR Scanner Overlay */}
      <QRScanner
        visible={showScanner}
        onScan={handleQRScan}
        onClose={() => setShowScanner(false)}
      />
    </Modal>
  );
}
