import { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Keyboard,
  Platform,
} from "react-native";
import { AnimatedBottomSheet } from "./AnimatedBottomSheet";
import { PublicKey } from "@solana/web3.js";
import { Spinner } from "./Spinner";
import { QRScanner } from "./QRScanner";
import { useWithdrawTransaction } from "@/hooks/useWithdrawTransaction";
import { formatNumber } from "@/utils";

import { hapticLight, hapticSuccess, hapticError } from "@/utils/haptics";
import { formatError } from "@/utils/formatError";
import SendIcon from "@/assets/send-alt.svg";
import ScanIcon from "@/assets/scan-icon.svg";
import SuccessAltIcon from "@/assets/success-alt.svg";

interface WithdrawModalProps {
  visible: boolean;
  onClose: () => void;
  usdcBalance: number;
  signature: string | null;
  senderPublicKey: string | null;
}

type ModalState = "input" | "loading" | "success" | "error";

export function WithdrawModal({
  visible,
  onClose,
  usdcBalance,
  signature,
  senderPublicKey,
}: WithdrawModalProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [state, setState] = useState<ModalState>("input");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { withdraw } = useWithdrawTransaction();

  const numAmount = parseFloat(amount) || 0;

  const isValidAddress = useMemo(() => {
    if (!walletAddress) return false;
    try {
      new PublicKey(walletAddress);
      return true;
    } catch {
      return false;
    }
  }, [walletAddress]);

  const isValidAmount = numAmount > 0 && numAmount <= usdcBalance;
  const canProceed = isValidAddress && isValidAmount;

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

  const handleProceed = async () => {
    if (!canProceed || !signature || !senderPublicKey) return;

    setState("loading");
    setErrorMessage(null);

    try {
      await withdraw({
        receiverAddress: walletAddress,
        amount: numAmount,
        signature,
        senderPublicKey,
      });
      setState("success");
      hapticSuccess();
    } catch (error: any) {
      console.error("Withdraw failed:", error);
      setErrorMessage(formatError(error));
      setState("error");
      hapticError();
    }
  };

  const handleClose = () => {
    setState("input");
    setWalletAddress("");
    setAmount("");
    setErrorMessage(null);
    onClose();
  };

  const handleRetry = () => {
    setState("input");
    setErrorMessage(null);
  };

  const handleMax = () => {
    setAmount(String(usdcBalance));
  };

  const handleQRScan = (address: string) => {
    setWalletAddress(address);
    setShowQRScanner(false);
  };

  const formatAddress = (addr: string) => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
      <AnimatedBottomSheet visible={visible} onClose={handleClose}>
          <Pressable onPress={() => {}} className="bg-light rounded-t-3xl">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingBottom:
                  keyboardHeight > 0 ? keyboardHeight + 60 : 40,
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
                  Withdraw
                </Text>
              </View>

              {state === "input" && (
                <View>
                  {/* Wallet Address Input */}
                  <View className="mb-4">
                    <Text
                      className="text-sm text-dark/50 mb-1"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      Destination wallet address
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
                        onPress={() => { hapticLight(); setShowQRScanner(true); }}
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{
                          borderWidth: 1,
                          borderColor: "rgba(18, 18, 18, 0.1)",
                        }}
                      >
                        <ScanIcon width={20} height={20} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Amount Input */}
                  <View className="mb-6">
                    <Text
                      className="text-sm text-dark/50 mb-1"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      Amount (USDC)
                    </Text>
                    <View className="flex-row gap-2">
                      <TextInput
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        className="flex-1 h-12 px-4 rounded-full text-dark"
                        style={{
                          fontFamily: "Jost_400Regular",
                          borderWidth: 1,
                          borderColor: "rgba(18, 18, 18, 0.1)",
                        }}
                      />
                      <Pressable
                        onPress={() => { hapticLight(); handleMax(); }}
                        className="h-12 px-4 rounded-full items-center justify-center"
                        style={{
                          borderWidth: 1,
                          borderColor: "rgba(18, 18, 18, 0.1)",
                        }}
                      >
                        <Text
                          className="text-dark/70 text-sm"
                          style={{ fontFamily: "Jost_500Medium" }}
                        >
                          Max
                        </Text>
                      </Pressable>
                    </View>
                    <Text
                      className="text-xs text-dark/40 mt-1 ml-4"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      Available: {formatNumber(usdcBalance)} USDC
                    </Text>
                  </View>

                  {/* Summary */}
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
                        Network Fee
                      </Text>
                      <Text
                        className="text-dark"
                        style={{ fontFamily: "Jost_400Regular" }}
                      >
                        Sponsored
                      </Text>
                    </View>
                  </View>

                  {/* Proceed Button */}
                  <Pressable
                    onPress={() => { hapticLight(); handleProceed(); }}
                    disabled={!canProceed}
                    className="w-full h-10 bg-dark rounded-full items-center justify-center"
                    style={{
                      opacity: !canProceed ? 0.4 : 1,
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
                      Withdraw
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
                    Processing withdrawal...
                  </Text>
                </View>
              )}

              {state === "success" && (
                <View>
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
                        {formatAddress(walletAddress)}
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
                        Network Fee
                      </Text>
                      <Text
                        className="text-dark"
                        style={{ fontFamily: "Jost_400Regular" }}
                      >
                        Sponsored
                      </Text>
                    </View>
                  </View>

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
                    Withdrawal Failed
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
        <QRScanner
          visible={showQRScanner}
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      </AnimatedBottomSheet>
  );
}
