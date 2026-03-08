import { useState, useEffect } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { EASE_ENTER, EASE_EXIT, DURATION_ENTER, DURATION_EXIT } from "@/utils/animations";

interface AnimatedBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function AnimatedBottomSheet({ visible, onClose, children }: AnimatedBottomSheetProps) {
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(800);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = withTiming(0, { duration: DURATION_ENTER, easing: EASE_ENTER });
      backdropOpacity.value = withTiming(0.4, { duration: 300 });
    } else {
      translateY.value = withTiming(
        800,
        { duration: DURATION_EXIT, easing: EASE_EXIT },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }
      );
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!mounted && !visible) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "#000" },
            backdropStyle,
          ]}
        />
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View style={sheetStyle}>{children}</Animated.View>
      </View>
    </Modal>
  );
}
