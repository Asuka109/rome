# Styling Prompt — Comparative Analysis Dashboard

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Comparative Analysis Dashboard
- **Type:** BI/Analytics  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Side-by-side comparisons, period-over-period metrics, A/B test results, regional comparisons, performance benchmarks
- **Art direction:** Design a comparison dashboard. Use: side-by-side metrics, period selectors (vs last month), delta indicators (+/-), benchmark lines, A/B comparison tables, winning/losing highlights, percentage change badges.
- **Primary colors:** Comparison colors: primary (blue), comparison (orange/purple), delta indicator (green/red)
- **Secondary colors:** Winning metric color (green), losing metric color (red), neutral comparison (grey), benchmark colors
- **Effects & animation:** Comparison bar animations (grow to value), delta indicator animations (direction arrows), highlight on compare
- **Key design values:** --positive-color: #22C55E, --negative-color: #EF4444, --neutral-color: #6B7280, --comparison-gap: 2rem, --arrow-size: 16px, --badge-padding: 4px 8px
- **Best suited for:** Period-over-period reporting, A/B test dashboards, market comparison, competitive analysis, regional performance
- **Avoid for:** Single metric dashboards, future projections (use forecasting), real-time only (no historical)
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ◐ Medium  ·  **Conversion:** ✗ Not applicable
- **Accessibility:** ✓ WCAG AA  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Dashboard Data (Mono + Sans)
- **Heading typeface:** Fira Code
- **Body typeface:** Fira Sans
- **Mood:** dashboard, data, analytics, code, technical, precise

## Recommended color palette
- **Reference semantic palette:** Period & Cycle Tracker
- `Primary` #BE185D / `On Primary` #FFFFFF / `Secondary` #EC4899 / `On Secondary` #FFFFFF / `Accent` #7C3AED / `On Accent` #FFFFFF / `Background` #FDF2F8 / `Foreground` #0F172A / `Card` #FFFFFF / `Card Foreground` #0F172A / `Muted` #FBF1F5 / `Muted Foreground` #64748B / `Border` #F7E3EB / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #BE185D
- **Notes:** Blush rose + fertility lavender
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Comparative Analysis Dashboard" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
