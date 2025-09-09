# Premium Ecommerce Design System

## Brand Personality
Elegant, premium, modern, approachable — combining Airbnb's clean aesthetics with high-fashion retail sophistication.

## Color Palette

### Primary Colors
- **Primary**: `#0A6CFF` - Main brand color for CTAs and key actions
- **Primary Dark**: `#0856CC` - Hover states and emphasis
- **Primary Light**: `#E6F2FF` - Subtle backgrounds and highlights

### Neutrals
- **Ink**: `#0D2431` - Primary text and headings
- **Slate**: `#475569` - Secondary text
- **Muted**: `#7C8792` - Tertiary text and placeholders
- **Border**: `#E2E8F0` - Subtle borders and dividers
- **Surface**: `#F8FAFC` - Card backgrounds and sections
- **Background**: `#FFFFFF` - Main background

### Accent Colors
- **Success**: `#10B981` - Success states and confirmations
- **Warning**: `#F59E0B` - Warnings and low stock
- **Danger**: `#EF4444` - Errors and destructive actions
- **Accent**: `#8B5CF6` - Special highlights and badges

## Typography

### Font Families
```css
--font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-display: "Playfair Display", Georgia, "Times New Roman", serif;
--font-mono: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
```

### Type Scale
- **Display Large**: 64px / 1.1 / 700 (Hero headlines)
- **Display Medium**: 48px / 1.2 / 700 (Section headlines)
- **Display Small**: 36px / 1.3 / 600 (Card titles)
- **Heading 1**: 32px / 1.3 / 600
- **Heading 2**: 24px / 1.4 / 600
- **Heading 3**: 20px / 1.4 / 600
- **Body Large**: 18px / 1.6 / 400
- **Body**: 16px / 1.6 / 400
- **Body Small**: 14px / 1.5 / 400
- **Caption**: 12px / 1.4 / 500

## Spacing Scale
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
--space-32: 128px;
```

## Border Radius
```css
--radius-xs: 4px;
--radius-sm: 6px;
--radius-base: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
--radius-full: 9999px;
```

## Shadows & Elevation
```css
--shadow-xs: 0 1px 2px rgba(13, 36, 49, 0.05);
--shadow-sm: 0 2px 4px rgba(13, 36, 49, 0.06);
--shadow-base: 0 4px 8px rgba(13, 36, 49, 0.08);
--shadow-md: 0 8px 16px rgba(13, 36, 49, 0.1);
--shadow-lg: 0 16px 32px rgba(13, 36, 49, 0.12);
--shadow-xl: 0 24px 48px rgba(13, 36, 49, 0.15);
--shadow-soft: 0 10px 30px rgba(12, 18, 30, 0.06);
```

## Z-Index Scale
```css
--z-dropdown: 1000;
--z-sticky: 1020;
--z-fixed: 1030;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-popover: 1060;
--z-tooltip: 1070;
--z-toast: 1080;
```

## Animation & Motion
```css
--duration-fast: 150ms;
--duration-base: 200ms;
--duration-slow: 300ms;
--duration-slower: 500ms;

--easing-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--easing-ease-in: cubic-bezier(0.4, 0, 1, 1);
--easing-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--easing-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

## Component Tokens

### Buttons
- **Primary**: Background gradient, white text, soft shadow
- **Secondary**: Transparent background, primary border, primary text
- **Ghost**: Transparent background, muted text
- **Danger**: Red background, white text

### Cards
- **Background**: White with subtle shadow
- **Border**: 1px solid border color
- **Hover**: Elevated shadow and slight transform

### Inputs
- **Border**: 1px solid border color
- **Focus**: Primary color border with soft glow
- **Error**: Danger color border

### Badges
- **Default**: Muted background, dark text
- **Primary**: Primary background, white text
- **Success**: Success background, white text

## Accessibility Requirements

### Contrast Ratios
- **Normal text**: Minimum 4.5:1
- **Large text**: Minimum 3:1
- **UI components**: Minimum 3:1

### Focus States
- **Outline**: 2px solid primary color with 2px offset
- **Ring**: 0 0 0 3px primary color with 20% opacity

### Motion
- Respect `prefers-reduced-motion: reduce`
- Provide alternative static states

## Config.js CSS Variable Mapping

| Config Key | CSS Variable | Fallback |
|------------|--------------|----------|
| `styles.PRIMARY_COLOR` | `--brand-primary` | `#0A6CFF` |
| `styles.SECONDARY_COLOR` | `--brand-secondary` | `#475569` |
| `styles.ACCENT_COLOR` | `--brand-accent` | `#8B5CF6` |
| `styles.BACKGROUND_COLOR` | `--bg-primary` | `#FFFFFF` |
| `styles.TEXT_COLOR` | `--text-primary` | `#0D2431` |
| `styles.FONT_FAMILY` | `--font-primary` | `Inter, system-ui` |

## Component Specifications

### Header
- Sticky positioning with backdrop blur
- Logo area preserves `.logo` selector
- Mobile drawer animation: slide-in from right
- Cart icon with animated badge

### Hero Section
- Large typography with display font
- Gradient background with subtle texture
- Two-CTA layout (primary + secondary)
- Responsive image treatment

### Product Cards
- 4:5 aspect ratio images
- Two-line title clamp
- Color swatches for multi-color products
- Hover animations with elevation

### Product Details
- Sticky gallery on desktop
- Vertical thumbnails
- Live price updates
- Variation modal with proper ARIA

### Modals
- Center positioning with backdrop
- Keyboard navigation support
- Focus trapping
- Smooth animations

### Cart Drawer
- Slide-in from right
- Line item management
- Animated add-to-cart feedback
- Clear checkout flow

## Microinteractions

### Add to Cart
1. Product image flies to cart icon
2. Cart badge animates with bounce
3. Toast notification appears
4. Cart drawer can be opened

### Product Hover
1. Image scales slightly (1.05x)
2. Shadow increases
3. Add to cart button reveals

### Modal Open/Close
1. Backdrop fades in
2. Modal slides up with bounce
3. Focus moves to first interactive element

### Form Interactions
1. Input focus with soft glow
2. Validation states with color changes
3. Success animations for completed actions