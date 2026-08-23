import { Image, StyleSheet, View } from "react-native";

const romeMark = require("../assets/adaptive-icon.png");

/** Crops the transparent app-icon artwork down to the Rome mark. */
export function RomeMark({ size = 72 }: { size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, { height: size, width: size }]}
    >
      <Image source={romeMark} style={{ height: size * 1.72, width: size * 1.72 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
