# Styling Prompt — Motion-Driven

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Motion-Driven
- **Type:** General  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** High
- **Look & feel / keywords:** Animation-heavy, microinteractions, smooth transitions, scroll effects, parallax, entrance anim, page transitions
- **Art direction:** Build an animation-heavy interface with scroll-triggered animations, microinteractions, parallax scrolling (3-5 layers), smooth transitions (300-400ms), entrance animations, page transitions. Use Intersection Observer for scroll effects, transform for performance, GPU acceleration.
- **Primary colors:** Bold colors emphasize movement, high contrast animated, dynamic gradients, accent action colors
- **Secondary colors:** Transitional states, success (Green #22C55E), error (Red #EF4444), neutral feedback
- **Effects & animation:** Scroll anim (Intersection Observer), hover (300-400ms), entrance, parallax (3-5 layers), page transitions
- **Key design values:** --animation-duration: 300-400ms, --parallax-layers: 5, --scroll-behavior: smooth, --gpu-accelerated: true, --entrance-animation: true, --page-transition: smooth
- **Best suited for:** Portfolio sites, storytelling platforms, interactive experiences, entertainment apps, creative, SaaS
- **Avoid for:** Data dashboards, critical accessibility, low-power devices, content-heavy, motion-sensitive
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ Good  ·  **Conversion:** ✓ High
- **Accessibility:** ⚠ Prefers-reduced-motion  ·  **Performance:** ⚠ Good

## Recommended typography
- **Pairing:** Kinetic Motion (Display + Mono)
- **Heading typeface:** Syncopate
- **Body typeface:** Space Mono
- **Mood:** kinetic, motion, futuristic, speed, wide, tech

## Recommended color palette
- **Reference semantic palette:** Portfolio/Personal
- `Primary` #18181B / `On Primary` #FFFFFF / `Secondary` #3F3F46 / `On Secondary` #FFFFFF / `Accent` #2563EB / `On Accent` #FFFFFF / `Background` #FAFAFA / `Foreground` #09090B / `Card` #FFFFFF / `Card Foreground` #09090B / `Muted` #E8ECF0 / `Muted Foreground` #64748B / `Border` #E4E4E7 / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #18181B
- **Notes:** Monochrome + blue accent
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Motion-Driven" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
