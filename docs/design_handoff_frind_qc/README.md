# Handoff: Frind Wine Quality Control — Kanban Board

## Overview

A quality control tracking dashboard for Frind Estate Winery's bottling runs. Staff use this tool to track each bottling run through five stages of the QC process, log lab checks and bottling session data, and manage winemaker/lab/warehouse approvals before a run proceeds to production and completion.

## About the Design Files

The files in this bundle are **high-fidelity design prototypes built in HTML/React**. They are not production code to be copied directly. The task for implementation is to **recreate these designs in your target codebase** (React, Next.js, Vue, etc.) using your established component library, routing, and data layer patterns.

The prototype uses browser `localStorage` for persistence — in production this should be replaced with a real backend API.

## Fidelity

**High-fidelity.** Colors, typography, spacing, interactions, and copy are all final. Implement pixel-accurately using your codebase's existing component libraries where possible, applying exact token values listed below.

---

## Screens / Views

### 1. Dashboard — Kanban Board

The main view. Shows all bottling runs distributed across 5 columns.

**Layout:**
- Full-viewport height, flex column: `Header (56–64px) → Dashboard Header (~80px) → Kanban area (flex: 1)`
- Kanban area: CSS Grid, `repeat(5, minmax(0, 1fr))`, gap `16px`, padding `24px 32px 28px`
- Each column: flex column, gap `8px`, full height

**Responsive behaviour:**
- **Desktop (> 1024px):** 5-column grid fills full width
- **Tablet (640–1024px):** Columns have `minmax(220px, 1fr)`, horizontal scroll with `scroll-snap-type: x mandatory`, each column `scroll-snap-align: start`, padding `20px`
- **Mobile (< 640px):** Single-column view. A horizontal scrollable tab bar sits above the kanban area. Tapping a tab shows only that column. Tabs show column label, colored dot, and card count.

**Column definitions (in order):**

| ID | Label | Dot color |
|---|---|---|
| `active` | Active | `oklch(58% 0.14 145)` — green |
| `pending` | Pending Approval | `oklch(65% 0.12 60)` — amber |
| `approved` | Approved | `oklch(50% 0.12 250)` — blue |
| `production` | In Production | `oklch(55% 0.11 10)` — wine red |
| `completed` | Completed | `oklch(48% 0.06 200)` — slate |

**Column header:** Pill-shaped badge with colored dot + label + count badge. Background is the dot color at ~50% opacity; border is dot color at 30% opacity.

**Empty column state:** Centered `◇` glyph + "No runs here yet" in muted color.

---

### 2. Run Card

Clickable card inside a kanban column. Opens the Run Detail modal on click.

**Layout:** `background: white`, `border-radius: 8px`, `border: 1px solid #e8e0d4`, `padding: 14px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.06)`

**Hover:** `border-color: gold`, `box-shadow: 0 4px 12px rgba(0,0,0,0.08)`, `transform: translateY(-1px)`

**Contents (top to bottom):**
1. **Run ID** — `10px`, `600` weight, `0.08em` letter-spacing, uppercase, muted color, `margin-bottom: 6px`
2. **Wine name** — Cormorant Garamond serif, `17px`, `500` weight, `line-height: 1.2`, `margin-bottom: 4px`
3. **Vintage** — `12px`, muted color
4. **Divider** — `1px solid #e8e0d4`, `margin: 10px 0`
5. **Meta row** — flex column, gap `4px`. Each row: `12px`, muted color. Shows: volume, bottling date, winemaker, Vintrace ID
6. **Status badge** (bottom right) — colored pill with dot + status label in that column's color

---

### 3. Run Detail Modal

Full-screen overlay modal opened by clicking a run card.

**Overlay:** `rgba(0,0,0,0.45)` backdrop, click-outside to close

**Modal panel:** `max-width: 640px`, centered, `border-radius: 14px`, `background: white`, `max-height: 88vh`, `overflow-y: auto`

**Sections (top to bottom):**

