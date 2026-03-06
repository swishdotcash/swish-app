import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TouchableOpacity,
  Linking,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  withSequence,
  withTiming,
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import { NumberPad, ActionButton, Spinner } from "@/components";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/providers/AuthProvider";
import { useSessionSignature } from "@/hooks/useSessionSignature";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { useUserRegistration } from "@/hooks/useUserRegistration";
import { formatNumber } from "@/utils";

import ChevronDownIcon from "@/assets/chevron-down-icon.svg";
import SolIcon from "@/assets/sol-icon.svg";
import XIcon from "@/assets/x-icon.svg";
import CopyIcon from "@/assets/copy-icon.svg";
import SuccessAltIcon from "@/assets/success-alt.svg";
import LogoutIcon from "@/assets/logout-icon.svg";

export default function HomeScreen() {
  const {
    authenticated,
    loginWithTwitter,
    connectWallet,
    logout,
    address,
    authMethod,
    twitterHandle,
  } = useAuth();
  const { signature, needsSignature, error: signError, requestSignature } =
    useSessionSignature();
  useUserRegistration();
  const {
    balance,
    isLoading: balanceLoading,
    refetch: refetchUSDCBalance,
  } = useUSDCBalance(address);

  const [amount, setAmount] = useState("0");
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const isXUser = authMethod === "twitter";
  const showSignModal = isXUser && authenticated && !signature && !!address && !!signError;

  const numAmount = parseFloat(amount) || 0;
  const hasValidAmount = numAmount > 0;
  const exceedsBalance = balance !== null && numAmount > balance;

  const handleNumberPress = (num: string) => {
    if (amount === "0" && num !== ".") {
      setAmount(num);
    } else if (num === "." && amount.includes(".")) {
      return;
    } else {
      setAmount(amount + num);
    }
  };

  const handleBackspace = () => {
    if (amount.length === 1) {
      setAmount("0");
    } else {
      setAmount(amount.slice(0, -1));
    }
  };

  const handleActionPress = (action: "send" | "receive") => {
    if (!authenticated) {
      setShowLoginModal(true);
      return;
    }
    if (!hasValidAmount) return;
    if (action === "send" && exceedsBalance) return;
    // TODO: Open send/receive modals (feat/send, feat/request branches)
  };

  const handleCopyAddress = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddr = (addr: string) => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const getBalanceDisplay = useCallback(() => {
    if (!authenticated) return "Connect Wallet";
    if (balanceLoading || !address) return "Loading...";
    if (balance !== null) return `${formatNumber(balance)} USDC`;
    return "0 USDC";
  }, [authenticated, balanceLoading, balance, address]);

  const handleBalancePress = () => {
    if (!authenticated) {
      setShowLoginModal(true);
      return;
    }
    setShowDropdown((prev) => !prev);
  };

  return (
    <View className="flex-1 items-center justify-center px-4">
      {/* Amount Display */}
      <View className="items-center mb-8 w-full">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="max-w-[320px]"
        >
          <Text
            className="text-6xl text-dark text-center"
            style={{ fontFamily: "Jost_300Light" }}
          >
            {amount}
          </Text>
        </ScrollView>

        {/* Balance / Connect */}
        <View className="relative mt-2" style={{ zIndex: 10 }}>
          <Pressable
            onPress={handleBalancePress}
            className="flex-row items-center gap-1.5"
            style={{ minHeight: 32, justifyContent: "center" }}
          >
            <Text
              className={`text-sm text-dark/50 ${!authenticated ? "underline" : ""}`}
              style={{
                fontFamily: "Jost_400Regular",
                ...((!authenticated) ? { textDecorationStyle: "dashed" } : {}),
              }}
            >
              {getBalanceDisplay()}
            </Text>
            {authenticated && (
              <ChevronDownIcon
                width={10}
                height={10}
                style={{
                  transform: [{ rotate: showDropdown ? "180deg" : "0deg" }],
                }}
              />
            )}
          </Pressable>

          {/* Dropdown — positioned below the balance text */}
          {showDropdown && authenticated && (
            <View
              className="absolute z-50 w-64 bg-light rounded-2xl overflow-hidden"
              style={{
                top: 36,
                alignSelf: "center",
                borderWidth: 1,
                borderColor: "rgba(18, 18, 18, 0.1)",
                shadowColor: "#121212",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              {/* Wallet Address */}
              <Pressable
                onPress={copied ? undefined : handleCopyAddress}
                className="flex-row items-center gap-2.5 px-4 py-3"
              >
                <SolIcon width={16} height={16} />
                <Text
                  className="text-dark text-sm flex-1"
                  style={{ fontFamily: "Jost_400Regular" }}
                >
                  {address ? formatAddr(address) : ""}
                </Text>
                {copied ? (
                  <SuccessAltIcon width={16} height={8} />
                ) : (
                  <CopyIcon width={14} height={14} />
                )}
              </Pressable>

              {/* X Handle */}
              {isXUser && twitterHandle && (
                <Pressable
                  onPress={() => {
                    setShowDropdown(false);
                    Linking.openURL(`https://x.com/${twitterHandle}`);
                  }}
                  className="flex-row items-center gap-2.5 px-4 py-3"
                >
                  <XIcon width={16} height={16} fill="#121212" />
                  <Text
                    className="text-dark/60 text-sm"
                    style={{ fontFamily: "Jost_400Regular" }}
                  >
                    @{twitterHandle}
                  </Text>
                </Pressable>
              )}

              {/* Logout */}
              <Pressable
                onPress={() => {
                  setShowDropdown(false);
                  logout();
                }}
                className="flex-row items-center gap-2.5 px-4 py-3"
              >
                <LogoutIcon width={16} height={16} />
                <Text
                  className="text-dark text-sm"
                  style={{ fontFamily: "Jost_400Regular" }}
                >
                  Logout
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Close dropdown on tap outside */}
      {showDropdown && (
        <Pressable
          onPress={() => setShowDropdown(false)}
          className="absolute inset-0"
          style={{ zIndex: 5 }}
        />
      )}

      {/* Number Pad */}
      <View className="mb-8 w-full max-w-[320px]">
        <NumberPad
          onNumberPress={handleNumberPress}
          onBackspace={handleBackspace}
        />
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-4 w-full max-w-[320px]">
        <View className="flex-1">
          <ActionButton
            variant="send"
            onPress={() => handleActionPress("send")}
            disabled={authenticated && (!hasValidAmount || exceedsBalance)}
          />
        </View>
        <View className="flex-1">
          <ActionButton
            variant="receive"
            onPress={() => handleActionPress("receive")}
            disabled={authenticated && !hasValidAmount}
          />
        </View>
      </View>

      {/* Login Method Selection Modal */}
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

            {/* Twitter Login */}
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

            {/* Wallet Connect via MWA */}
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

      {/* Mandatory Sign-In Modal for Twitter Users */}
      <Modal
        visible={showSignModal}
        transparent
        animationType="slide"
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-light rounded-t-3xl px-6 pb-10 pt-6">
            <View className="items-center mb-2">
              <View className="w-10 h-1 bg-dark/20 rounded-full mb-4" />
            </View>
            <View className="items-center">
              <Logo width={48} height={48} />
              <Text
                className="text-lg text-dark mt-4 mb-2"
                style={{ fontFamily: "Jost_600SemiBold" }}
              >
                Sign In Required
              </Text>
              <Text
                className="text-sm text-dark/60 text-center mb-6"
                style={{ fontFamily: "Jost_400Regular" }}
              >
                Please sign the message to verify your wallet and continue using
                Swish.
              </Text>
              <Pressable
                onPress={requestSignature}
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
                  Sign In
                </Text>
              </Pressable>
              {signError && (
                <Text
                  className="text-red-500 text-xs mt-3 text-center"
                  style={{ fontFamily: "Jost_400Regular" }}
                >
                  {signError}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
