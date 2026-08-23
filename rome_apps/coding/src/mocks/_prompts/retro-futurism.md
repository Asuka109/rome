# Styling Prompt — Retro-Futurism

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Retro-Futurism
- **Type:** General  ·  **Origin/Era:** 1980s Retro  ·  **Complexity:** Medium
- **Look & feel / keywords:** Vintage sci-fi, 80s aesthetic, neon glow, geometric patterns, CRT scanlines, pixel art, cyberpunk, synthwave
- **Art direction:** Build a retro-futuristic (cyberpunk/vaporwave) interface with neon colors (blue, pink, cyan), deep black background, 80s aesthetic, CRT scanlines, glitch effects, neon glow text/borders, monospace fonts, geometric patterns. Use neon text-shadow and animated glitch effects.
- **Primary colors:** Neon Blue #0080FF, Hot Pink #FF006E, Cyan #00FFFF, Deep Black #1A1A2E, Purple #5D34D0
- **Secondary colors:** Metallic Silver #C0C0C0, Gold #FFD700, duotone, 80s Pink #FF10F0, neon accents
- **Effects & animation:** CRT scanlines (::before overlay), neon glow (text-shadow+box-shadow), glitch effects (skew/offset keyframes)
- **Key design values:** --neon-colors: #0080FF #FF006E #00FFFF, --background: #000000, --font-family: monospace, --effect: glitch+glow, --scanline-opacity: 0.3, --crt-effect: true
- **Best suited for:** Gaming, entertainment, music platforms, tech brands, artistic projects, nostalgic, cyberpunk
- **Avoid for:** Conservative industries, critical accessibility, professional/corporate, elderly, legal/finance
- **Theme support:** Light ✓ Full · Dark ✓ Dark focused  ·  **Mobile:** ◐ Medium  ·  **Conversion:** ◐ Medium
- **Accessibility:** ⚠ High contrast/strain  ·  **Performance:** ⚠ Moderate

## Recommended typography
- **Pairing:** Pixel Retro (Display + Sans)
- **Heading typeface:** Press Start 2P
- **Body typeface:** VT323
- **Mood:** pixel, retro, gaming, 8-bit, nostalgic, arcade

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
- The interface must immediately communicate the "Retro-Futurism" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
