# Styling Prompt — Cyberpunk UI

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Cyberpunk UI
- **Type:** General  ·  **Origin/Era:** 2020s Cyberpunk  ·  **Complexity:** Medium
- **Look & feel / keywords:** Neon, dark mode, terminal, HUD, sci-fi, glitch, dystopian, futuristic, matrix, tech noir
- **Art direction:** Design a cyberpunk interface. Use: neon colors on dark (#0D0D0D), terminal/HUD aesthetic, glitch effects, scanlines overlay, matrix green accents, monospace fonts, angular shapes, dystopian tech feel.
- **Primary colors:** #00FF00 (Matrix Green), #FF00FF (Magenta), #00FFFF (Cyan), #0D0D0D (Dark)
- **Secondary colors:** Neon gradients, scanline overlays, glitch colors, terminal green accents
- **Effects & animation:** Neon glow (text-shadow), glitch animations (skew/offset), scanlines (::before overlay), terminal fonts
- **Key design values:** --bg-dark: #0D0D0D, --neon-green: #00FF00, --neon-magenta: #FF00FF, --neon-cyan: #00FFFF, --scanline-opacity: 0.1, --glitch-duration: 0.3s
- **Best suited for:** Gaming platforms, tech products, crypto apps, sci-fi applications, developer tools, entertainment
- **Avoid for:** Corporate enterprise, healthcare, family apps, conservative brands, elderly users
- **Theme support:** Light ✗ No · Dark ✓ Only  ·  **Mobile:** ◐ Medium  ·  **Conversion:** ◐ Medium
- **Accessibility:** ⚠ Limited (dark+neon)  ·  **Performance:** ⚠ Moderate

## Recommended typography
- **Pairing:** Cyberpunk Mobile (Orbitron + JetBrains Mono) (Tech Display + Mono)
- **Heading typeface:** Orbitron
- **Body typeface:** JetBrains Mono
- **Mood:** cyberpunk, neon, glitch, hud, sci-fi, dark, matrix green, magenta, chamfered, tactical

## Recommended color palette
- **Reference semantic palette:** Fintech/Crypto
- `Primary` #F59E0B / `On Primary` #0F172A / `Secondary` #FBBF24 / `On Secondary` #0F172A / `Accent` #8B5CF6 / `On Accent` #FFFFFF / `Background` #0F172A / `Foreground` #F8FAFC / `Card` #222735 / `Card Foreground` #F8FAFC / `Muted` #272F42 / `Muted Foreground` #94A3B8 / `Border` #334155 / `Destructive` #EF4444 / `On Destructive` #FFFFFF / `Ring` #F59E0B
- **Notes:** Gold trust + purple tech
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Cyberpunk UI" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
