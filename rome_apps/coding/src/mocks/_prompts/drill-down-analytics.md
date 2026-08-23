# Styling Prompt — Drill-Down Analytics

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Drill-Down Analytics
- **Type:** BI/Analytics  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Hierarchical data exploration, expandable sections, interactive drill-down paths, summary-to-detail flow, context preservation
- **Art direction:** Design a drill-down analytics dashboard. Use: breadcrumb navigation, expandable sections, summary-to-detail flow, back button prominent, level indicators, context preservation, hierarchical data display.
- **Primary colors:** Primary brand, breadcrumb colors, drill-level indicator colors, hierarchy depth colors
- **Secondary colors:** Drill-down path indicator colors, level-specific colors, highlight colors for selected level, transition colors
- **Effects & animation:** Drill-down expand animations, breadcrumb click transitions, smooth detail reveal, level change smooth, data reload animation
- **Key design values:** --breadcrumb-separator: /, --expand-duration: 300ms, --level-indent: 24px, --back-button-size: 40px, --context-bar-height: 48px, --drill-transition: 300ms ease
- **Best suited for:** Sales analytics, product analytics, funnel analysis, multi-dimensional data exploration, business intelligence
- **Avoid for:** Simple linear data, single-metric dashboards, streaming real-time dashboards
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ◐ Medium  ·  **Conversion:** ✗ Not applicable
- **Accessibility:** ✓ WCAG AA  ·  **Performance:** ⚡ Good

## Recommended typography
- **Pairing:** Dashboard Data (Mono + Sans)
- **Heading typeface:** Fira Code
- **Body typeface:** Fira Sans
- **Mood:** dashboard, data, analytics, code, technical, precise

## Recommended color palette
- **Reference semantic palette:** Analytics Dashboard
- `Primary` #1E40AF / `On Primary` #FFFFFF / `Secondary` #3B82F6 / `On Secondary` #FFFFFF / `Accent` #D97706 / `On Accent` #FFFFFF / `Background` #F8FAFC / `Foreground` #1E3A8A / `Card` #FFFFFF / `Card Foreground` #1E3A8A / `Muted` #E9EEF6 / `Muted Foreground` #64748B / `Border` #DBEAFE / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #1E40AF
- **Notes:** Blue data + amber highlights [Accent adjusted from #F59E0B for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Drill-Down Analytics" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
