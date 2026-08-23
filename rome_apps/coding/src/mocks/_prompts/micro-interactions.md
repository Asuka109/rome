# Styling Prompt — Micro-interactions

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Micro-interactions
- **Type:** General  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** Medium
- **Look & feel / keywords:** Small animations, gesture-based, tactile feedback, subtle animations, contextual interactions, responsive
- **Art direction:** Design with delightful micro-interactions: small 50-100ms animations, gesture-based responses, tactile feedback, loading spinners, success/error states, subtle hover effects, haptic feedback triggers for mobile. Focus on responsive, contextual interactions.
- **Primary colors:** Subtle color shifts (10-20%), feedback: Green #22C55E, Red #EF4444, Amber #F59E0B
- **Secondary colors:** Accent feedback, neutral supporting, clear action indicators
- **Effects & animation:** Small hover (50-100ms), loading spinners, success/error state anim, gesture-triggered (swipe/pinch), haptic
- **Key design values:** --micro-animation-duration: 50-100ms, --gesture-responsive: true, --haptic-feedback: true, --loading-animation: smooth, --state-feedback: success+error
- **Best suited for:** Mobile apps, touchscreen UIs, productivity tools, user-friendly, consumer apps, interactive components
- **Avoid for:** Desktop-only, critical performance, accessibility-first (alternatives needed)
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ High  ·  **Conversion:** ✓ High
- **Accessibility:** ✓ Good  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Flat Design Mobile (System Bold) (Sans + Sans)
- **Heading typeface:** Inter
- **Body typeface:** Inter
- **Mood:** flat, clean, system, bold, geometric, cross-platform, icon, poster, minimal, functional, responsive

## Recommended color palette
- **Reference semantic palette:** AI/Chatbot Platform
- `Primary` #7C3AED / `On Primary` #FFFFFF / `Secondary` #A78BFA / `On Secondary` #0F172A / `Accent` #0891B2 / `On Accent` #FFFFFF / `Background` #FAF5FF / `Foreground` #1E1B4B / `Card` #FFFFFF / `Card Foreground` #1E1B4B / `Muted` #ECEEF9 / `Muted Foreground` #64748B / `Border` #DDD6FE / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #7C3AED
- **Notes:** AI purple + cyan interactions [Accent adjusted from #06B6D4 for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Micro-interactions" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
