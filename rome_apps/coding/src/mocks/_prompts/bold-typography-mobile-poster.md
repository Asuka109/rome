# Styling Prompt — Bold Typography (Mobile Poster)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Bold Typography (Mobile Poster)
- **Type:** Mobile  ·  **Origin/Era:** Editorial 2020s  ·  **Complexity:** Medium
- **Look & feel / keywords:** bold typography, editorial, poster, broadsheet, vermillion, negative space, edge-to-edge type, underline CTA, near-black, warm white
- **Art direction:** Design a Bold Typography mobile screen. Background #0A0A0A, text #FAFAFA, accent #FF3D00. Use Inter Tight/Inter 600+ for all type; JetBrains Mono for labels. Headline: 56–72px, tracking -1.5, lineHeight 1.1, full-bleed width with slight bleed off-screen. Body: 16–18px, leading 1.6. Buttons: underline CTA (accent text + 2px underline block), or inverted box with 0 radius. No shadows, no rounded corners. Layout: single column, paddingHorizontal 24, vertical gaps 64 between sections. Animation: 200ms, Easing.bezier(0.25,0,0,1), slight slide-up 10px + fade on mount.
- **Primary colors:** Near Black #0A0A0A, Warm White #FAFAFA
- **Secondary colors:** Muted #1A1A1A, Secondary Text #737373, Accent Vermillion #FF3D00, Border #262626
- **Effects & animation:** Hero headlines 48–72px (5:1 vs body size), tight tracking (-1.5px), edge-to-edge type, massive vertical spacing (60px+), underline CTAs (2–3px accent line), instant 200ms transitions (no bounce), strictly 0px radius containers, color shifts for active state instead of elevation
- **Key design values:** --bg: #0A0A0A, --fg: #FAFAFA, --muted: #1A1A1A, --muted-fg: #737373, --accent: #FF3D00, --accent-fg: #0A0A0A, --border: #262626, --font-primary: Inter Tight, --font-display: Playfair Display Italic, --font-mono: JetBrains Mono
- **Best suited for:** Creative brand heroes, reading-focused apps, event/exhibition pages, editorial mobile experiences, landing hero sections
- **Avoid for:** Utility dashboards, kids apps, playful consumer products, contexts needing many icons or heavy imagery
- **Theme support:** Light ✓ Dark Mode Primary · Dark ◐ Light sections optional  ·  **Mobile:** ✓ Mobile-First  ·  **Conversion:** ✓ High
- **Accessibility:** ✓ Contrast 18:1 achievable  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Bold Typography Mobile (Inter-Tight Poster) (Sans + Serif (Display) + Mono)
- **Heading typeface:** Inter
- **Body typeface:** Playfair Display
- **Mood:** bold typography, editorial, poster, near-black, vermillion, luxury, type-as-hero, manifesto, high-contrast

## Recommended color palette
- **Reference semantic palette:** Creative Agency
- `Primary` #EC4899 / `On Primary` #FFFFFF / `Secondary` #F472B6 / `On Secondary` #0F172A / `Accent` #0891B2 / `On Accent` #FFFFFF / `Background` #FDF2F8 / `Foreground` #831843 / `Card` #FFFFFF / `Card Foreground` #831843 / `Muted` #F1EEF5 / `Muted Foreground` #64748B / `Border` #FBCFE8 / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #EC4899
- **Notes:** Bold pink + cyan accent [Accent adjusted from #06B6D4 for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Bold Typography (Mobile Poster)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
