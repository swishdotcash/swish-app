import { useState, useEffect } from "react";
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
import * as Clipboard from "expo-clipboard";
import { Spinner } from "./Spinner";
import { useSendClaimTransaction } from "@/hooks/useSendClaimTransaction";
import { useFee } from "@/hooks/useFee";
import { formatNumber } from "@/utils";

import SendIcon from "@/assets/send-alt.svg";
import CopyIcon from "@/assets/copy-icon.svg";
import SuccessIcon from "@/assets/success.svg";

interface SendClaimModalProps {
  visible: boolean;
  onClose: () => void;
  amount: string;
  signature: string | null;
  senderPublicKey: string | null;
}

type ModalState = "input" | "loading" | "success" | "error";

export function SendClaimModal({
  visible,
  onClose,
  amount,
  signature,
  senderPublicKey,
}: SendClaimModalProps) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<ModalState>("input");
  const [claimLink, setClaimLink] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { sendClaim } = useSendClaimTransaction();
  const { baseFee, feePercent } = useFee();

  const numAmount = parseFloat(amount) || 0;
  const partnerFee = baseFee + numAmount * feePercent;
  const total = numAmount - partnerFee;

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

  const handleProceed = async () => {
    if (!signature || !senderPublicKey) {
      setErrorMessage("No session signature. Please reconnect wallet.");
      setState("error");
      return;
    }

    setState("loading");
    setErrorMessage(null);

    try {
      const result = await sendClaim({
        amount: numAmount,
        token: "USDC",
        message: message.trim() || undefined,
        signature,
        senderPublicKey,
      });

      setClaimLink(result.claimLink);
      setPassphrase(result.passphrase);
      setState("success");
    } catch (error: any) {
      console.error("Send claim failed:", error);
      setErrorMessage(error.message || "Something went wrong");
      setState("error");
    }
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(`${claimLink}\n\nPassphrase: ${passphrase}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setState("input");
    setMessage("");
    setClaimLink("");
    setPassphrase("");
    setErrorMessage(null);
    setCopied(false);
    onClose();
  };

  const handleRetry = () => {
    setState("input");
    setErrorMessage(null);
  };

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
              <SendIcon width={24} height={24} />
              <Text
                className="text-2xl text-dark"
                style={{ fontFamily: "Jost_600SemiBold" }}
              >
                Send via Claim
              </Text>
            </View>

            {state === "input" && (
              <View>
                {/* Message Input */}
                <View className="mb-6">
                  <Text
                    className="text-sm text-dark/50 mb-1"
                    style={{ fontFamily: "Jost_400Regular" }}
                  >
                    Add message (optional)
                  </Text>
                  <View>
                    <TextInput
                      value={message}
                      onChangeText={(text) => {
                        if (text.length <= 50) setMessage(text);
                      }}
                      maxLength={50}
                      placeholder=""
                      className="w-full h-12 px-4 pr-16 rounded-full text-dark"
                      style={{
                        fontFamily: "Jost_400Regular",
                        borderWidth: 1,
                        borderColor: "rgba(18, 18, 18, 0.1)",
                      }}
                    />
                    <Text
                      className="absolute right-4 top-1/2 text-xs"
                      style={{
                        fontFamily: "Jost_400Regular",
                        transform: [{ translateY: -6 }],
                        color: message.length >= 50 ? "#ef4444" : "rgba(18,18,18,0.3)",
                      }}
                    >
                      {message.length}/50
                    </Text>
                  </View>
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
                    Proceed
                  </Text>
                </Pressable>
              </View>
            )}

            {state === "loading" && (
              <View className="items-center justify-center py-12">
                <Spinner size={48} color="#121212" />
                <Text
                  className="mt-4 text-dark/70"
                  style={{ fontFamily: "Jost_400Regular" }}
                >
                  Generating claim link...
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

                {/* Copy Link Button */}
                <Pressable
                  onPress={copied ? undefined : handleCopyLink}
                  className="w-full h-10 bg-dark rounded-full flex-row items-center justify-center gap-2"
                  style={{
                    opacity: copied ? 0.7 : 1,
                    shadowColor: "#121212",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 4,
                  }}
                >
                  {copied ? (
                    <SuccessIcon width={16} height={8} />
                  ) : (
                    <CopyIcon width={14} height={14} color="#fafafa" />
                  )}
                  <Text
                    className="text-light"
                    style={{ fontFamily: "Jost_600SemiBold" }}
                  >
                    {copied ? "Copied!" : "Copy Claim Link"}
                  </Text>
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
                  Failed to Generate Link
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
    </Modal>
  );
}
