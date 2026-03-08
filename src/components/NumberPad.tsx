import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import DeleteIcon from "@/assets/delete.svg";
import { hapticLight } from "@/utils/haptics";

interface NumberPadProps {
  onNumberPress: (num: string) => void;
  onBackspace: () => void;
}

interface AnimatedKeyProps {
  onPress: () => void;
  children: React.ReactNode;
}

function AnimatedKey({ onPress, children }: AnimatedKeyProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.88, { damping: 15, stiffness: 500 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20, stiffness: 300 });
      }}
      onPress={() => {
        hapticLight();
        onPress();
      }}
      className="h-14 w-full items-center justify-center rounded-xl"
    >
      <Animated.View style={animatedStyle} className="items-center justify-center">
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function NumberPad({ onNumberPress, onBackspace }: NumberPadProps) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"];

  return (
    <View className="w-full" style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {keys.map((num) => (
        <View key={num} style={{ width: "33.33%" }} className="items-center">
          <AnimatedKey onPress={() => onNumberPress(num)}>
            <Text
              className="text-2xl text-dark"
              style={{ fontFamily: "Jost_500Medium" }}
            >
              {num}
            </Text>
          </AnimatedKey>
        </View>
      ))}
      <View style={{ width: "33.33%" }} className="items-center">
        <AnimatedKey onPress={onBackspace}>
          <DeleteIcon width={28} height={19} />
        </AnimatedKey>
      </View>
    </View>
  );
}
