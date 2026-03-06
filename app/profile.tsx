import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Spinner, WithdrawModal, DepositModal, ExportModal } from "@/components";
import { useAuth } from "@/providers/AuthProvider";
import { useSessionSignature } from "@/hooks/useSessionSignature";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { useSOLBalance } from "@/hooks/useSOLBalance";
import { formatNumber } from "@/utils";
import { API_BASE_URL } from "@/constants/api";

import CopyIcon from "@/assets/copy-icon.svg";
import SuccessAltIcon from "@/assets/success-alt.svg";
import LogoutIcon from "@/assets/logout-icon.svg";
import XIcon from "@/assets/x-icon.svg";
import UsdcIcon from "@/assets/usdc-icon.svg";
import SolIcon from "@/assets/sol-icon.svg";

interface Stats {
  sent_direct: number;
  sent_claim: number;
  total_sent: number;
  total_received: number;
  total_requested: number;
  total_claimed: number;
}

interface Activity {
  id: string;
  type: "send" | "request" | "send_claim";
  status: "open" | "settled" | "cancelled";
  amount: number;
  created_at: string;
  sender_address: string | null;
  receiver_address: string | null;
}

const STATUS_COLORS = {
  open: "#CB9C00",
  settled: "#008834",
  cancelled: "#CB0000",
};

type TabType = "wallet" | "activity";

