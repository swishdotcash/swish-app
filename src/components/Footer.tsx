import { useEffect } from "react";
import { View, Pressable } from "react-native";
import { usePathname, router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { hapticLight } from "@/utils/haptics";
import { SPRING_SMOOTH } from "@/utils/animations";
import HomeIcon from "@/assets/home-icon.svg";
import ProfileIcon from "@/assets/profile-icon.svg";

// Each tab button: px-2 (8) + icon 24 + px-2 (8) = 40w, py-1 (4) + 24 + py-1 (4) = 32h
const BUTTON_WIDTH = 40;
const BUTTON_GAP = 4; // gap-1

export function Footer() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isProfile = pathname === "/profile";

  const indicatorX = useSharedValue(0);

  useEffect(() => {
    indicatorX.value = withSpring(
      isHome ? 0 : BUTTON_WIDTH + BUTTON_GAP,
      SPRING_SMOOTH
    );
  }, [isHome]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View className="items-center pb-8">
      <View
        className="flex-row items-center gap-1 px-2 py-2 rounded-full"
        style={{ backgroundColor: "rgba(18, 18, 18, 0.08)" }}
      >
        {/* Sliding indicator pill — sits behind the icons */}
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 8, // parent's px-2 left padding
              width: BUTTON_WIDTH,
              height: 32,
              borderRadius: 999,
              backgroundColor: "rgba(18, 18, 18, 0.14)",
            },
            indicatorStyle,
          ]}
        />

        <Pressable
          onPress={() => {
            hapticLight();
            router.push("/");
          }}
          className="py-1 px-2 rounded-full"
        >
          <HomeIcon width={24} height={24} opacity={isHome ? 1 : 0.45} />
        </Pressable>

        <Pressable
          onPress={() => {
            hapticLight();
            router.push("/profile");
          }}
          className="py-1 px-2 rounded-full"
        >
          <ProfileIcon width={24} height={24} opacity={isProfile ? 1 : 0.45} />
        </Pressable>
      </View>
    </View>
  );
}
