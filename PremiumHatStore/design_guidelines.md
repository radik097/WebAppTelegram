# Telegram Gaming Web App Design Guidelines

## Design Approach
**Reference-Based Gaming Platform** drawing inspiration from Telegram's native UI patterns, modern gaming apps (Duolingo, mobile casino games), and crypto/NFT trading platforms. Focus on instant gratification, clear visual hierarchy, and engaging micro-interactions.

## Core Design Principles
1. **Telegram-Native Feel**: Seamless integration with Telegram's design language
2. **Gaming Excitement**: Visual feedback for wins, losses, and actions
3. **Clear Information Hierarchy**: Balance excitement with usability
4. **Touch-Optimized**: Large tap targets, mobile-first interactions

## Typography System
**Font Family**: System fonts (SF Pro for iOS, Roboto for Android) via Telegram's defaults

**Hierarchy**:
- Page Titles: 24px, Bold (700)
- Section Headers: 18px, Semibold (600)
- Card Titles/Primary Text: 16px, Medium (500)
- Body/Secondary Text: 14px, Regular (400)
- Captions/Metadata: 12px, Regular (400)
- Balance/Currency: 20px, Bold (700) - tabular numbers

## Layout System
**Spacing Units**: Tailwind spacing - use 2, 3, 4, 6, 8, 12, 16 units consistently
- Consistent padding: p-4 for cards, p-6 for sections
- Vertical rhythm: space-y-4 for lists, space-y-6 for major sections
- Screen padding: px-4 on mobile

**Container Strategy**:
- Full-width app (no max-width constraints)
- Safe area padding for notches/nav bars
- Bottom navigation takes 64px height (h-16)

## Component Library

### Navigation
**Bottom Tab Bar** (Fixed, always visible):
- 5 tabs with icons + labels
- Active state: accent color, inactive: muted
- Icons: 24px, labels: 10px
- Subtle haptic feedback on tap

### Cards & Containers
**Gift/Battle Cards**:
- Rounded corners: rounded-xl (12px)
- Subtle elevation without shadows (use subtle border)
- Padding: p-4
- Clickable cards: scale-95 on press

**Stats Cards**:
- Compact info displays
- Icon + value + label structure
- Grid layout: 2-3 columns

### Interactive Elements
**Primary Actions** (Create Battle, Spin, Send):
- Full-width or prominent placement
- Height: h-12 minimum
- Rounded: rounded-lg

**Secondary Actions**:
- Outlined style or ghost buttons
- Height: h-10

**Currency Display**:
- Always visible in header
- Icon + formatted number
- Tap to show details

### Game-Specific Components

**Slot Machine Interface**:
- Central spinning reels area (3-4 reels)
- Large spin button below
- Win amount display above reels
- Recent wins ticker below

**Battle Card**:
- Opponent info (avatar, name, stake)
- Battle status badge
- Join/View button
- Compact vertical layout

**Gift Display**:
- Grid: 3 columns on mobile
- Square aspect ratio cards
- Gift image, name, rarity indicator
- Quantity badge if applicable

**Activity Feed**:
- Avatar + action description + timestamp
- Condensed list format (space-y-2)
- Infinite scroll

### Profile Components
**User Header**:
- Large avatar (80px)
- Username, stats row (battles, wins, gifts)
- Balance display
- Action buttons (settings, share)

**Inventory Grid**:
- 3-column grid
- Filter tabs above
- Empty state with CTA

## Images

**Gift Assets**: Use placeholder gift images (200x200px) - emoji-style icons, 3D rendered objects, or illustrated items with transparent backgrounds. Display in grids and cards.

**Avatar Placeholders**: Telegram user avatars loaded from API. Use circular crops (40px default, 80px for profiles).

**Battle Thumbnails**: Small preview images for battle types/categories (if applicable).

**No Large Hero Images**: This is an app, not a landing page. Focus on functional UI and game elements.

## Animations & Interactions
**Micro-interactions** (Use sparingly but effectively):
- Slot spin: CSS animation with easing
- Win celebration: Scale pulse + confetti (canvas-confetti library)
- Card flip for gift reveals
- Number count-up for balance changes
- Pull-to-refresh on lists

**Transitions**:
- Page transitions: Slide left/right (100ms)
- Modal: Fade in backdrop + slide up content (150ms)
- Avoid animations exceeding 200ms

## Layout Patterns

**Home/Battles View**:
- Header: Balance + notifications
- Active battles list (space-y-3)
- Create battle CTA (sticky or prominent)
- Activity feed below

**Slot/Game View**:
- Full-screen game interface
- Minimal chrome
- Balance at top
- Game UI centered
- Action button at bottom

**Inventory View**:
- Filter tabs (All, Rare, Recent)
- 3-column grid
- Pull to refresh
- Empty state when no items

**Profile View**:
- User header section
- Stats cards grid (2x2)
- Referral section
- Settings list

## Accessibility
- Minimum touch target: 44x44px
- Sufficient contrast ratios (already ensured by Telegram theme)
- Clear focus states for keyboard navigation
- Loading states for all async actions
- Error states with retry options

## Platform Integration
- Use Telegram's haptic feedback API
- Respect system font size preferences
- Handle safe area insets
- Support Telegram theme variables
- Close button behavior matching Telegram patterns

This gaming app balances excitement with clarity, using Telegram's proven patterns while adding engaging game mechanics and visual feedback.