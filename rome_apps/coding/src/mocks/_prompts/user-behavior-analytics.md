# Styling Prompt — User Behavior Analytics

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: User Behavior Analytics
- **Type:** BI/Analytics  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Funnel visualization, user flow diagrams, conversion tracking, engagement metrics, user journey mapping, cohort analysis
- **Art direction:** Design a user behavior analytics dashboard. Use: funnel visualization, user flow diagrams (Sankey), conversion metrics, engagement heatmaps, cohort tables, retention curves, session replay indicators.
- **Primary colors:** Funnel stage colors: high engagement (green), drop-off (red), conversion (blue), user flow arrows (grey)
- **Secondary colors:** Stage completion colors (success), abandonment colors (warning), engagement levels (gradient), cohort colors
- **Effects & animation:** Funnel animation (fill-down), flow diagram animations (connection draw), conversion pulse, engagement bar fill
- **Key design values:** --funnel-width: 100%, --stage-colors: gradient, --flow-opacity: 0.6, --cohort-cell-size: 40px, --retention-line-color: #3B82F6, --engagement-scale: 5 levels
- **Best suited for:** Conversion funnel analysis, user journey tracking, engagement analytics, cohort analysis, retention tracking
- **Avoid for:** Real-time operational metrics, technical system monitoring, financial transactions
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ Good  ·  **Conversion:** ✗ Not applicable
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
- The interface must immediately communicate the "User Behavior Analytics" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
