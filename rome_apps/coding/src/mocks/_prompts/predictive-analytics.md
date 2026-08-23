# Styling Prompt — Predictive Analytics

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Predictive Analytics
- **Type:** BI/Analytics  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Forecast lines, confidence intervals, trend projections, scenario modeling, AI-driven insights, anomaly detection visualization
- **Art direction:** Design a predictive analytics dashboard. Use: forecast lines (dashed), confidence intervals (shaded bands), trend projections, anomaly highlights, scenario toggles, AI insight cards, probability indicators.
- **Primary colors:** Forecast line color (distinct from actual), confidence interval shading, anomaly highlight (red alert), trend colors
- **Secondary colors:** High confidence (dark color), low confidence (light color), anomaly colors (red/orange), normal trend (green/blue)
- **Effects & animation:** Forecast line animation on draw, confidence band fade-in, anomaly pulse alert, smoothing function animations
- **Key design values:** --forecast-dash: 5 5, --confidence-opacity: 0.2, --anomaly-color: #F59E0B, --prediction-color: #8B5CF6, --scenario-toggle-width: 48px, --ai-accent: #6366F1
- **Best suited for:** Forecasting dashboards, anomaly detection systems, trend prediction dashboards, AI-powered analytics, budget planning
- **Avoid for:** Historical-only dashboards, simple reporting, real-time operational dashboards
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ◐ Medium  ·  **Conversion:** ✗ Not applicable
- **Accessibility:** ✓ WCAG AA  ·  **Performance:** ⚠ Good (computation)

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
- The interface must immediately communicate the "Predictive Analytics" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
