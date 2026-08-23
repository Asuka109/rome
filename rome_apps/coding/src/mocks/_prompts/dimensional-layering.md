# Styling Prompt — Dimensional Layering

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Dimensional Layering
- **Type:** General  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Depth, overlapping, z-index, layers, 3D, shadows, elevation, floating, cards, spatial hierarchy
- **Art direction:** Design with dimensional layering. Use: z-index depth (multiple layers), overlapping cards, elevation shadows (4 levels), floating elements, parallax depth, backdrop blur for hierarchy, spatial UI feel.
- **Primary colors:** Neutral base (#FFFFFF, #F5F5F5, #E0E0E0) + brand accent for elevated elements
- **Secondary colors:** Shadow variations (sm/md/lg/xl), elevation colors, highlight colors for top layers
- **Effects & animation:** z-index stacking, box-shadow elevation (4 levels), transform: translateZ(), backdrop-filter, parallax
- **Key design values:** --elevation-1: 0 1px 3px rgba(0,0,0,0.1), --elevation-2: 0 4px 6px rgba(0,0,0,0.1), --elevation-3: 0 10px 20px rgba(0,0,0,0.1), --elevation-4: 0 20px 40px rgba(0,0,0,0.15), --blur-amount: 8px
- **Best suited for:** Dashboards, card layouts, modals, navigation, product showcases, SaaS interfaces
- **Avoid for:** Print-style layouts, simple blogs, low-end devices, flat design requirements
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ Good  ·  **Conversion:** ✓ High
- **Accessibility:** ⚠ Moderate (SR issues)  ·  **Performance:** ⚠ Good

## Recommended typography
- **Pairing:** Spatial Clear (Sans + Sans)
- **Heading typeface:** Inter
- **Body typeface:** Inter
- **Mood:** spatial, legible, glass, system, clean, neutral

## Recommended color palette
- **Reference semantic palette:** Card & Board Game
- `Primary` #15803D / `On Primary` #FFFFFF / `Secondary` #166534 / `On Secondary` #FFFFFF / `Accent` #D97706 / `On Accent` #FFFFFF / `Background` #0F172A / `Foreground` #FFFFFF / `Card` #192134 / `Card Foreground` #FFFFFF / `Muted` #0F1F2B / `Muted Foreground` #94A3B8 / `Border` rgba(255,255,255,0.08) / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #15803D
- **Notes:** Felt green + gold on dark
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Dimensional Layering" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
