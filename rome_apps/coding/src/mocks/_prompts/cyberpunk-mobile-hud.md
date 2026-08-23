# Styling Prompt — Cyberpunk Mobile HUD

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Cyberpunk Mobile HUD
- **Type:** Mobile  ·  **Origin/Era:** Cyber-Noir  ·  **Complexity:** High
- **Look & feel / keywords:** cyberpunk, neon, glitch, chamfered, orbitron, jetbrains, scanlines, crt, hud, matrix, military, decker
- **Art direction:** Design a Cyberpunk mobile HUD. Background #0A0A0F, card #12121A. Accents: #00FF88 (primary), #FF00FF, #00D4FF. Typography: Orbitron for headings, JetBrains Mono for data. All shapes use chamfered corners via SVG or Skia clipPath. Buttons: neon glow shadows, scale 0.98 + haptic on press, optional glitch jitter on active. Global scanline overlay (semi-transparent horizontal lines) and CRT flicker (root opacity 0.98–1). Inputs: prompt style with '>' in accent, custom blinking block cursor. HUD cards use corner brackets and subtle gradients.
- **Primary colors:** Void #0A0A0F, Card #12121A
- **Secondary colors:** Neon Green #00FF88, Neon Magenta #FF00FF, Cyber Cyan #00D4FF, Neutral Text #E0E0E0, Alert Red #FF3366, Border #2A2A3A
- **Effects & animation:** Deep void background with neon radiance, chamfered 45° corners via SVG/Skia, scanline overlay, CRT flicker opacity oscillation, glitch animations (translateX ±2), neon pulses around buttons, HUD corner brackets, terminal prompt text inputs, heavy use of blurView holographic panels
- **Key design values:** --bg: #0A0A0F, --card: #12121A, --fg: #E0E0E0, --muted: #1C1C2E, --accent: #00FF88, --accent2: #FF00FF, --accent3: #00D4FF, --border: #2A2A3A, --destructive: #FF3366, --radius: 0px, --font-heading: Orbitron, --font-body: JetBrains Mono
- **Best suited for:** Gaming dashboards, crypto/cyberpunk apps, sci-fi companion tools, hacker OS skins, data-heavy monitoring HUDs
- **Avoid for:** Serious enterprise, health/finance requiring calm trust, minimal editorial apps
- **Theme support:** Light ✗ Light · Dark ✓ Dark-only  ·  **Mobile:** ✓ Mobile-First HUD  ·  **Conversion:** ✓ High
- **Accessibility:** ⚠ Requires careful reduced-motion handling  ·  **Performance:** ⚠ Moderate–Heavy (Skia/blur/animations)

## Recommended typography
- **Pairing:** Cyberpunk Mobile (Orbitron + JetBrains Mono) (Tech Display + Mono)
- **Heading typeface:** Orbitron
- **Body typeface:** JetBrains Mono
- **Mood:** cyberpunk, neon, glitch, hud, sci-fi, dark, matrix green, magenta, chamfered, tactical

## Recommended color palette
- **Reference semantic palette:** Gaming
- `Primary` #7C3AED / `On Primary` #FFFFFF / `Secondary` #A78BFA / `On Secondary` #0F172A / `Accent` #F43F5E / `On Accent` #FFFFFF / `Background` #0F0F23 / `Foreground` #E2E8F0 / `Card` #1E1C35 / `Card Foreground` #E2E8F0 / `Muted` #27273B / `Muted Foreground` #94A3B8 / `Border` #4C1D95 / `Destructive` #EF4444 / `On Destructive` #FFFFFF / `Ring` #7C3AED
- **Notes:** Neon purple + rose action
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Cyberpunk Mobile HUD" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