export default function ProfileScreen() {
  const {
    authenticated,
    loginWithTwitter,
    connectWallet,
    logout,
    address,
    authMethod,
    twitterHandle,
  } = useAuth();
  const { signature } = useSessionSignature();
  const { balance: usdcBalance, isLoading: usdcLoading } =
    useUSDCBalance(address);
  const {
    balance: solBalance,
    balanceUSD: solBalanceUSD,
    isLoading: solLoading,
  } = useSOLBalance(address);

  const [activeTab, setActiveTab] = useState<TabType>("wallet");
  const [copied, setCopied] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const isXUser = authMethod === "twitter";

  useEffect(() => {
    async function fetchUserData() {
      if (!address) return;
      setIsLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/activity/user?address=${address}`
        );
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setActivities(data.activities || []);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (authenticated && address) {
      fetchUserData();
    }
  }, [authenticated, address]);

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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays <= 7) return `${diffDays}d ago`;

    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  const getActivityLabel = (activity: Activity) => {
    const isSender =
      activity.sender_address?.toLowerCase() === address?.toLowerCase();
    switch (activity.type) {
      case "send":
        return isSender
          ? `Sent ${formatNumber(activity.amount)} USDC`
          : `Received ${formatNumber(activity.amount)} USDC`;
      case "send_claim":
        return isSender
          ? `Sent ${formatNumber(activity.amount)} USDC via Claim`
          : `Claimed ${formatNumber(activity.amount)} USDC`;
      case "request":
        if (activity.receiver_address?.toLowerCase() === address?.toLowerCase()) {
          return `Requested ${formatNumber(activity.amount)} USDC`;
        }
        return `Fulfilled ${formatNumber(activity.amount)} USDC`;
      default:
        return `${formatNumber(activity.amount)} USDC`;
    }
  };

  // Not connected
  if (!authenticated) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Pressable
          onPress={() => setShowLoginModal(true)}
          className="px-8 h-10 bg-dark rounded-full items-center justify-center"
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
            Connect Wallet
          </Text>
        </Pressable>

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
      </View>
    );
  }

  // Loading
  if (isLoading && !stats) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Spinner size={48} color="#121212" />
        <Text
          className="mt-4 text-dark/70"
          style={{ fontFamily: "Jost_400Regular" }}
        >
          Loading profile...
        </Text>
      </View>
    );
  }

  const totalUSD = (usdcBalance || 0) + (solBalanceUSD || 0);

  return (
    <>
    <View className="flex-1 items-center justify-center px-4">
      {/* Header: Address + X handle */}
      <View className="w-full max-w-[320px] mb-6">
        <View className="flex-row items-center justify-between gap-2 w-full">
          <Text
            className="text-dark text-lg"
            style={{ fontFamily: "Jost_500Medium" }}
          >
            {address ? formatAddr(address) : ""}
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={copied ? undefined : handleCopyAddress}
              className="p-1 rounded-full"
            >
              {copied ? (
                <SuccessAltIcon width={16} height={8} />
              ) : (
                <CopyIcon width={16} height={16} />
              )}
            </Pressable>
            <Pressable
              onPress={logout}
              className="p-1 rounded-full"
            >
              <LogoutIcon width={16} height={16} />
            </Pressable>
          </View>
        </View>
        {isXUser && twitterHandle && (
          <View className="flex-row items-center gap-1.5 mt-1">
            <XIcon width={14} height={14} fill="#121212" />
            <Text
              className="text-dark/60 text-sm underline"
              style={{
                fontFamily: "Jost_400Regular",
                textDecorationStyle: "dashed",
              }}
            >
              @{twitterHandle}
            </Text>
          </View>
        )}
      </View>

      {/* Tab Toggle */}
      <View className="w-full max-w-[320px] flex-row mb-6 bg-dark/5 rounded-full p-1">
        <Pressable
          onPress={() => setActiveTab("wallet")}
          className={`flex-1 h-8 rounded-full items-center justify-center ${
            activeTab === "wallet" ? "bg-dark" : ""
          }`}
        >
          <Text
            className={`text-sm ${
              activeTab === "wallet" ? "text-light" : "text-dark/50"
            }`}
            style={{ fontFamily: "Jost_500Medium" }}
          >
            Wallet
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("activity")}
          className={`flex-1 h-8 rounded-full items-center justify-center ${
            activeTab === "activity" ? "bg-dark" : ""
          }`}
        >
          <Text
            className={`text-sm ${
              activeTab === "activity" ? "text-light" : "text-dark/50"
            }`}
            style={{ fontFamily: "Jost_500Medium" }}
          >
            Activity
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      {activeTab === "wallet" ? (
        <View className="w-full max-w-[320px]">
          {/* Total Balance */}
          <View className="items-center mb-6">
            <Text
              className="text-dark/50 text-sm mb-1"
              style={{ fontFamily: "Jost_400Regular" }}
            >
              Total Balance
            </Text>
            <Text
              className="text-4xl text-dark"
              style={{ fontFamily: "Jost_400Regular" }}
            >
              {usdcLoading || solLoading
                ? "..."
                : `$${formatNumber(totalUSD)}`}
            </Text>
          </View>

          {/* Token Rows */}
          <View className="gap-3 mb-6">
            {/* USDC */}
            <View className="flex-row items-center gap-3">
              <UsdcIcon width={32} height={32} />
              <View className="flex-1">
                <Text
                  className="text-dark"
                  style={{ fontFamily: "Jost_500Medium" }}
                >
                  USDC
                </Text>
                <Text
                  className="text-dark/50 text-sm"
                  style={{ fontFamily: "Jost_400Regular" }}
                >
                  {usdcLoading
                    ? "..."
                    : `${formatNumber(usdcBalance || 0)} USDC`}
                </Text>
              </View>
              <Text
                className="text-dark"
                style={{ fontFamily: "Jost_500Medium" }}
              >
                {usdcLoading ? "..." : `$${formatNumber(usdcBalance || 0)}`}
              </Text>
            </View>

            {/* SOL */}
            <View className="flex-row items-center gap-3">
              <SolIcon width={32} height={32} />
              <View className="flex-1">
                <Text
                  className="text-dark"
                  style={{ fontFamily: "Jost_500Medium" }}
                >
                  SOL
                </Text>
                <Text
                  className="text-dark/50 text-sm"
                  style={{ fontFamily: "Jost_400Regular" }}
                >
                  {solLoading
                    ? "..."
                    : `${(solBalance || 0).toFixed(4)} SOL`}
                </Text>
              </View>
              <Text
                className="text-dark"
                style={{ fontFamily: "Jost_500Medium" }}
              >
                {solLoading
                  ? "..."
                  : `$${formatNumber(solBalanceUSD || 0)}`}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View
            className="gap-2 mb-6 pt-4"
            style={{ borderTopWidth: 1, borderTopColor: "rgba(18,18,18,0.1)" }}
          >
            <View className="flex-row justify-between">
              <Text
                className="text-dark text-sm"
                style={{ fontFamily: "Jost_500Medium" }}
              >
                Sent
              </Text>
              <Text
                className="text-dark text-sm"
                style={{ fontFamily: "Jost_500Medium" }}
              >
                {formatNumber(stats?.total_sent || 0)} USDC
              </Text>
            </View>
            <View className="flex-row justify-between pl-3">
              <Text
                className="text-dark/50 text-xs"
                style={{ fontFamily: "Jost_400Regular" }}
              >
                Direct
              </Text>
              <Text
                className="text-dark/50 text-xs"
                style={{ fontFamily: "Jost_400Regular" }}
              >
                {formatNumber(stats?.sent_direct || 0)} USDC
              </Text>
            </View>
            <View className="flex-row justify-between pl-3">
              <Text
                className="text-dark/50 text-xs"
                style={{ fontFamily: "Jost_400Regular" }}
              >
                Via Claim
              </Text>
              <Text
                className="text-dark/50 text-xs"
                style={{ fontFamily: "Jost_400Regular" }}
              >
                {formatNumber(stats?.sent_claim || 0)} USDC
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text
                className="text-dark text-sm"
                style={{ fontFamily: "Jost_500Medium" }}
              >
                Received
              </Text>
              <Text
                className="text-dark text-sm"
                style={{ fontFamily: "Jost_500Medium" }}
              >
                {formatNumber(stats?.total_received || 0)} USDC
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text
                className="text-dark text-sm"
                style={{ fontFamily: "Jost_500Medium" }}
              >
                Requested
              </Text>
              <Text
                className="text-dark text-sm"
                style={{ fontFamily: "Jost_500Medium" }}
              >
                {formatNumber(stats?.total_requested || 0)} USDC
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text
                className="text-dark text-sm"
                style={{ fontFamily: "Jost_500Medium" }}
              >
                Claimed
              </Text>
              <Text
                className="text-dark text-sm"
                style={{ fontFamily: "Jost_500Medium" }}
              >
                {formatNumber(stats?.total_claimed || 0)} USDC
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => {
                setShowDepositModal(true);
              }}
              className="flex-1 h-10 bg-dark rounded-full items-center justify-center"
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
                Deposit
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowWithdrawModal(true);
              }}
              className="flex-1 h-10 bg-dark rounded-full items-center justify-center"
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
                Withdraw
              </Text>
            </Pressable>
            {isXUser && (
              <Pressable
                onPress={() => {
                  setShowExportModal(true);
                }}
                className="flex-1 h-10 bg-light rounded-full items-center justify-center"
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
                <Text
                  className="text-dark"
                  style={{ fontFamily: "Jost_600SemiBold" }}
                >
                  Export
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <ScrollView className="w-full max-w-[320px]" style={{ maxHeight: 390 }}>
          {activities.length === 0 ? (
            <Text
              className="text-dark/50 text-sm text-center py-8"
              style={{ fontFamily: "Jost_400Regular" }}
            >
              No activity yet
            </Text>
          ) : (
            <View className="gap-2">
              {activities.map((activity) => (
                <View
                  key={activity.id}
                  className="flex-row items-start gap-3 py-1"
                >
                  <View className="flex-1">
                    <Text
                      className="text-dark text-sm"
                      style={{ fontFamily: "Jost_400Regular" }}
                    >
                      {getActivityLabel(activity)}
                    </Text>
                    <Text
                      className="text-xs uppercase"
                      style={{
                        fontFamily: "Jost_400Regular",
                        color: STATUS_COLORS[activity.status],
                      }}
                    >
                      {activity.status}
                    </Text>
                  </View>
                  <Text
                    className="text-dark/50 text-xs"
                    style={{ fontFamily: "Jost_400Regular" }}
                  >
                    {formatTimeAgo(activity.created_at)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>

    <ExportModal
      visible={showExportModal}
      onClose={() => setShowExportModal(false)}
    />

    {address && (
      <DepositModal
        visible={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        walletAddress={address}
      />
    )}

    <WithdrawModal
      visible={showWithdrawModal}
      onClose={() => {
        setShowWithdrawModal(false);
      }}
      usdcBalance={usdcBalance}
      signature={signature}
      senderPublicKey={address}
    />
    </>
  );
}
