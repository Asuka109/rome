# Styling Prompt — Terminal CLI (Mobile)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Terminal CLI (Mobile)
- **Type:** Mobile  ·  **Origin/Era:** Retro-Future 1980s–2020s  ·  **Complexity:** Medium
- **Look & feel / keywords:** terminal, cli, matrix green, monospace, hacker, ascii, command line, developer, web3, crypto, sci-fi, OLED, retro-future, field operative
- **Art direction:** Design a Mobile Terminal CLI app. Background: #050505 OLED black. ALL text in Matrix Green #33FF00. Font: JetBrains Mono or SpaceMono ONLY — zero border-radius everywhere. ASCII borders using +, -, |, * characters instead of standard containers. Buttons displayed as [ EXECUTE ] or > PROCEED. On press: instantly inverts to green bg + black text + haptic. Cursor: blinking View opacity 0→1 at 500ms. Show boot sequence on launch (fake log scroll). Progress bars as [#####-----] text. Status bar footer: [BATTERY:88%] [NET:CONNECTED]. Scanline overlay: absolute View with repeating 1px horizontal lines at opacity 0.05. Typewriter effect on new data.
- **Primary colors:** Matrix Green #33FF00, OLED Black #050505
- **Secondary colors:** Amber #FFB000, Muted Green #1A3D1A, Error Red #FF3333, Border Green #33FF00
- **Effects & animation:** Blinking cursor (500ms opacity loop), typewriter text reveal hook, scanline overlay (repeating lines 0.05 opacity), ASCII art headers, instant color inversion on press (bg-green text-black), haptic on every keystroke, boot sequence splash on launch
- **Key design values:** --bg: #050505, --fg-primary: #33FF00, --fg-amber: #FFB000, --fg-muted: #1A3D1A, --fg-error: #FF3333, --border: #33FF00, --radius: 0px, --font: SpaceMono-Regular or JetBrains Mono, --font-sizes: 12 14 16 only, --blink-duration: 500ms, --scanline-opacity: 0.05
- **Best suited for:** Developer tools, Web3/blockchain apps, geek-culture apps, ARG games, sci-fi/noir gaming companions, hacker/security tools, creative studio portfolios
- **Avoid for:** Consumer products, health apps, anything requiring approachability or warmth, children's apps, standard enterprise contexts
- **Theme support:** Light ✗ No · Dark ✓ OLED Dark Only  ·  **Mobile:** ✓ Mobile-First (OLED optimized)  ·  **Conversion:** ✗ Low
- **Accessibility:** ✓ High contrast (green on black ≫4.5:1 ratio)  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Terminal CLI Monospace (Mono + Mono (Single Family))
- **Heading typeface:** JetBrains Mono
- **Body typeface:** JetBrains Mono
- **Mood:** terminal, cli, hacker, monospace, matrix, developer, retro-future, command line, precision, OLED

## Recommended color palette
- **Reference semantic palette:** Gaming
- `Primary` #7C3AED / `On Primary` #FFFFFF / `Secondary` #A78BFA / `On Secondary` #0F172A / `Accent` #F43F5E / `On Accent` #FFFFFF / `Background` #0F0F23 / `Foreground` #E2E8F0 / `Card` #1E1C35 / `Card Foreground` #E2E8F0 / `Muted` #27273B / `Muted Foreground` #94A3B8 / `Border` #4C1D95 / `Destructive` #EF4444 / `On Destructive` #FFFFFF / `Ring` #7C3AED
- **Notes:** Neon purple + rose action
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Terminal CLI (Mobile)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
