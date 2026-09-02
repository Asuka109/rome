import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { injectThemeCss } from "@/lib/theme";
import { Report } from "./Report";
import "./fonts.css";
import "./styles.css";

// Same call the app and the gallery make: emit every theme's token block into
// <style id="rome-theme-tokens">. The reproductions read the resulting semantic
// tokens, which is what makes them the product rather than a picture of it.
injectThemeCss();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Report />
  </StrictMode>,
);
