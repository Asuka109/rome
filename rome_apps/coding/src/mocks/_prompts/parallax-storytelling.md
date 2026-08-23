# Styling Prompt — Parallax Storytelling

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Parallax Storytelling
- **Type:** General  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** High
- **Look & feel / keywords:** Scroll-driven, narrative, layered scrolling, immersive, progressive disclosure, cinematic, scroll-triggered
- **Art direction:** Design a parallax storytelling page. Use: scroll-driven narrative, layered backgrounds (3-5 layers), fixed/sticky sections, cinematic transitions, progressive disclosure, full-screen chapters, depth perception.
- **Primary colors:** Story-dependent, often gradients and natural colors, section-specific palettes
- **Secondary colors:** Section transition colors, depth layer colors, narrative mood colors
- **Effects & animation:** transform: translateY(scroll), position: fixed/sticky, perspective: 1px, scroll-triggered animations
- **Key design values:** --parallax-speed-bg: 0.3, --parallax-speed-mid: 0.6, --parallax-speed-fg: 1, --section-height: 100vh, --transition-duration: 600ms, --perspective: 1px
- **Best suited for:** Brand storytelling, product launches, case studies, portfolios, annual reports, marketing campaigns
- **Avoid for:** E-commerce, dashboards, mobile-first, SEO-critical, accessibility-required
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✗ Low  ·  **Conversion:** ✓ High
- **Accessibility:** ❌ Poor (motion)  ·  **Performance:** ❌ Poor

## Recommended typography
- **Pairing:** Modern Dark Cinema (Inter System) (Sans + Mono)
- **Heading typeface:** Inter
- **Body typeface:** Inter
- **Mood:** dark, cinematic, technical, precision, clean, premium, developer, professional, high-end utility

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
- The interface must immediately communicate the "Parallax Storytelling" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