**Header:**
- Wine name in Cormorant Garamond serif `28px italic`
- Run ID + vintage in muted `13px`
- Status badge (pill, same style as card)
- Close `×` button top-right

**Run Info grid** — 2-col grid of label/value pairs:
- Fields: Vintrace ID, Tank(s), Volume, Bottling Date, Days, Winemaker, Created Date, Sessions Completed

**Approval Status section:**
- Title "Approval Status"
- 3 approval rows: Winemaker, Lab, Warehouse — each shows Yes/No toggle buttons
- Inline logic: if `winemakerApproved === 'yes'` AND `labApproved === 'yes'` AND status is `pending`, auto-promote to `approved`

**Checks & Sessions section:**
- Title "Checks & Sessions"
- Button grid for 5 action types (see Forms section below)
- Each button opens its respective form modal

**Status Actions section:**
- Move run to next status via dropdown or action buttons
- Statuses: `active → pending → approved → production → completed`

**Links section:**
- Report URL and Drive Folder URL — editable inline, show "Open →" when set

---

### 4. New Run Form

Full-page form (replaces dashboard, not a modal) for creating a new bottling run.

**Layout:** Scrollable page, centered card `max-width: 720px`, `padding: 40px 32px`

**Card header:** "New Bottling *Run*" in Cormorant Garamond, subtitle in muted sans

**Form sections** (each with uppercase section title + 2-col grid):

**Wine Information:**
- Wine Name (required)
- Vintage (required, 4-digit year)
- Vintrace ID (required)
- Winemaker (required)

**Bottling Details:**
- Tank Numbers (required)
- Volume in litres (required)
- Bottling Date (required, format DD-MM-YYYY)
- Number of Days (required)

**Validation:** All fields required. Bottling date regex: `/^\d{2}-\d{2}-\d{4}$/`. Errors shown inline below each field in wine red.

**Actions:** Cancel (ghost) + Create Run (gold) buttons, right-aligned

---

### 5. Check / Session Form Modals

Modal forms overlaid on the run detail. Five form types:

| Form name | Purpose |
|---|---|
| Lab Pre-Bottling Check | Lab parameters before bottling begins |
| Bottling Session | Log a bottling session with machine/line data |
| Lab Post-Bottling Check | Lab parameters after bottling |
| Lab Sensory Check | Sensory/tasting evaluation |
| Warehouse Check | Warehouse receipt and inspection |

Each form: scrollable modal, `max-height: 62vh` body, 2-col grid of fields, Save / Cancel actions.

Form fields include: dates (auto-populate today), staff dropdowns, numeric inputs (FSO₂, TSO₂, ALC%, pH, TA, VA, RS, etc.), text inputs, textareas for comments.

Staff list: `['Jane Smith', 'Marcus Lund', 'Sofia Reyes', 'Tom Baker', 'Lisa Chen', 'David Park']`
Lab staff: `['Jane Smith', 'Sofia Reyes', 'Lisa Chen']`

**Submitting a form** increments `sessionsCompleted` on the run and shows a toast notification.

---

## Interactions & Behavior

- **Click run card** → open Run Detail modal
- **Click backdrop / × button** → close modal
- **Approval toggles** → update `winemakerApproved` / `labApproved` / `warehouseApproved` fields; auto-promote `pending → approved` when winemaker + lab both approved
- **Status change** → dropdown in run detail updates `run.status`; card moves to correct column on next render
- **New Run button** → navigate to New Run Form view
- **Create Run** → validates, generates next run ID (e.g. `BR-042`), adds to runs list, navigates back to dashboard, shows toast
- **Toast** → slides up from bottom-center, auto-dismisses after 3 seconds, wine-colored bg + gold icon
- **Persistence** → all runs saved to `localStorage` key `frind_runs` on every change

---

## State Management

```
runs: Run[]           // array of all bottling runs
view: 'dashboard' | 'newrun'
openRun: Run | null   // currently open in detail modal
toast: string | null  // current toast message
tweaksOpen: boolean   // design tweaks panel
```

