# Styling Prompt — E-Ink / Paper

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: E-Ink / Paper
- **Type:** General  ·  **Origin/Era:** 2020s Digital Well-being  ·  **Complexity:** Low
- **Look & feel / keywords:** Paper-like, matte, high contrast, texture, reading, calm, slow tech, monochrome
- **Art direction:** Design an e-ink/paper style interface. Use: high contrast black on off-white, paper texture, no animations (instant transitions), reading-focused, minimal UI chrome, distraction-free, calm aesthetic, monochrome.
- **Primary colors:** Off-White #FDFBF7, Paper White #F5F5F5, Ink Black #1A1A1A
- **Secondary colors:** Pencil Grey #4A4A4A, Highlighter Yellow #FFFF00 (accent)
- **Effects & animation:** No motion blur, distinct page turns, grain/noise texture, sharp transitions (no fade)
- **Key design values:** --paper-bg: #FDFBF7, --ink-color: #1A1A1A, --pencil-grey: #4A4A4A, --border-color: #E0E0E0, --font-reading: Georgia, --transition: none
- **Best suited for:** Reading apps, digital newspapers, minimal journals, distraction-free writing, slow-living brands
- **Avoid for:** Gaming, video platforms, high-energy marketing, dark mode dependent apps
- **Theme support:** Light ✓ Full · Dark ✗ Low (inverted only)  ·  **Mobile:** ✓ High  ·  **Conversion:** ✓ Medium
- **Accessibility:** ✓ WCAG AAA  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Minimalist Monochrome Editorial (Serif + Serif + Mono (Triple Stack))
- **Heading typeface:** Playfair Display
- **Body typeface:** Source Serif 4
- **Mood:** monochrome, editorial, austere, typographic, pocket manifesto, luxury, high contrast, brutalist mobile

## Recommended color palette
- **Reference semantic palette:** Notes & Writing App
- `Primary` #78716C / `On Primary` #FFFFFF / `Secondary` #A8A29E / `On Secondary` #FFFFFF / `Accent` #D97706 / `On Accent` #FFFFFF / `Background` #FFFBEB / `Foreground` #0F172A / `Card` #FFFFFF / `Card Foreground` #0F172A / `Muted` #F6F6F6 / `Muted Foreground` #64748B / `Border` #EEEDED / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #78716C
- **Notes:** Warm ink + amber accent on cream
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "E-Ink / Paper" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
