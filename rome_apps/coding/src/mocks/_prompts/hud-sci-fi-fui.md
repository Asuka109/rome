# Styling Prompt — HUD / Sci-Fi FUI

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: HUD / Sci-Fi FUI
- **Type:** General  ·  **Origin/Era:** 2010s Sci-Fi  ·  **Complexity:** High
- **Look & feel / keywords:** Futuristic, technical, wireframe, neon, data, transparency, iron man, sci-fi, interface
- **Art direction:** Design a futuristic HUD (Heads Up Display) or FUI. Use: thin lines (1px), neon cyan/blue on black, technical markers, decorative brackets, data visualization, monospaced tech fonts, glowing elements, transparency.
- **Primary colors:** Neon Cyan #00FFFF, Holographic Blue #0080FF, Alert Red #FF0000
- **Secondary colors:** Transparent Black, Grid Lines #333333
- **Effects & animation:** Glow effects, scanning animations, ticker text, blinking markers, fine line drawing
- **Key design values:** --hud-color: #00FFFF, --bg-color: rgba(0,10,20,0.9), --line-width: 1px, --glow: 0 0 5px, --font: monospace
- **Best suited for:** Sci-fi games, space tech, cybersecurity, movie props, immersive dashboards
- **Avoid for:** Standard corporate, reading heavy content, accessible public services
- **Theme support:** Light ✓ Low · Dark ✓ Full  ·  **Mobile:** ◐ Medium  ·  **Conversion:** ✗ Low
- **Accessibility:** ⚠ Poor (thin lines)  ·  **Performance:** ⚠ Moderate (renders)

## Recommended typography
- **Pairing:** Tech/HUD Mono (Mono + Mono)
- **Heading typeface:** Share Tech Mono
- **Body typeface:** Fira Code
- **Mood:** tech, futuristic, hud, sci-fi, data, monospaced, precise

## Recommended color palette
- **Reference semantic palette:** Space Tech / Aerospace
- `Primary` #F8FAFC / `On Primary` #0F172A / `Secondary` #94A3B8 / `On Secondary` #0F172A / `Accent` #3B82F6 / `On Accent` #FFFFFF / `Background` #0B0B10 / `Foreground` #F8FAFC / `Card` #1E1E23 / `Card Foreground` #F8FAFC / `Muted` #232328 / `Muted Foreground` #94A3B8 / `Border` #1E293B / `Destructive` #EF4444 / `On Destructive` #FFFFFF / `Ring` #F8FAFC
- **Notes:** Star white + launch blue
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "HUD / Sci-Fi FUI" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
