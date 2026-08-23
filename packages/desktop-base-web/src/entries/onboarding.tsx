import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OnboardingPage } from "@/pages/OnboardingPage";
import "@/globals.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root not found");

createRoot(rootEl).render(
  <StrictMode>
    <OnboardingPage />
  </StrictMode>,
);
