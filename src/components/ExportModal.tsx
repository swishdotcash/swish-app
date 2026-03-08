import { View, Text, Pressable } from "react-native";
import { AnimatedBottomSheet } from "./AnimatedBottomSheet";
import * as WebBrowser from "expo-web-browser";
import { hapticLight } from "@/utils/haptics";

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportModal({ visible, onClose }: ExportModalProps) {
  const handleExport = async () => {
    hapticLight();
    onClose();
    await WebBrowser.openBrowserAsync("https://swish.cash/p");
  };

  return (
    <AnimatedBottomSheet visible={visible} onClose={onClose}>
      <Pressable onPress={() => {}} className="bg-light rounded-t-3xl px-6 pb-10 pt-6">
          <View className="items-center mb-2">
            <View className="w-10 h-1 bg-dark/20 rounded-full mb-6" />
          </View>

          <Text
            className="text-lg text-dark text-center mb-3"
            style={{ fontFamily: "Jost_600SemiBold" }}
          >
            Export Wallet
          </Text>

          <Text
            className="text-dark/60 text-sm text-center mb-6"
            style={{ fontFamily: "Jost_400Regular" }}
          >
            For security, wallet export is only available in the browser. Open Swish on the web and connect with X to export your wallet.
          </Text>

          <Pressable
            onPress={handleExport}
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
              Open in Browser
            </Text>
          </Pressable>
      </Pressable>
    </AnimatedBottomSheet>
  );
}
