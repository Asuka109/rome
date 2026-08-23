# Styling Prompt — 3D Product Preview

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: 3D Product Preview
- **Type:** General  ·  **Origin/Era:** 2025+ E-commerce 3D  ·  **Complexity:** High
- **Look & feel / keywords:** 360 product view, rotatable, zoomable, touch-to-spin, AR preview, product configurator, interactive 3D model
- **Art direction:** Design a 3D product preview interface. Use: 360° rotation, drag-to-spin, pinch-to-zoom, AR preview button, material/color switcher, hotspot annotations, orbit controls, product configurator, smooth rendering.
- **Primary colors:** Product-dependent, neutral backgrounds: Soft Grey #E8E8E8, Pure White #FFFFFF
- **Secondary colors:** Shadow gradients, reflection planes, environment lighting colors, accent highlights
- **Effects & animation:** Drag-to-rotate, pinch-to-zoom, spin animation, AR placement, material switching, smooth orbit controls
- **Key design values:** --canvas-bg: #F5F5F5, --hotspot-color: #3B82F6, --loading-spinner: primary, --rotation-speed: 0.5, --zoom-min: 0.5, --zoom-max: 2
- **Best suited for:** E-commerce, furniture, fashion, automotive, electronics, jewelry, product configurators
- **Avoid for:** Content-heavy sites, blogs, dashboards, low-bandwidth, accessibility-critical
- **Theme support:** Light ◐ Partial · Dark ◐ Partial  ·  **Mobile:** ◐ Medium  ·  **Conversion:** ✓ Very High
- **Accessibility:** ⚠ Alt content needed  ·  **Performance:** ❌ Poor (3D rendering)

## Recommended typography
- **Pairing:** E-commerce Clean (Sans + Sans)
- **Heading typeface:** Rubik
- **Body typeface:** Nunito Sans
- **Mood:** ecommerce, clean, shopping, product, retail, conversion

## Recommended color palette
- **Reference semantic palette:** Automotive/Car Dealership
- `Primary` #1E293B / `On Primary` #FFFFFF / `Secondary` #334155 / `On Secondary` #FFFFFF / `Accent` #DC2626 / `On Accent` #FFFFFF / `Background` #F8FAFC / `Foreground` #0F172A / `Card` #FFFFFF / `Card Foreground` #0F172A / `Muted` #E9EDF1 / `Muted Foreground` #64748B / `Border` #E2E8F0 / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #1E293B
- **Notes:** Premium dark + action red
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "3D Product Preview" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
