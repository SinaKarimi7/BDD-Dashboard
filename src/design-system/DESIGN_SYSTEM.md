# BDD Dashboard — Design System Specification
### Apple-Inspired Minimal Design Language

> **Version:** 1.0.0 &middot; **WCAG Target:** AA &middot; **Grid:** 8px &middot; **Attribute:** MINIMAL

---

## 1. Design Philosophy

The BDD Dashboard design system follows three principles drawn from Apple's design ethos:

1. **Deference** — The UI recedes so content takes center stage. No gratuitous chrome.
2. **Clarity** — Text is legible at every size. Icons are precise. Every element serves a purpose.
3. **Depth** — Subtle layering through shadow and translucency creates spatial hierarchy without noise.

---

## 2. Color Palette

### 2.1 Primary — Green

The primary color anchors the BDD identity: green represents passing tests, growth, and healthy specification.

| Token | Light | Dark | Contrast (on bg) | Usage |
|---|---|---|---|---|
| `primary` | `#16A34A` | `#22C55E` | 4.6:1 / 5.2:1 ✓ | Buttons, active nav, focus rings |
| `primary-hover` | `#15803D` | `#4ADE80` | 6.1:1 / 4.8:1 ✓ | Hover state |
| `primary-foreground` | `#FFFFFF` | `#030712` | — | Text on primary bg |
| `primary-muted` | `rgba(22,163,74,0.08)` | `rgba(34,197,94,0.1)` | — | Active nav bg, subtle highlights |

### 2.2 Neutral — Gray

| Token | Light | Dark | Usage |
|---|---|---|---|
| `background` | `#FFFFFF` | `#09090B` | Page background |
| `foreground` | `#030712` | `#F9FAFB` | Primary text |
| `card` | `#FFFFFF` | `#0F0F12` | Card surfaces |
| `muted` | `#F3F4F6` | `#1A1A1F` | Subtle backgrounds |
| `muted-foreground` | `#6B7280` | `#9CA3AF` | Secondary text, placeholders |
| `border` | `#E5E7EB` | `#1F1F24` | Dividers, card borders |
| `sidebar` | `#F9FAFB` | `#0C0C0F` | Sidebar background |

### 2.3 Semantic

| Token | Light | Dark | Usage |
|---|---|---|---|
| `destructive` | `#EF4444` | `#EF4444` | Delete actions, errors |
| `success` | `#22C55E` | `#4ADE80` | Pass states, confirmations |
| `warning` | `#F59E0B` | `#FBBF24` | Caution states |
| `info` | `#3B82F6` | `#60A5FA` | Informational, Gherkin tags |

### 2.4 Gherkin Syntax

| Token | Light | Dark | Usage |
|---|---|---|---|
| `gherkin-keyword` | `#16A34A` | `#4ADE80` | Given / When / Then / And / But |
| `gherkin-tag` | `#3B82F6` | `#60A5FA` | @tag annotations |
| `gherkin-comment` | `#9CA3AF` | `#6B7280` | # comment lines |

---

## 3. Typography Scale (9 levels)

**Font Stack:**
- Sans: `'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif`
- Mono: `'SF Mono', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace`

| Level | Size | Line Height | Letter Spacing | Weight | Usage |
|---|---|---|---|---|---|
| **Display** | 48px / 3rem | 1.08 | -0.025em | 700 | Landing hero |
| **H1** | 36px / 2.25rem | 1.11 | -0.025em | 700 | Page titles |
| **H2** | 30px / 1.875rem | 1.2 | -0.02em | 600 | Section headings |
| **H3** | 24px / 1.5rem | 1.25 | -0.015em | 600 | Card titles |
| **H4** | 20px / 1.25rem | 1.3 | -0.01em | 600 | Sub-sections |
| **Body** | 16px / 1rem | 1.5 | 0 | 400 | Default body text |
| **Body SM** | 14px / 0.875rem | 1.43 | 0 | 400 | Form fields, table cells |
| **Caption** | 12px / 0.75rem | 1.33 | 0.01em | 500 | Badges, meta, timestamps |
| **Overline** | 11px / 0.6875rem | 1.45 | 0.06em | 600 | Sidebar section labels (UPPERCASE) |

