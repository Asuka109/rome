# Styling Prompt — Heat Map & Heatmap Style

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Heat Map & Heatmap Style
- **Type:** BI/Analytics  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Color-coded grid/matrix, data intensity visualization, geographical heat maps, correlation matrices, cell-based representation, gradient coloring
- **Art direction:** Design a heatmap visualization. Use: color gradient scale (cool to hot), cell-based grid, intensity legend, hover tooltips, geographic or matrix layout, divergent color scheme for +/- values, accessible color alternatives.
- **Primary colors:** Gradient scale: Cool (blue #0080FF) to hot (red #FF0000), neutral middle (white/yellow)
- **Secondary colors:** Support gradients: Light (cool blue) to dark (warm red), divergent for positive/negative data, monochromatic options
- **Effects & animation:** Color gradient transitions on data change, cell highlighting on hover, tooltip reveal on click, smooth color animation
- **Key design values:** --heatmap-cool: #0080FF, --heatmap-neutral: #FFFFFF, --heatmap-hot: #FF0000, --cell-size: 24px, --legend-width: 200px, --tooltip-bg: rgba(0,0,0,0.9)
- **Best suited for:** Geographical analysis, performance matrices, correlation analysis, user behavior heatmaps, temperature/intensity data
- **Avoid for:** Linear data representation, categorical comparisons (use bar charts), small datasets
- **Theme support:** Light ✓ Full · Dark ✓ Full (with adjustments)  ·  **Mobile:** ◐ Medium  ·  **Conversion:** ✗ Not applicable
- **Accessibility:** ⚠ Colorblind considerations  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Dashboard Data (Mono + Sans)
- **Heading typeface:** Fira Code
- **Body typeface:** Fira Sans
- **Mood:** dashboard, data, analytics, code, technical, precise

## Recommended color palette
- **Reference semantic palette:** Ride Hailing / Transportation
- `Primary` #1E293B / `On Primary` #FFFFFF / `Secondary` #334155 / `On Secondary` #FFFFFF / `Accent` #2563EB / `On Accent` #FFFFFF / `Background` #0F172A / `Foreground` #FFFFFF / `Card` #192134 / `Card Foreground` #FFFFFF / `Muted` #10182B / `Muted Foreground` #94A3B8 / `Border` rgba(255,255,255,0.08) / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #1E293B
- **Notes:** Map dark + route blue
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Heat Map & Heatmap Style" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
