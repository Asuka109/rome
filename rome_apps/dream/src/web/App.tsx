import type { CSSProperties } from "react";

const shellStyle = {
  minHeight: "100vh",
  padding: "32px",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#171717",
  background: "#fafafa",
} satisfies CSSProperties;

const panelStyle = {
  maxWidth: "720px",
  border: "1px solid #e5e5e5",
  borderRadius: "var(--rome-radius-8)",
  padding: "24px",
  background: "#ffffff",
} satisfies CSSProperties;

export default function App() {
  return (
    <main style={shellStyle}>
      <section style={panelStyle}>
        <h1>Dream</h1>
        <p>Periodically reviews recent conversations and action history to update Rome memory.</p>
      </section>
    </main>
  );
}
