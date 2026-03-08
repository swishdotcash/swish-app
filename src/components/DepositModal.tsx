import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { AnimatedBottomSheet } from "./AnimatedBottomSheet";
import * as Clipboard from "expo-clipboard";
import QRCodeStyled from "react-native-qrcode-styled";

import { hapticLight } from "@/utils/haptics";
import CopyIcon from "@/assets/copy-icon.svg";
import SuccessAltIcon from "@/assets/success-alt.svg";

interface DepositModalProps {
  visible: boolean;
  onClose: () => void;
  walletAddress: string;
}

export function DepositModal({
  visible,
  onClose,
  walletAddress,
}: DepositModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    hapticLight();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  return (
    <AnimatedBottomSheet visible={visible} onClose={handleClose}>
      <Pressable onPress={() => {}} className="bg-light rounded-t-3xl px-6 pb-10 pt-6">
          {/* Handle bar */}
          <View className="items-center mb-2">
            <View className="w-10 h-1 bg-dark/20 rounded-full mb-4" />
          </View>

          {/* Title */}
          <Text
            className="text-2xl text-dark text-center mb-6"
            style={{ fontFamily: "Jost_600SemiBold" }}
          >
            Deposit
          </Text>

          {/* QR Code */}
          <View className="items-center mb-6">
            <View
              className="p-4 rounded-2xl"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <QRCodeStyled
                data={walletAddress}
                style={{ width: 200, height: 200 }}
                color="#121212"
              />
            </View>
          </View>

          {/* Address + Copy */}
          <Pressable
            onPress={copied ? undefined : handleCopy}
            className="self-center flex-row items-center gap-2 px-4 py-2 rounded-full mb-3"
            style={{
              backgroundColor: "rgba(18, 18, 18, 0.05)",
              maxWidth: "100%",
              opacity: copied ? 0.7 : 1,
            }}
          >
            <Text
              className="text-dark text-sm shrink"
              style={{ fontFamily: "Jost_400Regular" }}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {walletAddress}
            </Text>
            {copied ? (
              <SuccessAltIcon width={16} height={8} />
            ) : (
              <CopyIcon width={14} height={14} color="#121212" />
            )}
          </Pressable>

          {/* Instructions */}
          <Text
            className="text-dark/50 text-sm text-center"
            style={{ fontFamily: "Jost_400Regular" }}
          >
            Send SOL or USDC to this address
          </Text>
      </Pressable>
    </AnimatedBottomSheet>
  );
}
