# Styling Prompt — Accessible & Ethical

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Accessible & Ethical
- **Type:** General  ·  **Origin/Era:** Universal  ·  **Complexity:** Low
- **Look & feel / keywords:** High contrast, large text (16px+), keyboard navigation, screen reader friendly, WCAG compliant, focus state, semantic
- **Art direction:** Design with WCAG AAA compliance. Include: high contrast (7:1+), large text (16px+), keyboard navigation, screen reader compatibility, focus states visible (3-4px ring), semantic HTML, ARIA labels, skip links, reduced motion support (prefers-reduced-motion), 44x44px touch targets.
- **Primary colors:** WCAG AA/AAA (4.5:1 min), simple primary, clear secondary, high luminosity (7:1+)
- **Secondary colors:** Symbol-based colors (not color-only), supporting patterns, inclusive combinations
- **Effects & animation:** Clear focus rings (3-4px), ARIA labels, skip links, responsive design, reduced motion, 44x44px touch targets
- **Key design values:** --contrast-ratio: 7:1, --font-size-min: 16px, --focus-ring: 3-4px, --touch-target: 44x44px, --wcag-level: AAA, --keyboard-accessible: true, --sr-tested: true
- **Best suited for:** Government, healthcare, education, inclusive products, large audience, legal compliance, public
- **Avoid for:** None - accessibility universal
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ High  ·  **Conversion:** ✓ High
- **Accessibility:** ✓ WCAG AAA  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Minimalist Monochrome Editorial (Serif + Serif + Mono (Triple Stack))
- **Heading typeface:** Playfair Display
- **Body typeface:** Source Serif 4
- **Mood:** monochrome, editorial, austere, typographic, pocket manifesto, luxury, high contrast, brutalist mobile

## Recommended color palette
- **Reference semantic palette:** Government/Public Service
- `Primary` #0F172A / `On Primary` #FFFFFF / `Secondary` #334155 / `On Secondary` #FFFFFF / `Accent` #0369A1 / `On Accent` #FFFFFF / `Background` #F8FAFC / `Foreground` #020617 / `Card` #FFFFFF / `Card Foreground` #020617 / `Muted` #E8ECF1 / `Muted Foreground` #64748B / `Border` #E2E8F0 / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #0F172A
- **Notes:** High contrast navy + blue
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Accessible & Ethical" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