**Run object shape:**
```typescript
{
  id: string               // e.g. "BR-041"
  wine: string             // e.g. "Big White"
  vintage: string          // e.g. "2024"
  vintraceId: string       // e.g. "VT-1234"
  tanks: string            // e.g. "T1, T2"
  volume: string           // e.g. "10000 L"
  bottlingDate: string     // e.g. "14-04-2025"
  days: string             // e.g. "2"
  winemaker: string        // e.g. "Jane Smith"
  status: 'active' | 'pending' | 'approved' | 'production' | 'completed'
  createdDate: string      // DD-MM-YYYY
  winemakerApproved: 'yes' | 'no'
  labApproved: 'yes' | 'no'
  warehouseApproved: 'yes' | 'no'
  sessionsCompleted: number
  reportUrl: string        // optional
  driveFolderUrl: string   // optional
}
```

---

## Design Tokens

### Colors
```css
--cream:       oklch(97% 0.012 70)    /* page background */
--cream-mid:   oklch(93% 0.015 70)    /* column card background */
--cream-dark:  oklch(88% 0.018 65)    /* count badge bg */
--wine:        oklch(32% 0.11 10)     /* header bg, primary brand */
--wine-mid:    oklch(42% 0.11 10)
--wine-light:  oklch(55% 0.10 10)
--gold:        oklch(68% 0.08 75)     /* primary CTA */
--gold-light:  oklch(82% 0.06 80)
--ink:         oklch(22% 0.03 50)     /* primary text */
--muted:       oklch(55% 0.02 60)     /* secondary text */
--border:      oklch(86% 0.015 65)    /* card/input borders */
--white:       oklch(99% 0.005 70)    /* card backgrounds */

/* Status colors */
--status-active:     oklch(58% 0.14 145)   /* green */
--status-pending:    oklch(65% 0.12 60)    /* amber */
--status-approved:   oklch(50% 0.12 250)   /* blue */
--status-production: oklch(55% 0.11 10)    /* wine red */
--status-completed:  oklch(48% 0.06 200)   /* slate */
```

### Typography
```
Primary font:  'DM Sans', sans-serif — UI, labels, body
Display font:  'Cormorant Garamond', serif — headings, wine names, brand title
```

| Role | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Page heading | Cormorant Garamond | 30px | 500 | `em` in italic wine-light |
| Wine name (modal) | Cormorant Garamond | 28px | 400 italic | |
| Wine name (card) | Cormorant Garamond | 17px | 500 | |
| Nav brand title | Cormorant Garamond | 20px | 500 | |
| Body | DM Sans | 14px | 400 | |
| Label/meta | DM Sans | 12px | 400 | muted color |
| Tag/badge | DM Sans | 11px | 600 | uppercase, 0.08em spacing |
| Form label | DM Sans | 11px | 600 | uppercase, 0.06em spacing |
| Nav button | DM Sans | 13px | 500 | uppercase, 0.04em spacing |

### Spacing
- Header height: `64px` (mobile: `56px`)
- Page padding: `32px` (mobile: `16px`)
- Card padding: `14px`
- Column gap: `16px`
- Card gap (within column): `10px`

### Shadows
```css
--shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
--shadow-md: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)
--shadow-lg: 0 16px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)
```

### Border Radius
- Cards: `8px`
- Column containers: `10px`
- Modal: `14px`
- Buttons: `6px`
- Pill badges: `20px`
- Inputs: `6px`

---

## Assets

| Asset | File | Usage |
|---|---|---|
| Frind Estate logo | `uploads/logo.png` | Header, `height: 40px` |

Google Fonts CDN links (load both):
- `Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400`
- `DM+Sans:wght@300;400;500;600`

---

## Files

| File | Description |
|---|---|
| `index.html` | Full prototype source — HTML + inline React/JSX + CSS |
| `uploads/logo.png` | Frind Estate Winery logo asset |

The prototype is self-contained in `index.html`. All components, styles, seed data, and logic are inline. Reference it as a single source of truth for behavior and visual details.
