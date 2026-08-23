# Styling Prompt — Storytelling-Driven

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Storytelling-Driven
- **Type:** Landing Page  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Narrative flow, visual story progression, section transitions, consistent character/brand voice, emotional messaging, journey visualization
- **Art direction:** Design a storytelling landing page. Use: narrative flow sections, scroll-triggered reveals, chapter-like structure, emotional imagery, brand journey visualization, founder story, mission statement, timeline progression.
- **Primary colors:** Brand primary, warm/emotional colors, varied accent colors per story section, high visual variety
- **Secondary colors:** Story section color coding, emotional state colors (calm, excitement, success), transitional gradients
- **Effects & animation:** Section-to-section animations, scroll-triggered reveals, character/icon animations, morphing transitions, parallax narrative
- **Key design values:** --section-min-height: 100vh, --reveal-duration: 600ms, --narrative-font: serif, --chapter-spacing: 8rem, --timeline-color: accent, --parallax-speed: 0.5
- **Best suited for:** Brand/startup stories, mission-driven products, premium/lifestyle brands, documentary-style products, educational
- **Avoid for:** Technical/complex products (unless narrative-driven), traditional enterprise software
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ Good  ·  **Conversion:** ✓ High
- **Accessibility:** ✓ WCAG AA  ·  **Performance:** ⚠ Moderate (animations)

## Recommended typography
- **Pairing:** Cyberpunk Mobile (Orbitron + JetBrains Mono) (Tech Display + Mono)
- **Heading typeface:** Orbitron
- **Body typeface:** JetBrains Mono
- **Mood:** cyberpunk, neon, glitch, hud, sci-fi, dark, matrix green, magenta, chamfered, tactical

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
- The interface must immediately communicate the "Storytelling-Driven" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
