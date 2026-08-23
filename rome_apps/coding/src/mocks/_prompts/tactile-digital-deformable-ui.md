# Styling Prompt — Tactile Digital / Deformable UI

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Tactile Digital / Deformable UI
- **Type:** General  ·  **Origin/Era:** 2025+ Tactile Era  ·  **Complexity:** Medium
- **Look & feel / keywords:** Jelly buttons, chrome, clay, squishy, deformable, bouncy, physical, tactile feedback, press response
- **Art direction:** Design a tactile deformable interface. Use: jelly/squishy buttons, press deformation effect, bounce-back animations, chrome/clay materials, spring physics, haptic-like feedback, material response, 3D depth on interaction.
- **Primary colors:** Gradient metallics, Chrome Silver #C0C0C0, Jelly Pink #FF9ECD, Soft Blue #87CEEB
- **Secondary colors:** Glossy highlights, shadow depth, reflection effects, material-specific colors
- **Effects & animation:** Press deformation (scale + squish), bounce-back (cubic-bezier), material response, haptic-like feedback, spring physics
- **Key design values:** --press-scale: 0.95, --bounce-duration: 400ms, --spring-stiffness: 300, --spring-damping: 20, --material-glossy: linear-gradient(135deg, white 0%, transparent 60%), --depth-shadow: 0 10px 30px rgba(0,0,0,0.2)
- **Best suited for:** Modern mobile apps, playful brands, entertainment, gaming UI, consumer products, interactive demos
- **Avoid for:** Enterprise software, data dashboards, accessibility-critical, professional tools
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ High  ·  **Conversion:** ✓ Very High
- **Accessibility:** ⚠ Motion sensitive  ·  **Performance:** ⚠ Good

## Recommended typography
- **Pairing:** Claymorphism Mobile (Nunito + DM Sans) (Display Rounded + Geometric Sans)
- **Heading typeface:** Nunito
- **Body typeface:** DM Sans
- **Mood:** claymorphism, clay, rounded, playful, candy, bubbly, soft, 3d, children, education, tactile, spring, nunito, dm sans

## Recommended color palette
- **Reference semantic palette:** Digital Products/Downloads
- `Primary` #6366F1 / `On Primary` #FFFFFF / `Secondary` #818CF8 / `On Secondary` #0F172A / `Accent` #16A34A / `On Accent` #FFFFFF / `Background` #EEF2FF / `Foreground` #312E81 / `Card` #FFFFFF / `Card Foreground` #312E81 / `Muted` #EBEFF9 / `Muted Foreground` #64748B / `Border` #C7D2FE / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #6366F1
- **Notes:** Digital indigo + buy green [Accent adjusted from #22C55E for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Tactile Digital / Deformable UI" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
