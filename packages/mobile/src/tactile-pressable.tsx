import * as Haptics from "expo-haptics";
import { useRef } from "react";
import {
  Animated,
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Feedback = "impact" | "selection" | "none";

interface TactilePressableProps extends Omit<PressableProps, "style"> {
  feedback?: Feedback;
  pressedStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
}

function playFeedback(feedback: Feedback) {
  if (feedback === "none") return;
  const result =
    feedback === "selection"
      ? Haptics.selectionAsync()
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  void result.catch(() => undefined);
}

export function TactilePressable({
  disabled,
  feedback = "impact",
  onPress,
  onPressIn,
  onPressOut,
  pressedStyle,
  scaleTo = 0.985,
  style,
  ...props
}: TactilePressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateScale = (toValue: number, duration: number) => {
    Animated.timing(scale, { duration, toValue, useNativeDriver: true }).start();
  };

  const handlePress = (event: GestureResponderEvent) => {
    playFeedback(feedback);
    onPress?.(event);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        {...props}
        disabled={disabled}
        onPress={handlePress}
        onPressIn={(event) => {
          animateScale(scaleTo, 70);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateScale(1, 110);
          onPressOut?.(event);
        }}
        style={({ pressed }) => [style, pressed && pressedStyle]}
      />
    </Animated.View>
  );
}
