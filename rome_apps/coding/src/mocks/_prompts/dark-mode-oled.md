# Styling Prompt — Dark Mode (OLED)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Dark Mode (OLED)
- **Type:** General  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Low
- **Look & feel / keywords:** Dark theme, low light, high contrast, deep black, midnight blue, eye-friendly, OLED, night mode, power efficient
- **Art direction:** Create an OLED-optimized dark interface with deep black (#000000), dark grey (#121212), midnight blue accents. Use minimal glow effects, vibrant neon accents (green, blue, gold, purple), high contrast text. Optimize for eye comfort and OLED power saving.
- **Primary colors:** Deep Black #000000, Dark Grey #121212, Midnight Blue #0A0E27
- **Secondary colors:** Vibrant accents: Neon Green #39FF14, Electric Blue #0080FF, Gold #FFD700, Plasma Purple #BF00FF
- **Effects & animation:** Minimal glow (text-shadow: 0 0 10px), dark-to-light transitions, low white emission, high readability, visible focus
- **Key design values:** --bg-black: #000000, --bg-dark-grey: #121212, --text-primary: #FFFFFF, --accent-neon: neon colors, --glow-effect: minimal, --oled-optimized: true
- **Best suited for:** Night-mode apps, coding platforms, entertainment, eye-strain prevention, OLED devices, low-light
- **Avoid for:** Print-first content, high-brightness outdoor, color-accuracy-critical
- **Theme support:** Light ✗ No · Dark ✓ Only  ·  **Mobile:** ✓ High  ·  **Conversion:** ◐ Low
- **Accessibility:** ✓ WCAG AAA  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Modern Dark Cinema (Inter System) (Sans + Mono)
- **Heading typeface:** Inter
- **Body typeface:** Inter
- **Mood:** dark, cinematic, technical, precision, clean, premium, developer, professional, high-end utility

## Recommended color palette
- **Reference semantic palette:** Coding Bootcamp
- `Primary` #0F172A / `On Primary` #FFFFFF / `Secondary` #1E293B / `On Secondary` #FFFFFF / `Accent` #22C55E / `On Accent` #0F172A / `Background` #020617 / `Foreground` #F8FAFC / `Card` #0E1223 / `Card Foreground` #F8FAFC / `Muted` #1A1E2F / `Muted Foreground` #94A3B8 / `Border` #334155 / `Destructive` #EF4444 / `On Destructive` #FFFFFF / `Ring` #0F172A
- **Notes:** Terminal dark + success green
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Dark Mode (OLED)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
