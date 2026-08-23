# Styling Prompt — Glassmorphism

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Glassmorphism
- **Type:** General  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Frosted glass, transparent, blurred background, layered, vibrant background, light source, depth, multi-layer
- **Art direction:** Design a glassmorphic interface with frosted glass effect. Use backdrop blur (10-20px), translucent overlays (rgba 10-30% opacity), vibrant background colors, subtle borders, light source reflection, layered depth. Perfect for modern overlays and cards.
- **Primary colors:** Translucent white: rgba(255,255,255,0.1-0.3)
- **Secondary colors:** Vibrant: Electric Blue #0080FF, Neon Purple #8B00FF, Vivid Pink #FF1493, Teal #20B2AA
- **Effects & animation:** Backdrop blur (10-20px), subtle border (1px solid rgba white 0.2), light reflection, Z-depth
- **Key design values:** --blur-amount: 15px, --glass-opacity: 0.15, --border-color: rgba(255,255,255,0.2), --background: vibrant color, --text-color: light/dark based on BG
- **Best suited for:** Modern SaaS, financial dashboards, high-end corporate, lifestyle apps, modal overlays, navigation
- **Avoid for:** Low-contrast backgrounds, critical accessibility, performance-limited, dark text on dark
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ Good  ·  **Conversion:** ✓ High
- **Accessibility:** ⚠ Ensure 4.5:1  ·  **Performance:** ⚠ Good

## Recommended typography
- **Pairing:** Spatial Clear (Sans + Sans)
- **Heading typeface:** Inter
- **Body typeface:** Inter
- **Mood:** spatial, legible, glass, system, clean, neutral

## Recommended color palette
- **Reference semantic palette:** Financial Dashboard
- `Primary` #0F172A / `On Primary` #FFFFFF / `Secondary` #1E293B / `On Secondary` #FFFFFF / `Accent` #22C55E / `On Accent` #0F172A / `Background` #020617 / `Foreground` #F8FAFC / `Card` #0E1223 / `Card Foreground` #F8FAFC / `Muted` #1A1E2F / `Muted Foreground` #94A3B8 / `Border` #334155 / `Destructive` #EF4444 / `On Destructive` #FFFFFF / `Ring` #0F172A
- **Notes:** Dark bg + green positive indicators
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Glassmorphism" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
