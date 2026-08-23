# Styling Prompt — Bento Box Grid

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Bento Box Grid
- **Type:** General  ·  **Origin/Era:** 2020s Apple  ·  **Complexity:** Low
- **Look & feel / keywords:** Modular cards, asymmetric grid, varied sizes, Apple-style, dashboard tiles, negative space, clean hierarchy, cards
- **Art direction:** Design a Bento Box grid layout. Use: modular cards with varied sizes (1x1, 2x1, 2x2), Apple-style aesthetic, rounded corners (16-24px), soft shadows, clean hierarchy, asymmetric grid, neutral backgrounds (#F5F5F7), hover effects.
- **Primary colors:** Neutral base + brand accent, #FFFFFF, #F5F5F5, brand primary
- **Secondary colors:** Subtle gradients, shadow variations, accent highlights for interactive cards
- **Effects & animation:** grid-template with varied spans, rounded-xl (16px), subtle shadows, hover scale (1.02), smooth transitions
- **Key design values:** --grid-gap: 16px, --card-radius: 24px, --card-bg: #FFFFFF, --page-bg: #F5F5F7, --shadow: 0 4px 6px rgba(0,0,0,0.05), --hover-scale: 1.02
- **Best suited for:** Dashboards, product pages, portfolios, Apple-style marketing, feature showcases, SaaS
- **Avoid for:** Dense data tables, text-heavy content, real-time monitoring
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ High  ·  **Conversion:** ✓ High
- **Accessibility:** ✓ WCAG AA  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Neo Brutalism Mobile (Space Grotesk Heavy) (Geometric Sans (Bold-Only))
- **Heading typeface:** Space Grotesk
- **Body typeface:** Space Grotesk
- **Mood:** neo brutalism, pop art, loud, bold, heavy, stickers, mechanical, high contrast, cream, gen-z

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
- The interface must immediately communicate the "Bento Box Grid" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
