# Styling Prompt — Real-Time Monitoring

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Real-Time Monitoring
- **Type:** BI/Analytics  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Live data updates, status indicators, alert notifications, streaming data visualization, active monitoring, streaming charts
- **Art direction:** Design a real-time monitoring dashboard. Use: live status indicators (pulsing), streaming charts, alert notifications, connection status, auto-refresh indicators, critical alerts prominent, system health overview.
- **Primary colors:** Alert colors: critical (red #FF0000), warning (orange #FFA500), normal (green #22C55E), updating (blue animation)
- **Secondary colors:** Status indicator colors, chart line colors varying by metric, streaming data highlight colors
- **Effects & animation:** Real-time chart animations, alert pulse/glow, status indicator blink animation, smooth data stream updates, loading effect
- **Key design values:** --pulse-animation: pulse 2s infinite, --alert-z-index: 1000, --live-indicator: #22C55E, --critical-color: #DC2626, --update-interval: 5s, --toast-duration: 5s
- **Best suited for:** System monitoring dashboards, DevOps dashboards, real-time analytics, stock market dashboards, live event tracking
- **Avoid for:** Historical analysis, long-term trend reports, archived data dashboards
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ◐ Medium  ·  **Conversion:** ✗ Not applicable
- **Accessibility:** ✓ WCAG AA  ·  **Performance:** ⚡ Good (real-time load)

## Recommended typography
- **Pairing:** Dashboard Data (Mono + Sans)
- **Heading typeface:** Fira Code
- **Body typeface:** Fira Sans
- **Mood:** dashboard, data, analytics, code, technical, precise

## Recommended color palette
- **Reference semantic palette:** Real Estate/Property
- `Primary` #0F766E / `On Primary` #FFFFFF / `Secondary` #14B8A6 / `On Secondary` #0F172A / `Accent` #0369A1 / `On Accent` #FFFFFF / `Background` #F0FDFA / `Foreground` #134E4A / `Card` #FFFFFF / `Card Foreground` #134E4A / `Muted` #E8F0F3 / `Muted Foreground` #64748B / `Border` #99F6E4 / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #0F766E
- **Notes:** Trust teal + professional blue
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Real-Time Monitoring" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
