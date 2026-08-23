# Styling Prompt — Inclusive Design

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Inclusive Design
- **Type:** General  ·  **Origin/Era:** Universal  ·  **Complexity:** Low
- **Look & feel / keywords:** Accessible, color-blind friendly, high contrast, haptic feedback, voice interaction, screen reader, WCAG AAA, universal
- **Art direction:** Design for universal accessibility: high contrast (7:1+), large text (16px+), keyboard-only navigation, screen reader optimization, WCAG AAA compliance, symbol-based color indicators (not color-only), haptic feedback, voice interaction support, reduced motion options.
- **Primary colors:** WCAG AAA (7:1+ contrast), avoid red-green only, symbol-based indicators, high contrast primary
- **Secondary colors:** Supporting patterns (stripes, dots, hatch), symbols, combinations, clear non-color indicators
- **Effects & animation:** Haptic feedback (vibration), voice guidance, focus indicators (4px+ ring), motion options, alt content, semantic
- **Key design values:** --contrast-ratio: 7:1, --font-size: 16px+, --keyboard-accessible: true, --sr-compatible: true, --wcag-level: AAA, --color-symbols: true, --haptic: enabled
- **Best suited for:** Public services, education, healthcare, finance, government, accessible consumer, inclusive
- **Avoid for:** None - accessibility universal
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ High  ·  **Conversion:** ✓ High
- **Accessibility:** ✓ WCAG AAA  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Accessibility First (Sans + Sans)
- **Heading typeface:** Atkinson Hyperlegible
- **Body typeface:** Atkinson Hyperlegible
- **Mood:** accessible, readable, inclusive, WCAG, dyslexia-friendly, clear

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
- The interface must immediately communicate the "Inclusive Design" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
