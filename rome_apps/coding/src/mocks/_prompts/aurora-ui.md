# Styling Prompt — Aurora UI

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Aurora UI
- **Type:** General  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Vibrant gradients, smooth blend, Northern Lights effect, mesh gradient, luminous, atmospheric, abstract
- **Art direction:** Create a vibrant gradient interface inspired by Northern Lights with mesh gradients, smooth color blends, flowing animations. Use complementary color pairs (blue-orange, purple-yellow), flowing background gradients, subtle continuous animations (8-12s loops), iridescent effects.
- **Primary colors:** Complementary: Blue-Orange, Purple-Yellow, Electric Blue #0080FF, Magenta #FF1493, Cyan #00FFFF
- **Secondary colors:** Smooth transitions (Blue→Purple→Pink→Teal), iridescent effects, blend modes (screen, multiply)
- **Effects & animation:** Large flowing CSS/SVG gradients, subtle 8-12s animations, depth via color layering, smooth morph
- **Key design values:** --gradient-colors: complementary pairs, --animation-duration: 8-12s, --blend-mode: screen, --color-saturation: 1.2, --effect: iridescent, --loop-smooth: true
- **Best suited for:** Modern SaaS, creative agencies, branding, music platforms, lifestyle, premium products, hero sections
- **Avoid for:** Data-heavy dashboards, critical accessibility, content-heavy where distraction issues
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ Good  ·  **Conversion:** ✓ High
- **Accessibility:** ⚠ Text contrast  ·  **Performance:** ⚠ Good

## Recommended typography
- Choose typefaces consistent with the style keywords above.

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
- The interface must immediately communicate the "Aurora UI" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
