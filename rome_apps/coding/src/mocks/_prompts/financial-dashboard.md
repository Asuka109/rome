# Styling Prompt — Financial Dashboard

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Financial Dashboard
- **Type:** BI/Analytics  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Revenue metrics, profit/loss visualization, budget tracking, financial ratios, portfolio performance, cash flow, audit trail
- **Art direction:** Design a financial dashboard. Use: revenue/expense charts, profit margins, budget vs actual, cash flow waterfall, financial ratios, audit trail table, currency formatting, period comparisons.
- **Primary colors:** Financial colors: profit (green #22C55E), loss (red #EF4444), neutral (grey), trust (dark blue #003366)
- **Secondary colors:** Revenue highlight (green), expenses (red), budget variance (orange/red), balance (grey), accuracy (blue)
- **Effects & animation:** Number animations (count-up), trend direction indicators, percentage change animations, profit/loss color transitions
- **Key design values:** --currency-symbol: $, --decimal-places: 2, --profit-color: #22C55E, --loss-color: #EF4444, --variance-threshold: 10%, --table-header-bg: #F3F4F6
- **Best suited for:** Financial reporting, accounting dashboards, portfolio tracking, budget monitoring, banking analytics
- **Avoid for:** Simple business dashboards, entertainment/social metrics, non-financial data
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✗ Low  ·  **Conversion:** ✗ Not applicable
- **Accessibility:** ✓ WCAG AAA  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Financial Trust (Sans + Sans)
- **Heading typeface:** IBM Plex Sans
- **Body typeface:** IBM Plex Sans
- **Mood:** financial, trustworthy, professional, corporate, banking, serious

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
- The interface must immediately communicate the "Financial Dashboard" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
