import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  withSequence,
  withTiming,
  withSpring,
  withRepeat,
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  Keyframe,
  Easing,
} from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import { NumberPad, ActionButton, Spinner, SendModal, ReceiveModal, SendClaimModal } from "@/components";
import { Logo } from "@/components/Logo";
import { FeatureCarousel } from "@/components/FeatureCarousel";
import { AnimatedBottomSheet } from "@/components/AnimatedBottomSheet";
import { useAuth } from "@/providers/AuthProvider";
import { useSessionSignature } from "@/hooks/useSessionSignature";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { useUserRegistration } from "@/hooks/useUserRegistration";
import { formatNumber } from "@/utils";
import { SPRING_BOUNCY, SPRING_SNAPPY, SPRING_SMOOTH } from "@/utils/animations";

import { hapticLight, hapticMedium } from "@/utils/haptics";
import ChevronDownIcon from "@/assets/chevron-down-icon.svg";
import SolIcon from "@/assets/sol-icon.svg";
import XIcon from "@/assets/x-icon.svg";
import CopyIcon from "@/assets/copy-icon.svg";
import SuccessAltIcon from "@/assets/success-alt.svg";
import LogoutIcon from "@/assets/logout-icon.svg";

function formatAmountDisplay(rawAmount: string): string {
  const [intPart, decPart] = rawAmount.split(".");
  const intNum = parseInt(intPart || "0", 10);
  const formattedInt = isNaN(intNum) ? "0" : intNum.toLocaleString("en-US");
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

// Dropdown entering: fade + scale up from slightly above
const dropdownEntering = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.95 }, { translateY: -8 }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
}).duration(200).easing(Easing.bezier(0.16, 1, 0.3, 1));

