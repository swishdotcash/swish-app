import { useState, useEffect } from "react";
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
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Spinner } from "./Spinner";
import { AnimatedBottomSheet } from "./AnimatedBottomSheet";
import { useFee } from "@/hooks/useFee";
import { formatNumber } from "@/utils";
import { API_BASE_URL } from "@/constants/api";

import { hapticLight, hapticSuccess, hapticError } from "@/utils/haptics";
import { formatError } from "@/utils/formatError";
import ReceiveIcon from "@/assets/receive-alt.svg";
import SuccessAltIcon from "@/assets/success-alt.svg";

interface ClaimPassphraseModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  activityId: string;
  receiverAddress: string;
  onSuccess: () => void;
}

type ModalState = "input" | "loading" | "success" | "error";

export function ClaimPassphraseModal({
  visible,
  onClose,
  amount,
  activityId,
  receiverAddress,
  onSuccess,
}: ClaimPassphraseModalProps) {
  const [passphrase, setPassphrase] = useState("");
  const [state, setState] = useState<ModalState>("input");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Shake animation for wrong passphrase
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  function triggerShake() {
    shakeX.value = withSequence(
      withTiming(-9, { duration: 50 }),
      withTiming(9, { duration: 50 }),
      withTiming(-7, { duration: 50 }),
      withTiming(7, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(4, { duration: 50 }),
      withTiming(0, { duration: 40 })
    );
  }
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { baseFee, feePercent } = useFee();

  const partnerFee = baseFee + amount * feePercent;
  const total = amount - partnerFee;

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
    if (!passphrase.trim()) return;

    setState("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/send_claim/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId,
          passphrase: passphrase.trim(),
          receiverAddress,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to claim");
      }

      setState("success");
      hapticSuccess();
      onSuccess();
    } catch (error: any) {
      console.error("Claim failed:", error);
      setErrorMessage(formatError(error));
      setState("error");
      hapticError();
      triggerShake();
    }
  };

  const handleClose = () => {
    setState("input");
    setPassphrase("");
    setErrorMessage(null);
    onClose();
  };

  const handleRetry = () => {
    setState("input");
    setErrorMessage(null);
  };

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
              <ReceiveIcon width={24} height={24} />
              <Text
                className="text-2xl text-dark"
                style={{ fontFamily: "Jost_600SemiBold" }}
              >
                Claim
              </Text>
            </View>

            {state === "input" && (
              <View>
                {/* Passphrase Input — shakes on wrong passphrase */}
                <View className="mb-6">
                  <Text
                    className="text-sm text-dark/50 mb-1"
                    style={{ fontFamily: "Jost_400Regular" }}
                  >
                    Enter passphrase
                  </Text>
                  <Animated.View style={shakeStyle}>
                    <TextInput
                      value={passphrase}
                      onChangeText={setPassphrase}
                      placeholder=""
                      autoCapitalize="none"
                      autoCorrect={false}
                      className="w-full h-12 px-4 rounded-full text-dark"
                      style={{
                        fontFamily: "Jost_400Regular",
                        borderWidth: 1,
                        borderColor:
                          state === "error"
                            ? "rgba(239,68,68,0.4)"
                            : "rgba(18, 18, 18, 0.1)",
                      }}
                    />
                  </Animated.View>
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
                      {formatNumber(amount)} USDC
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
                      Total
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
                  onPress={() => { hapticLight(); handleProceed(); }}
                  disabled={!passphrase.trim()}
                  className="w-full h-10 bg-dark rounded-full items-center justify-center"
                  style={{
                    opacity: !passphrase.trim() ? 0.4 : 1,
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
                  Processing claim...
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
                      {formatNumber(amount)} USDC
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
                      Total
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
                  onPress={() => { hapticLight(); handleClose(); }}
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
                  Claim Failed
                </Text>
                <Text
                  className="text-dark/60 text-sm text-center mb-6"
                  style={{ fontFamily: "Jost_400Regular" }}
                >
                  {errorMessage || "Something went wrong"}
                </Text>
                <Pressable
                  onPress={() => { hapticLight(); handleRetry(); }}
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
    </AnimatedBottomSheet>
  );
}