**Rendering:** Anti-aliased (`-webkit-font-smoothing: antialiased`)

---

## 4. Spacing System (8px Grid)

All spacing is based on a 4px sub-grid with 8px as the base unit.

| Token | Value | Figma Name | Usage |
|---|---|---|---|
| `space-0` | 0px | — | Reset |
| `space-0.5` | 2px | Hairline | Border offsets |
| `space-1` | 4px | Micro | Inline gaps, icon padding |
| `space-1.5` | 6px | — | Badge padding-y |
| `space-2` | 8px | Base | Button gap, tight padding |
| `space-2.5` | 10px | — | Input padding-y |
| `space-3` | 12px | — | Card internal gaps |
| `space-4` | 16px | Component | Component padding, stack gap |
| `space-5` | 20px | — | Card padding |
| `space-6` | 24px | Section | Section padding |
| `space-8` | 32px | Layout | Layout gaps between cards |
| `space-10` | 40px | — | Large section spacing |
| `space-12` | 48px | — | Page section dividers |
| `space-16` | 64px | Page | Page margins |
| `space-20` | 80px | — | Empty state padding |
| `space-24` | 96px | — | Hero spacing |

---

## 5. Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-none` | 0px | — |
| `radius-sm` | 6px | Badges, small chips |
| `radius-md` | 8px | Buttons, inputs, dropdown items |
| `radius-lg` | 12px | Cards, dropdowns, nav items |
| `radius-xl` | 16px | Modals, popovers |
| `radius-2xl` | 20px | Large hero cards |
| `radius-full` | 9999px | Avatars, pills, toggle tracks |

---

## 6. Elevation (Shadow)

| Level | Light | Usage |
|---|---|---|
| `xs` | `0 1px 2px rgba(0,0,0,0.03)` | Subtle lift (badges) |
| `sm` | `0 1px 3px rgba(0,0,0,0.06)` | Cards at rest |
| `md` | `0 4px 6px rgba(0,0,0,0.07)` | Cards on hover |
| `lg` | `0 10px 15px rgba(0,0,0,0.08)` | Dropdowns |
| `xl` | `0 20px 25px rgba(0,0,0,0.08)` | Modals |
| `2xl` | `0 25px 50px rgba(0,0,0,0.15)` | Full-screen overlays |
| `inner` | `inset 0 2px 4px rgba(0,0,0,0.04)` | Pressed states |

Dark mode shadows have 3-5× higher opacity to remain visible against dark surfaces.

---

## 7. Layout Patterns & Breakpoints

### 7.1 Breakpoints

| Name | Min Width | Layout Behavior |
|---|---|---|
| `sm` | 640px | Single column, mobile nav |
| `md` | 768px | Two-column possible |
| `lg` | 1024px | Sidebar visible, main content area |
| `xl` | 1280px | Wider content, larger cards |
| `2xl` | 1536px | Max-width container |

### 7.2 App Shell

```
┌──────────────────────────────────────────────┐
│ [Sidebar 280px]  │  [Main Content]           │
│                  │                            │
│  Logo / Title    │  ┌─ Mobile Topbar ──────┐ │
│  ─────────────   │  │ (< lg only)          │ │
│  Navigation      │  └─────────────────────┘ │
│  ─────────────   │                            │
│  Project Nav     │  ┌─ Page Content ──────┐  │
│  ─────────────   │  │ max-w: 1280px       │  │
│  Feature List    │  │ padding: 24-64px    │  │
│                  │  └─────────────────────┘  │
│  [Collapse ↔]    │                            │
└──────────────────────────────────────────────┘
```