const dropdownExiting = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
  100: { opacity: 0, transform: [{ scale: 0.96 }, { translateY: -6 }] },
}).duration(120).easing(Easing.bezier(0.4, 0, 1, 1));

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
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSendClaimModal, setShowSendClaimModal] = useState(false);

  // Amount animation
  const amountScale = useSharedValue(1);
  const animatedAmountStyle = useAnimatedStyle(() => ({
    transform: [{ scale: amountScale.value }],
  }));

  // Chevron rotation (animated, not static string)
  const chevronRotation = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));
  useEffect(() => {
    chevronRotation.value = withSpring(showDropdown ? 180 : 0, SPRING_BOUNCY);
  }, [showDropdown]);

  // Shimmer for balance loading skeleton
  const shimmerOpacity = useSharedValue(0.3);
  useEffect(() => {
    shimmerOpacity.value = withRepeat(
      withTiming(0.75, { duration: 700, easing: Easing.inOut(Easing.sine) }),
      -1,
      true
    );
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  const isXUser = authMethod === "twitter";
  const showSignModal = isXUser && authenticated && !signature && !!address && !!signError;

  const numAmount = parseFloat(amount) || 0;
  const hasValidAmount = numAmount > 0;
  const exceedsBalance = balance !== null && numAmount > balance;

  const handleNumberPress = (num: string) => {
    if (num === "." && amount.includes(".")) return;
    amountScale.value = withSequence(
      withSpring(1.06, SPRING_SNAPPY),
      withSpring(1, SPRING_BOUNCY)
    );
    if (amount === "0" && num !== ".") {
      setAmount(num);
    } else {
      setAmount(amount + num);
    }
  };

  const handleBackspace = () => {
    if (amount === "0") return;
    amountScale.value = withSequence(
      withSpring(0.94, SPRING_SNAPPY),
      withSpring(1, SPRING_BOUNCY)
    );
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

    if (action === "send") setShowSendModal(true);
    if (action === "receive") setShowReceiveModal(true);
  };

  const handleCopyAddress = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    hapticLight();
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddr = (addr: string) => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const getBalanceDisplay = useCallback(() => {
    if (!authenticated) return null; // handled separately
    if (balance !== null) return `${formatNumber(balance)} USDC`;
    return "0 USDC";
  }, [authenticated, balance]);

  const handleBalancePress = () => {
    hapticLight();
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
        <Animated.View style={animatedAmountStyle}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="max-w-[320px]"
            contentContainerStyle={{ alignItems: "center" }}
          >
            <Text
              className="text-6xl text-dark text-center"
              style={{ fontFamily: "Jost_300Light" }}
            >
              {formatAmountDisplay(amount)}
            </Text>
          </ScrollView>
        </Animated.View>

        {/* Balance / Connect */}
        <View className="relative mt-2" style={{ zIndex: 10 }}>
          <Pressable
            onPress={handleBalancePress}
            className="flex-row items-center gap-1.5"
            style={{ minHeight: 32, justifyContent: "center" }}
          >
            {/* Skeleton while loading */}
            {authenticated && (balanceLoading || !address) ? (
              <Animated.View
                style={[
                  shimmerStyle,
                  {
                    width: 80,
                    height: 14,
                    borderRadius: 999,
                    backgroundColor: "rgba(18,18,18,0.15)",
                  },
                ]}
              />
            ) : (
              <>
                <Text
                  className={`text-sm text-dark/50 ${!authenticated ? "underline" : ""}`}
                  style={{
                    fontFamily: "Jost_400Regular",
                    ...(!authenticated ? { textDecorationStyle: "dashed" } : {}),
                  }}
                >
                  {!authenticated ? "Connect Wallet" : getBalanceDisplay()}
                </Text>
                {authenticated && (
                  <Animated.View style={chevronStyle}>
                    <ChevronDownIcon width={10} height={10} />
                  </Animated.View>
                )}
              </>
            )}
          </Pressable>

          {/* Dropdown — animated spring unfold with staggered rows */}
          {showDropdown && authenticated && (
            <Animated.View
              entering={dropdownEntering}
              exiting={dropdownExiting}
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
              <Animated.View entering={FadeIn.delay(30).duration(160)}>
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
              </Animated.View>

              {/* X Handle */}
              {isXUser && twitterHandle && (
                <Animated.View entering={FadeIn.delay(65).duration(160)}>
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setShowDropdown(false);
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
                </Animated.View>
              )}

              {/* Logout */}
              <Animated.View entering={FadeIn.delay(isXUser && twitterHandle ? 100 : 65).duration(160)}>
                <Pressable
                  onPress={() => {
                    hapticLight();
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
              </Animated.View>
            </Animated.View>
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

      {/* Unauthenticated hint — gentle animated label */}
      {!authenticated && amount === "0" && (
        <Animated.View
          entering={FadeIn.duration(400)}
          className="mb-6 items-center"
        >
          <Text
            className="text-xs text-dark/30 text-center"
            style={{ fontFamily: "Jost_400Regular", letterSpacing: 0.5 }}
          >
            connect a wallet to send & receive
          </Text>
        </Animated.View>
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

      {/* Login Modal — with FeatureCarousel (inspired by FuseAppOnboarding TextCarousel) */}
      <AnimatedBottomSheet visible={showLoginModal} onClose={() => setShowLoginModal(false)}>
          <Pressable
            onPress={() => {}}
            className="bg-light rounded-t-3xl px-6 pb-10 pt-6"
          >
            {/* Handle bar */}
            <View className="items-center mb-4">
              <View className="w-10 h-1 bg-dark/20 rounded-full" />
            </View>

            {/* Feature carousel — shows what Swish can do */}
            <View className="mb-6">
              <Text
                className="text-xs text-dark/30 mb-2"
                style={{ fontFamily: "Jost_400Regular", letterSpacing: 0.8 }}
              >
                SWISH LET'S YOU
              </Text>
              <FeatureCarousel />
            </View>

            {/* Primary: Twitter/X */}
            <Animated.View entering={FadeIn.delay(80).duration(240)}>
              <Pressable
                onPress={() => {
                  hapticLight();
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
            </Animated.View>

            {/* Secondary: Wallet (ghost) */}
            <Animated.View entering={FadeIn.delay(130).duration(240)}>
              <Pressable
                onPress={() => {
                  hapticLight();
                  setShowLoginModal(false);
                  connectWallet();
                }}
                className="w-full h-12 bg-transparent rounded-full flex-row items-center justify-center gap-2"
                style={{
                  borderWidth: 1,
                  borderColor: "rgba(18, 18, 18, 0.15)",
                }}
              >
                <SolIcon width={16} height={16} />
                <Text
                  className="text-dark/60 text-sm"
                  style={{ fontFamily: "Jost_500Medium" }}
                >
                  Connect Wallet
                </Text>
              </Pressable>
            </Animated.View>
          </Pressable>
      </AnimatedBottomSheet>

      {/* Send Modal */}
      <SendModal
        visible={showSendModal}
        onClose={() => {
          setShowSendModal(false);
          refetchUSDCBalance();
        }}
        amount={amount}
        onSendViaClaim={() => {
          setShowSendModal(false);
          setShowSendClaimModal(true);
        }}
        signature={signature}
        senderPublicKey={address}
      />

      {/* Receive Modal */}
      <ReceiveModal
        visible={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        amount={amount}
        signature={signature}
        requesterAddress={address}
      />

      {/* Send Claim Modal */}
      <SendClaimModal
        visible={showSendClaimModal}
        onClose={() => {
          setShowSendClaimModal(false);
          refetchUSDCBalance();
        }}
        amount={amount}
        signature={signature}
        senderPublicKey={address}
      />

      {/* Mandatory Sign-In Modal for Twitter Users */}
      <AnimatedBottomSheet visible={showSignModal} onClose={() => {}}>
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
                onPress={() => {
                  hapticLight();
                  requestSignature();
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
      </AnimatedBottomSheet>
    </View>
  );
}
