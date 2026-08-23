import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SettingsPage } from "@/pages/SettingsPage";
import "@/globals.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root not found");

createRoot(rootEl).render(
  <StrictMode>
    <SettingsPage />
  </StrictMode>,
);
