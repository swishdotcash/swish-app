import "react-native-get-random-values";
import { Buffer } from "buffer";
globalThis.Buffer = Buffer;
import { useEffect } from "react";
import { View } from "react-native";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Jost_300Light,
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
  Jost_700Bold,
} from "@expo-google-fonts/jost";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PrivyProvider } from "@/providers/PrivyProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Jost_300Light,
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
    Jost_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PrivyProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <View className="flex-1 bg-light">
              {/* Header */}
              <View className="items-center pt-14 pb-4">
                <Logo />
              </View>

              {/* Main Content */}
              <View className="flex-1">
                <Slot />
              </View>

              {/* Footer Navigation */}
              <Footer />
            </View>
          </AuthProvider>
        </PrivyProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
