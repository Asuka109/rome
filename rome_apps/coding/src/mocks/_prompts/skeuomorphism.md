# Styling Prompt — Skeuomorphism

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Skeuomorphism
- **Type:** General  ·  **Origin/Era:** 2007-2012 iOS  ·  **Complexity:** High
- **Look & feel / keywords:** Realistic, texture, depth, 3D appearance, real-world metaphors, shadows, gradients, tactile, detailed, material
- **Art direction:** Design a realistic, textured interface with 3D depth, real-world metaphors (leather, wood, metal), complex gradients (8-12 stops), realistic shadows, grain/texture overlays, tactile press animations. Perfect for premium/luxury products.
- **Primary colors:** Rich realistic: wood, leather, metal colors, detailed gradients (8-12 stops), metallic effects
- **Secondary colors:** Realistic lighting gradients, shadow variations (30-50% darker), texture overlays, material colors
- **Effects & animation:** Realistic shadows (layers), depth (perspective), texture details (noise, grain), realistic animations (300-500ms)
- **Key design values:** --gradient-stops: 8-12, --texture-overlay: noise+grain, --shadow-layers: 3+, --animation-duration: 300-500ms, --depth-effect: pronounced, --tactile: true
- **Best suited for:** Legacy apps, gaming, immersive storytelling, premium products, luxury, realistic simulations, education
- **Avoid for:** Modern enterprise, critical accessibility, low-performance, web (use Flat/Modern)
- **Theme support:** Light ◐ Partial · Dark ◐ Partial  ·  **Mobile:** ✗ Low  ·  **Conversion:** ◐ Medium
- **Accessibility:** ⚠ Textures reduce readability  ·  **Performance:** ❌ Poor

## Recommended typography
- **Pairing:** Real Estate Luxury (Serif + Sans)
- **Heading typeface:** Cinzel
- **Body typeface:** Josefin Sans
- **Mood:** real estate, luxury, elegant, sophisticated, property, premium

## Recommended color palette
- **Reference semantic palette:** Luxury/Premium Brand
- `Primary` #1C1917 / `On Primary` #FFFFFF / `Secondary` #44403C / `On Secondary` #FFFFFF / `Accent` #A16207 / `On Accent` #FFFFFF / `Background` #FAFAF9 / `Foreground` #0C0A09 / `Card` #FFFFFF / `Card Foreground` #0C0A09 / `Muted` #E8ECF0 / `Muted Foreground` #64748B / `Border` #D6D3D1 / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #1C1917
- **Notes:** Premium black + gold accent [Accent adjusted from #CA8A04 for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Skeuomorphism" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
