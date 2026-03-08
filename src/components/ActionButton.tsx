import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import SendIcon from "@/assets/send.svg";
import ReceiveIcon from "@/assets/receive.svg";
import { hapticMedium } from "@/utils/haptics";
import { SPRING_BOUNCY, SPRING_SNAPPY } from "@/utils/animations";

interface ActionButtonProps {
  variant: "send" | "receive";
  onPress?: () => void;
  disabled?: boolean;
}

export function ActionButton({ variant, onPress, disabled }: ActionButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const Icon = variant === "send" ? SendIcon : ReceiveIcon;

  return (
    <Animated.View style={[animatedStyle, { width: "100%" }]}>
      <Pressable
        onPressIn={() => {
          if (!disabled) scale.value = withSpring(0.93, SPRING_SNAPPY);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING_BOUNCY);
        }}
        onPress={() => {
          hapticMedium();
          onPress?.();
        }}
        disabled={disabled}
        className="w-full h-10 bg-dark rounded-full items-center justify-center"
        style={[
          {
            shadowColor: "#121212",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 4,
          },
          disabled ? { opacity: 0.4 } : {},
        ]}
      >
        <Icon width={24} height={16} />
      </Pressable>
    </Animated.View>
  );
}
