# Styling Prompt — Liquid Glass

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Liquid Glass
- **Type:** General  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** High
- **Look & feel / keywords:** Flowing glass, morphing, smooth transitions, fluid effects, translucent, animated blur, iridescent, chromatic aberration
- **Art direction:** Create a premium liquid glass effect with morphing shapes, flowing animations, chromatic aberration, iridescent gradients, smooth 400-600ms transitions. Use SVG morphing for shape changes, dynamic blur, smooth color transitions creating a fluid, premium feel.
- **Primary colors:** Vibrant iridescent (rainbow spectrum), translucent base with opacity shifts, gradient fluidity
- **Secondary colors:** Chromatic aberration (Red-Cyan), iridescent oil-spill, fluid gradient blends, holographic effects
- **Effects & animation:** Morphing elements (SVG/CSS), fluid animations (400-600ms curves), dynamic blur (backdrop-filter), color transitions
- **Key design values:** --morph-duration: 400-600ms, --blur-amount: 15px, --chromatic-aberration: true, --iridescent: true, --blend-mode: screen, --smooth-transitions: true
- **Best suited for:** Premium SaaS, high-end e-commerce, creative platforms, branding experiences, luxury portfolios
- **Avoid for:** Performance-limited, critical accessibility, complex data, budget projects
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ◐ Medium  ·  **Conversion:** ✓ High
- **Accessibility:** ⚠ Text contrast  ·  **Performance:** ⚠ Moderate-Poor

## Recommended typography
- **Pairing:** Spatial Clear (Sans + Sans)
- **Heading typeface:** Inter
- **Body typeface:** Inter
- **Mood:** spatial, legible, glass, system, clean, neutral

## Recommended color palette
- **Reference semantic palette:** E-commerce Luxury
- `Primary` #1C1917 / `On Primary` #FFFFFF / `Secondary` #44403C / `On Secondary` #FFFFFF / `Accent` #A16207 / `On Accent` #FFFFFF / `Background` #FAFAF9 / `Foreground` #0C0A09 / `Card` #FFFFFF / `Card Foreground` #0C0A09 / `Muted` #E8ECF0 / `Muted Foreground` #64748B / `Border` #D6D3D1 / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #1C1917
- **Notes:** Premium dark + gold accent [Accent adjusted from #CA8A04 for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Liquid Glass" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
