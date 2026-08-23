# Styling Prompt — Modern Dark (Cinema Mobile)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Modern Dark (Cinema Mobile)
- **Type:** Mobile  ·  **Origin/Era:** 2020s Cinematic Mobile  ·  **Complexity:** High
- **Look & feel / keywords:** dark mode, cinematic, ambient light, glassmorphism, deep black, indigo, glow, blur, atmospheric, reanimated, haptic, premium, layered, frosted glass, linear gradient
- **Art direction:** Design a cinematic dark mobile app. Background: LinearGradient from #0a0a0f (top) to #020203 (bottom). Add 2–3 absolute animated 'blob' views: circular, blurRadius 30–50, opacity 0.08–0.12, slow Reanimated oscillation. Cards: borderRadius 16, border rgba(255,255,255,0.08) hairline, subtle top-edge shine gradient. Primary button: #5E6AD2, scale press 0.97, haptic on press. BlurView (intensity 20, tint dark) for tab bar and headers. Typography: Inter 700 for headers, 400 for body. Never use pure #000000. Accent glow: rgba(94,106,210,0.2) behind primary actions.
- **Primary colors:** Deep #020203, Base #050506, Elevated #0a0a0c, Accent #5E6AD2
- **Secondary colors:** Foreground #EDEDEF, Muted #8A8F98, Accent Glow rgba(94 106 210/0.2), Border rgba(255 255 255/0.08), Surface rgba(255 255 255/0.05)
- **Effects & animation:** Expo.out Bezier(0.16,1,0.3,1) easing; spring modals (damping:20 stiffness:90); haptic-linked press (Impact Light/Medium); animated ambient light blobs (Reanimated translateX/Y slow oscillation); BlurView glassmorphism headers/nav (intensity 20); scale press 0.97 → 1.0; avoid pure #000000 (OLED smear)
- **Key design values:** --bg-deep: #020203, --bg-base: #050506, --bg-elevated: #0a0a0c, --surface: rgba(255 255 255/0.05), --foreground: #EDEDEF, --foreground-muted: #8A8F98, --accent: #5E6AD2, --accent-glow: rgba(94 106 210/0.2), --border: rgba(255 255 255/0.08), --radius: 16px, --easing: cubic-bezier(0.16 1 0.3 1), --font: Inter
- **Best suited for:** Developer tools, pro productivity apps, fintech/trading dashboards, media/streaming platforms, AI tool interfaces, high-end gaming companion apps
- **Avoid for:** Consumer apps needing warmth, children's apps, health/medical contexts where dark feels harsh, high-accessibility contexts needing maximum contrast
- **Theme support:** Light ✓ Light mode only as exception · Dark ✓ Dark Mode Primary  ·  **Mobile:** ✓ Mobile-First  ·  **Conversion:** ◐ Medium
- **Accessibility:** ⚠ WCAG AA (requires careful accent contrast check)  ·  **Performance:** ⚠ Good (blur effects require native driver)

## Recommended typography
- **Pairing:** Modern Dark Cinema (Inter System) (Sans + Mono)
- **Heading typeface:** Inter
- **Body typeface:** Inter
- **Mood:** dark, cinematic, technical, precision, clean, premium, developer, professional, high-end utility

## Recommended color palette
- **Reference semantic palette:** Video Streaming/OTT
- `Primary` #0F0F23 / `On Primary` #FFFFFF / `Secondary` #1E1B4B / `On Secondary` #FFFFFF / `Accent` #E11D48 / `On Accent` #FFFFFF / `Background` #000000 / `Foreground` #F8FAFC / `Card` #0C0C0D / `Card Foreground` #F8FAFC / `Muted` #181818 / `Muted Foreground` #94A3B8 / `Border` #312E81 / `Destructive` #EF4444 / `On Destructive` #FFFFFF / `Ring` #0F0F23
- **Notes:** Cinema dark + play red
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Modern Dark (Cinema Mobile)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
