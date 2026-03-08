import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";

const PARTICLE_COUNT = 8;
const RADIUS = 48;
const COLORS = ["#121212", "rgba(18,18,18,0.6)", "rgba(18,18,18,0.4)"];

interface ParticleProps {
  angle: number;
  delay: number;
  size?: number;
  color?: string;
}

function Particle({ angle, delay, size = 5, color = "#121212" }: ParticleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const r = progress.value * RADIUS;
    return {
      opacity: 1 - progress.value,
      transform: [
        { translateX: Math.cos(angle) * r },
        { translateY: Math.sin(angle) * r },
        { scale: 1 - progress.value * 0.4 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function SuccessParticles() {
  return (
    <View
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
      pointerEvents="none"
    >
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle = (i * Math.PI * 2) / PARTICLE_COUNT;
        const delay = i * 20;
        const size = i % 2 === 0 ? 6 : 4;
        const color = COLORS[i % COLORS.length];
        return (
          <Particle key={i} angle={angle} delay={delay} size={size} color={color} />
        );
      })}
    </View>
  );
}
