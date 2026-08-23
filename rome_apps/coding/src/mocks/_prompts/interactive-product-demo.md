# Styling Prompt — Interactive Product Demo

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Interactive Product Demo
- **Type:** Landing Page  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Embedded product mockup/video, interactive elements, product walkthrough, step-by-step guides, hover-to-reveal features, embedded demos
- **Art direction:** Design an interactive demo landing page. Use: embedded product mockup, video walkthrough, step-by-step guide, hover-to-reveal features, live demo button, screenshot carousel, feature highlights on interaction.
- **Primary colors:** Primary brand, interface colors matching product, demo highlight colors for interactive elements
- **Secondary colors:** Product UI colors, tutorial step colors (numbered progression), hover state indicators
- **Effects & animation:** Product animation playback, step progression animations, hover reveal effects, smooth zoom on interaction
- **Key design values:** --video-aspect-ratio: 16/9, --overlay-bg: rgba(0,0,0,0.7), --step-indicator-size: 32px, --play-button-size: 80px, --transition-duration: 300ms
- **Best suited for:** SaaS platforms, tool/software products, productivity apps landing pages, developer tools, productivity software
- **Avoid for:** Simple services, consulting, non-digital products, complexity-averse audiences
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ Good  ·  **Conversion:** ✓ Very High
- **Accessibility:** ✓ WCAG AA  ·  **Performance:** ⚠ Good (video/interactive)

## Recommended typography
- **Pairing:** E-commerce Clean (Sans + Sans)
- **Heading typeface:** Rubik
- **Body typeface:** Nunito Sans
- **Mood:** ecommerce, clean, shopping, product, retail, conversion

## Recommended color palette
- **Reference semantic palette:** Productivity Tool
- `Primary` #0D9488 / `On Primary` #FFFFFF / `Secondary` #14B8A6 / `On Secondary` #0F172A / `Accent` #EA580C / `On Accent` #FFFFFF / `Background` #F0FDFA / `Foreground` #134E4A / `Card` #FFFFFF / `Card Foreground` #134E4A / `Muted` #E8F1F4 / `Muted Foreground` #64748B / `Border` #99F6E4 / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #0D9488
- **Notes:** Teal focus + action orange [Accent adjusted from #F97316 for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Interactive Product Demo" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