- **< lg:** Sidebar is hidden (overlay on demand), mobile topbar appears
- **≥ lg:** Sidebar is persistent, collapsible to 64px icon-only mode
- **Content max-width:** 1280px with auto margins on `2xl+`
- **Page padding:** 24px (mobile) → 32px (md) → 64px (xl)

### 7.3 Grid Patterns

| Pattern | Columns | Gap | Usage |
|---|---|---|---|
| Dashboard cards | 1 → 2 → 3 | 24px | Project listing |
| Feature list | 1 | 8px | Vertical stack |
| Board view | Flexible columns | 16px | Kanban-style |
| Form layout | 1 (max-w-lg) | 16px | Settings, editors |
| Data table | Full width | 0 | Feature tables |

---

## 8. Animation Guidelines

### 8.1 Durations

| Name | Value | Usage |
|---|---|---|
| **Instant** | 50ms | Toggle, checkbox |
| **Fast** | 100ms | Hover color change, tooltip appear, dropdown exit |
| **Normal** | 200ms | Modal enter, dropdown enter, sidebar items |
| **Slow** | 300ms | Sidebar collapse/expand, page transitions |
| **Slower** | 500ms | Complex multi-element orchestrations |

### 8.2 Easing Curves

| Name | Curve | Usage |
|---|---|---|
| **Default** | `ease` | General transitions |
| **Out** | `ease-out` | Elements entering view |
| **In** | `ease-in` | Elements exiting view |
| **Apple** | `cubic-bezier(0.4, 0, 0.2, 1)` | Primary motion curve — fluid, natural |
| **Spring** | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Dropdown open, tooltip pop |

### 8.3 Motion Patterns

| Element | Enter | Exit | Easing |
|---|---|---|---|
| **Modal** | Fade + scale(0.95→1) + y(10→0) | Reverse | Apple, 200ms |
| **Dropdown** | Fade + y(-4→0) | Fade + y(0→-4) | Spring, 100ms |
| **Sidebar overlay** | Fade in | Fade out | Default, 300ms |
| **Sidebar collapse** | Width transition | Width transition | Apple, 300ms |
| **Tooltip** | Opacity 0→1 | Opacity 1→0 | Default, 200ms |
| **Toast** | Slide in from top | Fade out | Spring, 300ms |
| **Card hover** | Shadow sm→md, border subtle | Reverse | Apple, 200ms |
| **Button press** | Scale 0.98, shadow inner | Reverse | Fast, 100ms |

### 8.4 Reduced Motion

