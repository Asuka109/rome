# Styling Prompt — Neumorphism

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Neumorphism
- **Type:** General  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Soft UI, embossed, debossed, convex, concave, light source, subtle depth, rounded (12-16px), monochromatic
- **Art direction:** Create a neumorphic UI with soft 3D effects. Use light pastels, rounded corners (12-16px), subtle soft shadows (multiple layers), no hard lines, monochromatic color scheme with light/dark variations. Embossed/debossed effect on interactive elements.
- **Primary colors:** Light pastels: Soft Blue #C8E0F4, Soft Pink #F5E0E8, Soft Grey #E8E8E8
- **Secondary colors:** Tints/shades (±30%), gradient subtlety, color harmony
- **Effects & animation:** Soft box-shadow (multiple: -5px -5px 15px, 5px 5px 15px), smooth press (150ms), inner subtle shadow
- **Key design values:** --border-radius: 14px, --shadow-soft-1: -5px -5px 15px, --shadow-soft-2: 5px 5px 15px, --color-light: #F5F5F5, --color-primary: single pastel
- **Best suited for:** Health/wellness apps, meditation platforms, fitness trackers, minimal interaction UIs
- **Avoid for:** Complex apps, critical accessibility, data-heavy dashboards, high-contrast required
- **Theme support:** Light ✓ Full · Dark ◐ Partial  ·  **Mobile:** ✓ Good  ·  **Conversion:** ◐ Medium
- **Accessibility:** ⚠ Low contrast  ·  **Performance:** ⚡ Good

## Recommended typography
- **Pairing:** Neumorphism Mobile (Plus Jakarta Sans + System) (Geometric Sans (System Fallback))
- **Heading typeface:** Plus Jakarta Sans
- **Body typeface:** Plus Jakarta Sans
- **Mood:** neumorphism, soft ui, monochromatic, cool grey, minimal, physical, depth, ceramic, system font, utility

## Recommended color palette
- **Reference semantic palette:** Mental Health App
- `Primary` #8B5CF6 / `On Primary` #FFFFFF / `Secondary` #C4B5FD / `On Secondary` #0F172A / `Accent` #059669 / `On Accent` #FFFFFF / `Background` #FAF5FF / `Foreground` #4C1D95 / `Card` #FFFFFF / `Card Foreground` #4C1D95 / `Muted` #EDEFF9 / `Muted Foreground` #64748B / `Border` #EDE9FE / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #8B5CF6
- **Notes:** Calming lavender + wellness green [Accent adjusted from #10B981 for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Neumorphism" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
