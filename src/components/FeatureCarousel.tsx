/**
 * Adapted from FuseAppOnboarding TextCarousel (SwiftUI → React Native).
 * Displays a scrolling vertical list of Swish feature words.
 * Source inspiration: https://github.com/georgecartridge/FuseAppOnboarding
 */
import { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";

const FEATURES = ["Send", "Receive", "Claim", "Share", "Request"];
const ITEM_HEIGHT = 48;
const INTERVAL_MS = 1800;

export function FeatureCarousel() {
  const [items, setItems] = useState<string[]>(() => {
    // 4 items shown: top fades out, middle is highlighted, rest dimmed
    return [FEATURES[0], FEATURES[1], FEATURES[2], FEATURES[3]];
  });
  const nextIndexRef = useRef(4 % FEATURES.length);
  const translateY = useSharedValue(0);

  function shiftItems() {
    const next = FEATURES[nextIndexRef.current];
    nextIndexRef.current = (nextIndexRef.current + 1) % FEATURES.length;
    setItems((prev) => [...prev.slice(1), next]);
  }

  useEffect(() => {
    const id = setInterval(() => {
      // Slide up by one item, then snap array and reset
      translateY.value = withTiming(
        -ITEM_HEIGHT,
        { duration: 320, easing: Easing.inOut(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(shiftItems)();
            translateY.value = 0;
          }
        }
      );
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    // Show 3 rows, clip overflow
    <View style={{ height: ITEM_HEIGHT * 3, overflow: "hidden" }}>
      <Animated.View style={animStyle}>
        {items.map((item, i) => {
          // Row 0 slides out (top), row 1 is prev, row 2 is current (highlighted), row 3 is next (incoming)
          const isHighlighted = i === 2;
          const isFading = i === 0;
          return (
            <View
              key={`${item}-${i}`}
              style={{ height: ITEM_HEIGHT, justifyContent: "center" }}
            >
              <Text
                style={{
                  fontFamily: isHighlighted ? "Jost_600SemiBold" : "Jost_300Light",
                  fontSize: isHighlighted ? 34 : 26,
                  color: isHighlighted
                    ? "#121212"
                    : isFading
                    ? "rgba(18,18,18,0.06)"
                    : "rgba(18,18,18,0.18)",
                }}
              >
                {item}
              </Text>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}