When `prefers-reduced-motion: reduce`, all durations collapse to `0ms`. Opacity transitions remain (they don't cause vestibular issues).

---

## 9. WCAG AA Requirements

### 9.1 Color Contrast

| Pair | Ratio | Requirement | Status |
|---|---|---|---|
| Foreground on Background | 17.4:1 | ≥ 4.5:1 (normal) | ✅ Pass |
| Primary on Background (light) | 4.6:1 | ≥ 4.5:1 (normal) | ✅ Pass |
| Primary on Background (dark) | 5.2:1 | ≥ 4.5:1 (normal) | ✅ Pass |
| Primary-foreground on Primary | 7.8:1 | ≥ 4.5:1 (normal) | ✅ Pass |
| Muted-foreground on Background | 5.6:1 | ≥ 4.5:1 (normal) | ✅ Pass |
| Destructive on Background | 4.6:1 | ≥ 3:1 (large/UI) | ✅ Pass |
| Border on Background | 1.7:1 | ≥ 3:1 (UI components) | ⚠️ Decorative only |

### 9.2 Focus Indicators

- **Ring:** 2px solid `ring` color with 2px offset
- **Visible on all interactive elements** — buttons, links, inputs, select, dropdown items
- **No outline removal** without replacement
- `focus-visible` only (not `focus`) to avoid mouse-click rings

### 9.3 Touch Targets

- Minimum interactive size: **44 × 44px** (WCAG 2.5.5)
- Icon-only buttons: 40px minimum with 44px touch area via padding
- Adjacent interactive elements: ≥ 8px gap

### 9.4 Text & Reading

- Minimum body text: 14px (form fields), 16px preferred
- Maximum content width: ~80 characters (prose)
- Line height ≥ 1.4 for body text
- Paragraph spacing ≥ 1.5× font size

### 9.5 Motion

- All animations respect `prefers-reduced-motion`
- No content changes that rely solely on animation
- Auto-playing content has pause controls

### 9.6 Semantic Structure

- Single `<main>` element per page
- Heading hierarchy: no skipped levels
- Landmarks: `<nav>`, `<aside>`, `<main>`
- ARIA labels on icon-only buttons
- Modal focus trapping with Escape to close
- Live regions for toast notifications

---

## 10. Component Specifications (30 Components)

### 10.1 Button

**Figma:** `Components / Button`

| Property | Spec |
|---|---|
| Height | Default: 40px · SM: 32px · LG: 48px |
| Padding | Default: 0 16px · SM: 0 12px · LG: 0 32px |
| Radius | `radius-md` (8px) · SM: `radius-sm` (6px) · LG: `radius-lg` (12px) |
| Font | Body SM (14px), weight 500 |
| Icon gap | 8px |
| Transition | Background 200ms apple, transform 100ms |

| Variant | Rest | Hover | Active | Focus | Disabled |
|---|---|---|---|---|---|
| **Default** | `primary` bg, white text | `primary-hover` bg | scale(0.98), inner shadow | 2px ring, 2px offset | 50% opacity, no pointer |
| **Destructive** | `destructive` bg, white text | `destructive-hover` bg | scale(0.98) | 2px ring (red) | 50% opacity |
| **Outline** | Transparent bg, border | `accent` bg | scale(0.98) | 2px ring | 50% opacity |
| **Secondary** | `secondary` bg | `secondary-hover` bg | scale(0.98) | 2px ring | 50% opacity |
| **Ghost** | Transparent | `accent` bg | scale(0.98) | 2px ring | 50% opacity |
| **Link** | Transparent, underline offset 4px | Underline visible | — | 2px ring | 50% opacity |
| **Icon** | 40×40 (default), 32×32 (sm) | `accent` bg | scale(0.95) | 2px ring | 50% opacity |

---

### 10.2 Input

**Figma:** `Components / Input`

| Property | Spec |
|---|---|
| Height | 40px |
| Padding | 0 12px |
| Radius | `radius-md` (8px) |
| Border | 1px `input` |
| Font | Body SM (14px) |
| Placeholder | `muted-foreground` |

| State | Spec |
|---|---|
| **Rest** | `input` border, `background` bg |
| **Hover** | Slight border darkening (gray-300 / dark equivalent) |
| **Focus** | 2px ring `ring`, 2px offset |
| **Error** | `destructive` border, ring on focus |
| **Disabled** | 50% opacity, `not-allowed` cursor |

Optional: `label` (Body SM, weight 500, 6px above), `error` (Caption, destructive, 6px below)

---

### 10.3 Textarea

**Figma:** `Components / Textarea`

Same as Input except:
- Min height: 80px
- `resize-y` enabled
- Vertical padding: 8px

---

### 10.4 Select

**Figma:** `Components / Select`

Same as Input plus:
- Chevron icon right-aligned (16px, muted-foreground)
- Native `<select>` for accessibility

---

### 10.5 SearchInput

**Figma:** `Components / SearchInput`

Same as Input plus:
- Search icon (16px) at left, 12px inset
- Clear button (X icon, 16px) at right when value present
- Input left padding: 36px
- Debounce: 300ms default

---

### 10.6 Card

**Figma:** `Components / Card`

| Property | Spec |
|---|---|
| Radius | `radius-lg` (12px) |
| Border | 1px `border` |
| Background | `card` |
| Shadow | `shadow-sm` |
| Padding | 20px (children via CardContent) |

| State | Spec |
|---|---|
| **Rest** | `shadow-sm`, `border` |
| **Hover** (if interactive) | `shadow-md`, border `primary` at 20% opacity |
| **Pressed** | `shadow-xs` |

Sub-components:
- **CardHeader:** padding 20px bottom 12px, flex column, gap 6px
- **CardTitle:** H3 style (18px semibold, tight leading)
- **CardDescription:** Body SM, `muted-foreground`
- **CardContent:** padding 20px top 0
- **CardFooter:** padding 20px top 0, flex row, center aligned

---

### 10.7 Badge

**Figma:** `Components / Badge`

| Property | Spec |
|---|---|
| Height | Auto (≈22px) |
| Padding | 2px 10px |
| Radius | `radius-full` (pill) |
| Font | Caption (12px), weight 500 |

| Variant | Spec |
|---|---|
| **Default** | `primary-muted` bg, `primary` text |
| **Outline** | Transparent bg, `border` border, `muted-foreground` text |
| **Custom color** | Color at 12% opacity bg, full color text, 25% border |

Optional remove button: 10×10, `hover:bg-black/10`

---

### 10.8 Modal

**Figma:** `Components / Modal`

| Property | Spec |
|---|---|
| Max width | SM: 448px · MD: 512px · LG: 672px |
| Radius | `radius-xl` (16px) |
| Padding | 24px |
| Shadow | `shadow-2xl` |
| Overlay | `overlay` color, `backdrop-blur-sm` (4px) |

| Animation | Spec |
|---|---|
| **Overlay in** | opacity 0→1, 200ms |
| **Panel in** | opacity 0→1, scale 0.95→1, y 10→0, 150ms |
| **Exit** | Reverse of enter |

Keyboard: Escape to close. Focus trap active. Body scroll locked.

---

### 10.9 DropdownMenu

**Figma:** `Components / DropdownMenu`

| Property | Spec |
|---|---|
| Min width | 180px |
| Radius | `radius-lg` (12px) |
| Padding | 4px |
| Border | 1px `border` |
| Shadow | `shadow-lg` |
| Background | `popover` |

| Animation | Spec |
|---|---|
| **In** | opacity 0→1, y -4→0, 100ms |
| **Out** | opacity 1→0, y 0→-4, 100ms |

---

### 10.10 DropdownItem

**Figma:** `Components / DropdownItem`

| Property | Spec |
|---|---|
| Height | 36px |
| Padding | 0 12px |
| Radius | `radius-md` (8px) |
| Font | Body SM (14px) |
| Icon gap | 8px |

| State | Spec |
|---|---|
| **Rest** | Transparent bg |
| **Hover** | `accent` bg |
| **Destructive** | `destructive` text, `destructive-muted` bg on hover |

---

### 10.11 DropdownSeparator

1px line, `border` color, 4px vertical margin.

---

### 10.12 Tooltip

**Figma:** `Components / Tooltip`

| Property | Spec |
|---|---|
| Padding | 6px 12px |
| Radius | `radius-md` (8px) |
| Background | `foreground` (inverted) |
| Text | Caption (12px), `background` color |
| Shadow | `shadow-lg` |
| Position | Centered above trigger, 40px offset |

| Animation | Spec |
|---|---|
| **In** | opacity 0→1, 200ms, triggered by hover |
| **Out** | opacity 1→0, instant on mouse leave |

---

### 10.13 EmptyState

**Figma:** `Components / EmptyState`

| Property | Spec |
|---|---|
| Padding | 64px vertical, 16px horizontal |
| Icon | 48px, `muted-foreground`, 16px below |
| Title | H3 (18px semibold), 4px below |
| Description | Body SM, `muted-foreground`, max-w 448px, 24px below |
| Action | Button (any variant), below description |

---

### 10.14 Breadcrumbs

**Figma:** `Components / Breadcrumbs`

| Property | Spec |
|---|---|
| Font | Body SM (14px), `muted-foreground` |
| Separator | ChevronRight icon, 14px, 4px gap |
| Current item | `foreground`, weight 500 |
| Link hover | `foreground` color transition |

---

### 10.15 Sidebar

**Figma:** `Layout / Sidebar`

| Property | Spec |
|---|---|
| Width | Expanded: 280px · Collapsed: 64px |
| Background | `sidebar` |
| Border | Right 1px `sidebar-border` |
| Transition | Width 300ms apple |

| Element | Spec |
|---|---|
| **Logo area** | 64px height, 16px padding, border-bottom |
| **Nav item** | 40px height, 12px padding, `radius-md`, 4px gap |
| **Active nav** | `primary-muted` bg, `primary` text |
| **Section label** | Overline style (11px uppercase, 0.06em tracking) |
| **Feature item** | 36px height, smaller text (14px), truncated |
| **Collapse button** | Bottom, centered, 32px, icon rotates 180° |

Mobile: Full overlay with `overlay` backdrop, slide in from left.

---

### 10.16 AppShell

**Figma:** `Layout / AppShell`

Flex row, full viewport height. Sidebar + main content area.
Mobile topbar: 56px height, border-bottom, logo + hamburger.

---

### 10.17 Tabs

**Figma:** `Components / Tabs`

| Property | Spec |
|---|---|
| Height | 40px |
| Font | Body SM (14px), weight 500 |
| Border | Bottom 2px on active tab (`primary`) |
| Gap | 0 (items touch, separated by borders) |
| Padding | 0 16px per tab |

| State | Spec |
|---|---|
| **Rest** | `muted-foreground` text, no border |
| **Hover** | `foreground` text |
| **Active** | `foreground` text, 2px `primary` bottom border |

---

### 10.18 Toggle / Switch

**Figma:** `Components / Toggle`

| Property | Spec |
|---|---|
| Track | 44×24px, `radius-full` |
| Thumb | 20×20px circle, white, `shadow-sm` |
| Off | `gray-200` track (light), `gray-700` (dark) |
| On | `primary` track |
| Transition | 200ms apple |
| Focus | 2px ring on track |

---

### 10.19 Checkbox

**Figma:** `Components / Checkbox`

| Property | Spec |
|---|---|
| Size | 18×18px |
| Radius | `radius-sm` (4px) |
| Border | 2px `input` (unchecked) |
| Checked | `primary` bg, white checkmark |
| Focus | 2px ring |
| Transition | 50ms (instant) |

---

### 10.20 Radio

**Figma:** `Components / Radio`

Same as Checkbox but `radius-full` and inner dot (10px) instead of checkmark.

---

### 10.21 Avatar

**Figma:** `Components / Avatar`

| Size | Dimension | Font |
|---|---|---|
| SM | 32×32px | Caption (12px) |
| MD | 40×40px | Body SM (14px) |
| LG | 56×56px | Body (16px) |

`radius-full`, `secondary` bg with initials in `secondary-foreground`, image covers.

---

### 10.22 Toast / Notification

**Figma:** `Components / Toast`

| Property | Spec |
|---|---|
| Min width | 320px |
| Max width | 420px |
| Padding | 16px |
| Radius | `radius-lg` (12px) |
| Shadow | `shadow-lg` |
| Position | Top-center, 16px from top |

| Variant | Left accent |
|---|---|
| **Success** | 3px left border `success` |
| **Error** | 3px left border `destructive` |
| **Info** | 3px left border `info` |
| **Warning** | 3px left border `warning` |

Animation: Slide in from top (y: -20→0), spring easing, 300ms.

---

### 10.23 Progress Bar

**Figma:** `Components / ProgressBar`

| Property | Spec |
|---|---|
| Height | 6px |
| Radius | `radius-full` |
| Track | `muted` bg |
| Fill | `primary` bg |
| Transition | Width 500ms apple |

---

### 10.24 Skeleton / Loading

**Figma:** `Components / Skeleton`

| Property | Spec |
|---|---|
| Background | `muted` |
| Radius | Matches target element |
| Animation | Pulse (opacity 1→0.5→1), 2s infinite, ease-in-out |

---

### 10.25 Divider

**Figma:** `Components / Divider`

| Property | Spec |
|---|---|
| Height | 1px |
| Color | `border` |
| Margin | 16px vertical (default) |

---

### 10.26 Tag (Gherkin)

**Figma:** `Components / Tag`

| Property | Spec |
|---|---|
| Padding | 2px 8px |
| Radius | `radius-sm` (6px) |
| Font | Caption (12px), weight 500 |
| Colors | Dynamic per-tag color (same as Badge custom color) |
| Remove | X button (10px), visible on hover |

---

### 10.27 DataTable

**Figma:** `Components / DataTable`

| Property | Spec |
|---|---|
| Header | Body SM (14px), weight 600, `muted-foreground`, uppercase |
| Row height | 48px |
| Cell padding | 12px 16px |
| Border | Bottom 1px `border` |
| Hover | `accent` bg |
| Stripe (optional) | Even rows at `muted` bg |

---

### 10.28 FileDropZone

**Figma:** `Components / FileDropZone`

| Property | Spec |
|---|---|
| Border | 2px dashed `border` |
| Radius | `radius-lg` (12px) |
| Padding | 48px |
| Icon | 48px, `muted-foreground` |
| Text | Body SM, `muted-foreground` |

| State | Spec |
|---|---|
| **Rest** | Dashed border, `muted` bg |
| **Drag over** | `primary` dashed border, `primary-muted` bg |
| **Error** | `destructive` dashed border |

---

### 10.29 StepRow (Gherkin Step Editor)

**Figma:** `Components / StepRow`

| Property | Spec |
|---|---|
| Height | 44px |
| Layout | [Keyword Select 100px] [Step Text Input flex-1] [Actions 32px] |
| Gap | 8px |
| Keyword | Font weight 700, `primary` color |
| Drag handle | 20px grip icon, `muted-foreground`, cursor grab |

---

### 10.30 Stat Card (Dashboard)

**Figma:** `Components / StatCard`

| Property | Spec |
|---|---|
| Layout | Icon (40px circle, `primary-muted` bg) · Value (H2 30px) · Label (Caption, muted) |
| Padding | 24px |
| Base | Card component |
| Hover | Lift to `shadow-md` |

---

## 11. Icon System

- **Library:** Lucide React
- **Sizes:** 16px (sm), 20px (md), 24px (lg)
- **Stroke width:** 2px (default), 1.5px for larger sizes
- **Color:** Inherits `currentColor`
- **Touch area:** Always wrapped in ≥44px button when interactive

---

## 12. Figma Implementation Notes

### Layer Naming
- Use `/` separators: `Components / Button / Primary / Default`
- States as variants: `State = Rest | Hover | Active | Focus | Disabled`
- Sizes as variants: `Size = SM | Default | LG`

### Auto Layout
- All components use auto layout
- Spacing matches `space-*` tokens exactly
- Padding uses individual values, not shorthand

### Color Styles
- Named as `Semantic / Primary`, `Semantic / Background`, etc.
- Primitives stored but not applied directly
- Dark mode as a separate style set with matching names

### Text Styles
- 9 styles matching the typography scale
- Named: `Display`, `Heading 1-4`, `Body`, `Body Small`, `Caption`, `Overline`

### Effect Styles
- 7 shadow levels: `Elevation / XS` through `Elevation / 2XL` + `Inner`
- Dark mode variants as separate set

### Component Properties
- Boolean: `showIcon`, `showLabel`, `showRemove`, `interactive`
- Instance swap: `icon` (for icon slots)
- Text: `label`, `placeholder`, `value`
- Variant: `variant`, `size`, `state`

---

## 13. File Map

| File | Purpose |
|---|---|
| `src/design-system/tokens.json` | Design tokens (W3C DTCG format) |
| `src/design-system/variables.css` | CSS custom properties (light + dark) |
| `src/design-system/DESIGN_SYSTEM.md` | This specification document |
| `src/design-system/components.md` | Detailed component specs (this section) |
