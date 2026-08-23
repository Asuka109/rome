# Styling Prompt — Bitcoin DeFi (Mobile)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Bitcoin DeFi (Mobile)
- **Type:** Mobile  ·  **Origin/Era:** Fintech/Web3  ·  **Complexity:** High
- **Look & feel / keywords:** web3, bitcoin, defi, digital gold, fintech, wallet, orange, glassmorphism, gradient, blur, holographic, trust, precision
- **Art direction:** Design a Bitcoin DeFi mobile app. Background #030304, cards #0F1115, text #FFFFFF, muted #94A3B8. Primary CTA: LinearGradient #EA580C→#F7931A with orange glow shadow. Typography: Space Grotesk Bold for headings, Inter for body, JetBrains Mono for prices/hashes. Use BlurView (intensity 20) for nav bars and floating panels. Cards as 'blocks' with hairline borders and light orange glow on active. Use grid background (low-opacity 50px grid). Gradient text for key balances via MaskedView and LinearGradient orange→gold. Status indicators pulse using Reanimated. Ledger timelines drawn as vertical gradient line with pulsing dots.
- **Primary colors:** Bitcoin Orange #F7931A, Burnt Orange #EA580C, Digital Gold #FFD600
- **Secondary colors:** Void #030304, Dark Matter #0F1115, Pure Light #FFFFFF, Stardust #94A3B8, Border Dim rgba(30,41,59,0.2)
- **Effects & animation:** Deep void + dark matter surfaces, Bitcoin orange/gold gradients for CTAs, pill buttons with glowing shadows, glassmorphic BlurView nav, monospace data rows, gradient text balances + masked orange-gold, pulsing status indicators and vertical ledger timelines, ultra-thin borders, high-precision typography
- **Key design values:** --bg-void: #030304, --bg-surface: #0F1115, --fg: #FFFFFF, --fg-muted: #94A3B8, --border-dim: rgba(30,41,59,0.2), --accent-bitcoin: #F7931A, --accent-burnt: #EA580C, --accent-gold: #FFD600, --radius-card: 24px, --radius-pill: 999px, --blur-intensity: 20, --font-heading: Space Grotesk, --font-body: Inter, --font-mono: JetBrains Mono
- **Best suited for:** DeFi dashboards, wallets, NFT marketplaces, Web3 social, metaverse utilities, high-tech fintech brands
- **Avoid for:** Playful casual apps, low-tech brands, ultra-minimal editorial apps
- **Theme support:** Light ✗ Light · Dark ✓ Dark-only  ·  **Mobile:** ✓ Mobile-First  ·  **Conversion:** ✓ High
- **Accessibility:** ✓ WCAG AA with care  ·  **Performance:** ⚠ Moderate (gradients+blur)

## Recommended typography
- **Pairing:** Web3 Bitcoin DeFi (Space Grotesk + Inter + Mono) (Geometric Sans + Sans + Mono (Triple))
- **Heading typeface:** Space Grotesk
- **Body typeface:** Inter
- **Mood:** web3, bitcoin, defi, digital gold, fintech, crypto, trustless, luminescent, precision, dark

## Recommended color palette
- **Reference semantic palette:** NFT/Web3 Platform
- `Primary` #8B5CF6 / `On Primary` #FFFFFF / `Secondary` #A78BFA / `On Secondary` #0F172A / `Accent` #FBBF24 / `On Accent` #0F172A / `Background` #0F0F23 / `Foreground` #F8FAFC / `Card` #1E1D35 / `Card Foreground` #F8FAFC / `Muted` #27273B / `Muted Foreground` #94A3B8 / `Border` #4C1D95 / `Destructive` #EF4444 / `On Destructive` #FFFFFF / `Ring` #8B5CF6
- **Notes:** Purple tech + gold value
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Bitcoin DeFi (Mobile)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
