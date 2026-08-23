# Styling Prompt — Enterprise SaaS (Mobile)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Enterprise SaaS (Mobile)
- **Type:** Mobile  ·  **Origin/Era:** Enterprise/SaaS  ·  **Complexity:** High
- **Look & feel / keywords:** enterprise, saas, b2b, professional, indigo, violet, gradient, polished, trustworthy, clean, approachable, spring, haptic
- **Art direction:** Design a Modern Enterprise SaaS mobile app. Background #F8FAFC, surfaces #FFFFFF, primary #4F46E5 (Indigo), secondary #7C3AED (Violet). Typography: Plus Jakarta Sans, ExtraBold 800 for screen titles, Bold 700 for section headers, SemiBold 600 for buttons, Regular 400 for body. Line height 1.1–1.2 for titles, 1.4–1.5 for body. Primary button: full-width, LinearGradient Indigo→Violet, pill-shaped or radius 12, scale 0.95 on press with medium haptic. Cards: white bg, 16pt radius, hairline border, shadow rgba(79,70,229,0.08). Inputs: white bg, 8pt radius, floating label, Indigo border on focus. Bottom Tab Navigation (3–5 items), gradient active tab icon. Screen padding 16–20pt. Vertical rhythm 24pt between sections, 12pt between items. Shared Element Transition for hero cards opening to detail.
- **Primary colors:** Indigo #4F46E5, Violet #7C3AED
- **Secondary colors:** Slate 50 #F8FAFC, White #FFFFFF, Slate 900 #0F172A, Slate 500 #64748B, Emerald #10B981, Slate 200 #E2E8F0
- **Effects & animation:** Indigo→Violet gradient primary CTAs + active tab highlights, colored card shadows rgba(79,70,229,0.08), pill buttons or 12pt radius, full-width CTA at screen bottom, spring press scale 0.97, floating label inputs with animated focus border, skeletal loading pulses (Indigo/Slate tint), Bottom Sheets with drag dismiss, swipe-to-action list cards, scroll-linked title collapse
- **Key design values:** --bg: #F8FAFC, --surface: #FFFFFF, --text: #0F172A, --muted: #64748B, --primary: #4F46E5, --secondary: #7C3AED, --success: #10B981, --border: #E2E8F0, --radius-card: 16px, --radius-pill: 999px, --radius-input: 8px, --shadow-card: rgba(79,70,229,0.08), --font: Plus Jakarta Sans
- **Best suited for:** B2B backend management, productivity tools, government and finance mobile apps, SaaS companion apps, enterprise dashboards
- **Avoid for:** Pure consumer entertainment, Gen-Z youth apps, gaming UI, ultra-minimal editorial
- **Theme support:** Light ✓ Light · Dark ✓ Dark-ready (token inversion)  ·  **Mobile:** ✓ Mobile-First (Safe Area strict)  ·  **Conversion:** ✓ High
- **Accessibility:** ✓ WCAG AA  ·  **Performance:** ✓ Performant

## Recommended typography
- **Pairing:** Enterprise SaaS Mobile (Plus Jakarta Sans) (Geometric Sans (Single Family))
- **Heading typeface:** Plus Jakarta Sans
- **Body typeface:** Plus Jakarta Sans
- **Mood:** enterprise, saas, b2b, professional, indigo, modern, approachable, legible, ios dynamic type, android scaling

## Recommended color palette
- **Reference semantic palette:** Micro SaaS
- `Primary` #6366F1 / `On Primary` #FFFFFF / `Secondary` #818CF8 / `On Secondary` #0F172A / `Accent` #059669 / `On Accent` #FFFFFF / `Background` #F5F3FF / `Foreground` #1E1B4B / `Card` #FFFFFF / `Card Foreground` #1E1B4B / `Muted` #EBEFF9 / `Muted Foreground` #64748B / `Border` #E0E7FF / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #6366F1
- **Notes:** Indigo primary + emerald CTA [Accent adjusted from #10B981 for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Enterprise SaaS (Mobile)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
