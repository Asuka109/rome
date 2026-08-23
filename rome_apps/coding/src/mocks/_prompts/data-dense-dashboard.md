# Styling Prompt — Data-Dense Dashboard

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Data-Dense Dashboard
- **Type:** BI/Analytics  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Multiple charts/widgets, data tables, KPI cards, minimal padding, grid layout, space-efficient, maximum data visibility
- **Art direction:** Design a data-dense dashboard. Use: multiple chart widgets, KPI cards row, data tables with sorting, minimal padding (8-12px), efficient grid layout, filter sidebar, dense but readable typography, maximum information density.
- **Primary colors:** Neutral primary (light grey/white #F5F5F5), data colors (blue/green/red), dark text #333333
- **Secondary colors:** Chart colors: success (green #22C55E), warning (amber #F59E0B), alert (red #EF4444), neutral (grey)
- **Effects & animation:** Hover tooltips, chart zoom on click, row highlighting on hover, smooth filter animations, data loading spinners
- **Key design values:** --grid-gap: 8px, --card-padding: 12px, --font-size-small: 12px, --table-row-height: 36px, --sidebar-width: 240px, --header-height: 56px
- **Best suited for:** Business intelligence dashboards, financial analytics, enterprise reporting, operational dashboards, data warehousing
- **Avoid for:** Marketing dashboards, consumer-facing analytics, simple reporting
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ◐ Medium  ·  **Conversion:** ✗ Not applicable
- **Accessibility:** ✓ WCAG AA  ·  **Performance:** ⚡ Excellent

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
- The interface must immediately communicate the "Data-Dense Dashboard" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
