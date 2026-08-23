// Explicit entry (instead of "main": "expo/AppEntry.js"): under pnpm's
// isolated node_modules layout, expo/AppEntry.js's relative `../../App`
// escape from inside .pnpm/ cannot reach the project root — the standard
// Expo-monorepo fix is registering the root component from the project's
// own entry file.
import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
