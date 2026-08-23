# Styling Prompt — Kinetic Brutalism (Mobile)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Kinetic Brutalism (Mobile)
- **Type:** Mobile  ·  **Origin/Era:** 2020s Mobile Brutalism  ·  **Complexity:** High
- **Look & feel / keywords:** kinetic, brutalism, motion, marquee, acid yellow, uppercase, oversized, aggressive typography, street, zine, high contrast, scroll-driven, haptic, reanimated
- **Art direction:** Design a Kinetic Brutalism mobile app. Canvas: #09090B. Primary accent: Acid Yellow #DFE104 (text: #000000). Typography: Space Grotesk BOLD. Display text: 60–120pt, uppercase, letterSpacing -1, lineHeight 0.9–1.1x. Body: 18–20pt. Labels: 12pt uppercase letterSpacing +2. Add infinite marquee rows (Reanimated, no easing, hard edge clip). Hero text parallax on scroll (Interpolate: scale 1.0→1.3, opacity 1→0). Card press: instantly flood to #DFE104 + flip text to #000. Haptic Medium on every press. 0px radius. 2px solid borders. NO shadows. No gradients. Scale all fonts by (windowWidth / 375 * size) for responsiveness.
- **Primary colors:** Acid Yellow #DFE104, Rich Black #09090B
- **Secondary colors:** Off-white #FAFAFA, Dark Gray #27272A, Zinc #A1A1AA, Border Zinc #3F3F46
- **Effects & animation:** Infinite marquee (Reanimated, Linear easing, 5s loop, hard clip), hero parallax (scale 1.0→1.3 + fade), sticky section header push, card flood inversion on press (bg→#DFE104, text→#000000), haptic Medium on every press, scroll-triggered interpolate transforms, 0px radius, 2px borders, 100ms color transitions
- **Key design values:** --bg: #09090B, --fg: #FAFAFA, --muted: #27272A, --muted-fg: #A1A1AA, --accent: #DFE104, --accent-fg: #000000, --border: #3F3F46, --radius: 0px, --border-width: 2px, --shadow: none, --marquee-speed: 5000ms, --press-duration: 100ms, --font: Space Grotesk or Inter
- **Best suited for:** Immersive storytelling apps, brand flagship mobile, music/culture platforms, sports apps, underground zines, limited-edition product drops, performance dashboards
- **Avoid for:** Calm informational apps, healthcare, finance contexts needing trust, children's, any context where aggressive typography feels inappropriate
- **Theme support:** Light ✓ Dark Primary · Dark ◐ Dark only (inverted sections)  ·  **Mobile:** ✓ Mobile-First  ·  **Conversion:** ✓ High energy
- **Accessibility:** ⚠ WCAG AA (verify zinc body text on dark bg)  ·  **Performance:** ⚡ Excellent (native driver required)

## Recommended typography
- **Pairing:** Kinetic Brutalism (Space Grotesk) (Geometric Sans (Single Dominant))
- **Heading typeface:** Space Grotesk
- **Body typeface:** Space Grotesk
- **Mood:** kinetic, brutalist, aggressive, uppercase, oversized, display, motion, street, bold, high-energy, zine

## Recommended color palette
- **Reference semantic palette:** Music Streaming
- `Primary` #1E1B4B / `On Primary` #FFFFFF / `Secondary` #4338CA / `On Secondary` #FFFFFF / `Accent` #22C55E / `On Accent` #0F172A / `Background` #0F0F23 / `Foreground` #F8FAFC / `Card` #1B1B30 / `Card Foreground` #F8FAFC / `Muted` #27273B / `Muted Foreground` #94A3B8 / `Border` #312E81 / `Destructive` #EF4444 / `On Destructive` #FFFFFF / `Ring` #1E1B4B
- **Notes:** Dark audio + play green
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Kinetic Brutalism (Mobile)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
