# Master styling prompt (reusable shell)

Fill the `{{...}}` placeholders with a style's spec (see any `<slug>.md` in this folder for filled examples, or pull values from `src/ui-ux-pro-max/data/styles.csv`, `typography.csv`, and `colors.csv`). Replace `{{PRODUCT_REQUIREMENT}}` with your own product description. The result is a complete, technology-agnostic UI-style prompt.

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: {{STYLE_NAME}}
- Type: {{TYPE}}  ·  Origin/Era: {{ERA}}  ·  Complexity: {{COMPLEXITY}}
- Look & feel / keywords: {{KEYWORDS}}
- Art direction: {{AI_PROMPT_KEYWORDS}}
- Primary colors: {{PRIMARY_COLORS}}
- Secondary colors: {{SECONDARY_COLORS}}
- Effects & animation: {{EFFECTS_AND_ANIMATION}}
- Key design values: {{DESIGN_SYSTEM_VARIABLES}}
- Best suited for: {{BEST_FOR}}
- Avoid for: {{DO_NOT_USE_FOR}}
- Theme support: Light {{LIGHT_MODE}} · Dark {{DARK_MODE}}  ·  Mobile: {{MOBILE_FRIENDLY}}  ·  Conversion: {{CONVERSION_FOCUSED}}
- Accessibility: {{ACCESSIBILITY}}  ·  Performance: {{PERFORMANCE}}

## Recommended typography
- Pairing: {{FONT_PAIRING_NAME}} — Heading {{HEADING_FONT}} / Body {{BODY_FONT}}
- Mood: {{FONT_MOOD}}

## Recommended color palette
- Reference semantic palette: {{PALETTE_NAME}}
- Primary {{C_PRIMARY}} / On Primary {{C_ON_PRIMARY}} / Secondary {{C_SECONDARY}} / Accent {{C_ACCENT}} / Background {{C_BACKGROUND}} / Foreground {{C_FOREGROUND}} / Card {{C_CARD}} / Muted {{C_MUTED}} / Border {{C_BORDER}} / Ring {{C_RING}} / Destructive {{C_DESTRUCTIVE}}
- (The style's own Primary/Secondary colors take precedence; use this set to fill semantic roles.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "{{STYLE_NAME}}" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.
```
