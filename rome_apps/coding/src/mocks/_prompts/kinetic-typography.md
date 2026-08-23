# Styling Prompt — Kinetic Typography

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Kinetic Typography
- **Type:** General  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** High
- **Look & feel / keywords:** Motion text, animated type, moving letters, dynamic, typing effect, morphing, scroll-triggered text
- **Art direction:** Design with kinetic typography. Use: animated text, scroll-triggered reveals, typing effects, letter-by-letter animations, morphing text, gradient text fills, oversized hero text, text as the main visual element.
- **Primary colors:** Flexible - high contrast recommended, bold colors for emphasis, animation-friendly palette
- **Secondary colors:** Accent colors for emphasis, transition colors, gradient text fills
- **Effects & animation:** @keyframes text animation, typing effect, background-clip: text, GSAP ScrollTrigger, split text
- **Key design values:** --text-animation-duration: 1s, --letter-delay: 0.05s, --typing-speed: 100ms, --gradient-text: linear-gradient(90deg, #color1, #color2), --morph-duration: 0.5s
- **Best suited for:** Hero sections, marketing sites, video platforms, storytelling, creative portfolios, landing pages
- **Avoid for:** Long-form content, accessibility-critical, data interfaces, forms, elderly users
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ Good  ·  **Conversion:** ✓ Very High
- **Accessibility:** ❌ Poor (motion)  ·  **Performance:** ⚠ Moderate

## Recommended typography
- **Pairing:** Kinetic Motion (Display + Mono)
- **Heading typeface:** Syncopate
- **Body typeface:** Space Mono
- **Mood:** kinetic, motion, futuristic, speed, wide, tech

## Recommended color palette
- **Reference semantic palette:** Marketing Agency
- `Primary` #EC4899 / `On Primary` #FFFFFF / `Secondary` #F472B6 / `On Secondary` #0F172A / `Accent` #0891B2 / `On Accent` #FFFFFF / `Background` #FDF2F8 / `Foreground` #831843 / `Card` #FFFFFF / `Card Foreground` #831843 / `Muted` #F1EEF5 / `Muted Foreground` #64748B / `Border` #FBCFE8 / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #EC4899
- **Notes:** Bold pink + creative cyan [Accent adjusted from #06B6D4 for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Kinetic Typography" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
