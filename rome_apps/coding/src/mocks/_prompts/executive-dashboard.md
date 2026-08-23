# Styling Prompt — Executive Dashboard

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Executive Dashboard
- **Type:** BI/Analytics  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** High-level KPIs, large key metrics, minimal detail, summary view, trend indicators, at-a-glance insights, executive summary
- **Art direction:** Design an executive dashboard. Use: large KPI cards (4-6 max), trend sparklines, high-level summary only, clean layout with white space, traffic light indicators (red/yellow/green), at-a-glance insights, minimal detail.
- **Primary colors:** Brand colors, professional palette (blue/grey/white), accent for KPIs, red for alerts/concerns
- **Secondary colors:** KPI highlight colors: positive (green), negative (red), neutral (grey), trend arrow colors
- **Effects & animation:** KPI value animations (count-up), trend arrow direction animations, metric card hover lift, alert pulse effect
- **Key design values:** --kpi-font-size: 48px, --sparkline-height: 32px, --status-green: #22C55E, --status-yellow: #F59E0B, --status-red: #EF4444, --card-min-width: 280px
- **Best suited for:** C-suite dashboards, business summary reports, decision-maker dashboards, strategic planning views
- **Avoid for:** Detailed analyst dashboards, technical deep-dives, operational monitoring
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✗ Low (not mobile-optimized)  ·  **Conversion:** ✗ Not applicable
- **Accessibility:** ✓ WCAG AA  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Dashboard Data (Mono + Sans)
- **Heading typeface:** Fira Code
- **Body typeface:** Fira Sans
- **Mood:** dashboard, data, analytics, code, technical, precise

## Recommended color palette
- **Reference semantic palette:** Financial Dashboard
- `Primary` #0F172A / `On Primary` #FFFFFF / `Secondary` #1E293B / `On Secondary` #FFFFFF / `Accent` #22C55E / `On Accent` #0F172A / `Background` #020617 / `Foreground` #F8FAFC / `Card` #0E1223 / `Card Foreground` #F8FAFC / `Muted` #1A1E2F / `Muted Foreground` #94A3B8 / `Border` #334155 / `Destructive` #EF4444 / `On Destructive` #FFFFFF / `Ring` #0F172A
- **Notes:** Dark bg + green positive indicators
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Executive Dashboard" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
