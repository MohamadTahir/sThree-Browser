---
name: sThree Browser
description: A safe, local S3 browser; the public portal's glossy calm, carried into a quiet console.
colors:
  accent: "hsl(221 83% 53%)"
  accent-fg: "hsl(0 0% 100%)"
  accent-subtle: "hsl(221 92% 94.5%)"
  accent-text: "hsl(224 76% 46%)"
  ring: "hsl(221 83% 53%)"
  cta: "hsl(221 83% 53%)"
  cta-hover: "hsl(221 83% 48%)"
  cta-fg: "hsl(0 0% 100%)"
  success: "hsl(142 72% 29%)"
  warning: "hsl(30 92% 36%)"
  danger: "hsl(0 72% 42%)"
  danger-solid: "hsl(0 72% 45%)"
  danger-subtle: "hsl(0 86% 97%)"
  bg: "hsl(0 0% 100%)"
  raised: "hsl(0 0% 100%)"
  sidebar: "hsl(220 20% 97.5%)"
  subtle: "hsl(220 20% 98.5%)"
  muted: "hsl(220 16% 95%)"
  fg: "hsl(222 16% 12%)"
  fg-muted: "hsl(220 8% 42%)"
  border: "hsl(220 14% 92%)"
  border-strong: "hsl(220 12% 85%)"
typography:
  display:
    fontFamily: "Mona Sans, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "-0.018em"
    fontFeature: "\"ss01\""
    fontVariation: "\"wdth\" 108"
  headline:
    fontFamily: "Mona Sans, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 680
    lineHeight: "32px"
    letterSpacing: "-0.025em"
    fontFeature: "\"ss01\""
    fontVariation: "\"wdth\" 112"
  title:
    fontFamily: "Mona Sans, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "26px"
    letterSpacing: "-0.018em"
    fontFeature: "\"ss01\""
    fontVariation: "\"wdth\" 108"
  body-lg:
    fontFamily: "Mona Sans, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "22px"
    fontFeature: "\"ss01\""
  body:
    fontFamily: "Mona Sans, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "21px"
    fontFeature: "\"ss01\""
  compact:
    fontFamily: "Mona Sans, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "20px"
    fontFeature: "\"ss01\""
  label:
    fontFamily: "Mona Sans, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: "18px"
    fontFeature: "\"ss01\", \"tnum\""
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: "20px"
rounded:
  sm: "5px"
  md: "8px"
  lg: "10px"
  nav: "11px"
  row: "12px"
  xl: "18px"
  2xl: "24px"
  full: "9999px"
spacing:
  unit: "4px"
  gutter-sm: "16px"
  gutter-lg: "28px"
  table-gutter-sm: "8px"
  table-gutter-lg: "14px"
  cell: "14px"
  control-sm: "32px"
  control: "36px"
  control-lg: "44px"
  pill-field: "34px"
  crumb: "30px"
  chip: "24px"
  row: "44px"
  row-gap: "2px"
  table-head: "36px"
  nav-row: "34px"
  bar: "64px"
  footer: "48px"
  sidebar: "272px"
  sidebar-min: "220px"
  sidebar-max: "420px"
  drawer: "280px"
  panel: "360px"
components:
  button-primary:
    backgroundColor: "{colors.cta}"
    textColor: "{colors.cta-fg}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "{spacing.control}"
  button-primary-hover:
    backgroundColor: "{colors.cta-hover}"
  button-secondary:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "{spacing.control}"
  button-secondary-hover:
    backgroundColor: "{colors.subtle}"
  button-sm:
    typography: "{typography.compact}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "{spacing.control-sm}"
  button-lg:
    typography: "{typography.body-lg}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "{spacing.control-lg}"
  button-quiet:
    textColor: "{colors.fg-muted}"
    rounded: "{rounded.md}"
    size: "{spacing.control}"
  button-quiet-hover:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.fg}"
  button-danger:
    backgroundColor: "{colors.danger-solid}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "{spacing.control}"
  button-danger-outline:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.danger}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "{spacing.control}"
  button-danger-outline-hover:
    backgroundColor: "{colors.danger-subtle}"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "{spacing.control}"
  input-pill:
    typography: "{typography.compact}"
    rounded: "{rounded.full}"
    padding: "0 12px 0 36px"
    height: "{spacing.pill-field}"
  breadcrumb-segment:
    textColor: "{colors.fg-muted}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "{spacing.crumb}"
  breadcrumb-current:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.fg}"
  identity-chip:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.fg-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "{spacing.chip}"
  connection-row:
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.nav}"
    padding: "0 36px 0 10px"
    height: "{spacing.nav-row}"
  connection-row-active:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.fg}"
  table-row:
    typography: "{typography.body}"
    rounded: "{rounded.row}"
    padding: "0 14px"
    height: "{spacing.row}"
  table-row-selected:
    backgroundColor: "{colors.accent-subtle}"
    textColor: "{colors.accent-text}"
  vault-status:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.2xl}"
    padding: "10px 4px 10px 10px"
  menu:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.lg}"
    padding: "4px"
  menu-item:
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 8px"
    height: "{spacing.control-sm}"
  dialog:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.xl}"
    width: "448px"
  dialog-footer:
    backgroundColor: "{colors.subtle}"
    padding: "16px 24px"
  upload-tray:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.xl}"
    width: "360px"
  object-panel:
    backgroundColor: "{colors.sidebar}"
    width: "{spacing.panel}"
  preview-frame:
    backgroundColor: "{colors.subtle}"
    rounded: "{rounded.xl}"
  metadata-card:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  vault-card:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.2xl}"
    padding: "28px"
    width: "400px"
---

# Design System: sThree Browser

## Overview

**Creative North Star: "The Quiet Console"**

sThree Browser carries the public portal's look into the app, in its calm form (the user's "B · Calm" choice, 2026-11-05): Mona Sans with a slightly wide cut for titles, pill-shaped actions and navigation, softly rounded containers, a faint top-lit gloss on raised and floating surfaces, and in dark mode a deep blue-violet ink instead of neutral grey. The working shell stays quiet: tone and hairlines separate the planes, one blue marks selection, focus and folders, and motion is limited to state feedback. The portal's spectacle (a living colour field, glow, frosted glass, a 3D logo object) is allowed on the vault screen only, where nothing is being worked on yet.

The interface is made for repeat work, comfortable rather than cramped. A 16px root with a 14px body, 36px controls and 44px listing rows reads at a normal desktop size while a long listing still fits on one screen. Figures use tabular alignment so sizes and dates line up in columns. Security state is part of the chrome: the vault status card, with its countdown ring and Lock pill, sits at the foot of the sidebar on every unlocked screen. Light and dark themes follow the system setting (`prefers-color-scheme`) unless the user picks one.

This supersedes the 2026-11-02 "category standard" visual commitment. The product principles in PRODUCT.md are unchanged.

**Key Characteristics:**
- Neutral surfaces in light (white canvas, blue-grey sidebar, near-white bands); a deep blue-violet ink ramp in dark.
- Pills for every action, navigation step and filter; rounded rectangles (10, 12, 18, 24px) for containers; 8px for text inputs.
- Mona Sans, self-hosted; h1 and h2 in a 108% wide cut with -0.018em tracking; tabular figures for every number.
- A glossy primary CTA: a blue pill in light, a white pill in dark.
- A faint gloss on raised and floating surfaces; no glows anywhere in the app shell.
- Folder icons in blue; file icons and every row action icon in grey.
- Monospace only for literal strings the user types or copies verbatim.

## Colors

A cool neutral scale (cool grey in light, blue-violet ink in dark) with one blue, a CTA pair and three state colours. Every colour is an HSL channel variable on `:root` (`src/index.css`), redefined under `prefers-color-scheme: dark` and under `data-theme="dark"`. The frontmatter holds the light theme; dark values live in the sidecar (`colorMeta.<token>.dark`).

### Primary
- **Action Blue** (`accent`): the upload progress bar, the loading shimmer, the drop-target outline, the caret, and the selected row's 1px outline (at 32%). The same value in both themes.
- **Selection Wash** (`accent-subtle`): the selected table row, the selected share-expiry preset, the drag-and-drop overlay, and a group header under a dragged connection.
- **Selection Ink** (`accent-text`): folder icons (with a 15% Action Blue fill), the selected row's icon and name, the active connection's icon, the selected option check, and the link button. Darker than Action Blue in light mode, lighter in dark.
- **Focus Ring** (`ring`): the 2px focus outline (at 70%) on every focusable element, offset 2px.

### CTA
- **CTA fill** (`cta`, `cta-hover`, `cta-fg`): the primary button only. Light: Action Blue with white text, a top sheen (`--cta-sheen` 0.16) and a blue-tinted drop shadow (`--shadow-cta`). Dark: a white pill (`hsl(0 0% 100%)`, hover `hsl(230 100% 95%)`) with near-black ink text (`hsl(240 30% 4%)`), no sheen, and a dark drop shadow under a 60% inner top highlight. The tokens exist so the in-app theme toggle switches the CTA too.

### State
- **Success Green** (`success`): the vault countdown ring, completed uploads, strong passwords, a passing connection test.
- **Warning Amber** (`warning`): connections missing a credential, insecure (http) endpoints, the share-link caution icon, the unrecoverable-password note, medium-strength passwords.
- **Danger Red** (`danger`, `danger-solid`, `danger-subtle`): error text and field borders; the solid fill of destructive confirm buttons and of the folder-deletion progress bar; the washed background of inline error notes and failed upload rows; the hover colour of row delete icons.

### Group colours
- **Group colours** (`src/lib/groupColors.ts`): the user's eight dot colours (blue #3b82f6, green #16a34a, violet #8b5cf6, amber #f59e0b, red #ef4444, pink #ec4899, teal #14b8a6, grey #6b7280). Keep these as they are; a muted replacement was tried and rejected. Groups saved with that muted palette are drawn in the matching colour here.

### Neutral
- **Canvas** (`bg`): the explorer column, dialogs (deliberately the base tone), inputs, secondary buttons. Dark: the deepest ink (5.5% lightness).
- **Raised** (`raised`): menus, select lists, the upload tray, the credential prompt card, the vault status card, the metadata card, the vault card (at 80%), the active connection pill and drag previews. White in light; 11.5% in dark, the lightest surface.
- **Sidebar** (`sidebar`): the sidebar, the object panel and the vault screen ground. Dark: 7.5%.
- **Subtle Band** (`subtle`): dialog footers, preview frames, the key block, the credential prompt ground, empty-state icon tiles, inline notes, the secondary button hover. Dark: 8.5%, so inside a dialog the footer and nested panes read as lighter bands.
- **Muted Fill** (`muted`): the current breadcrumb segment, identity chips, quiet button hover, skeleton bars, progress tracks and the countdown ring track.
- **Ink** (`fg`) and **Muted Ink** (`fg-muted`): primary text; secondary text, metadata, column headers, file icons and every action icon. Row hover is Ink at 4.5%; sidebar hover Ink at 4%.
- **Hairline** (`border`) and **Strong Hairline** (`border-strong`): dividers and container borders; control borders (inputs, secondary and outline buttons) and dashed outlines.

### Named Rules
**The One Blue Rule.** Blue marks selection, focus, progress, folder icons and (in light mode) the primary CTA. It is never a link colour in running text and never a file-type tint: file icons stay Muted Ink and turn Selection Ink only while their row is selected. Folders are the single decorative use, chosen by the user on 2026-11-05.

**The Grey Actions Rule.** Action icons stay Muted Ink: row quick actions, "…" menus, header icon buttons, the Settings button. Only a delete icon warms to Danger Red, and only on hover. Coloured action buttons were tried and rejected.

**The Meaningful State Rule.** Green, amber and red appear only where they carry a state the user must read. User-chosen group colours appear only as the 8px dot beside the group name.

**The Raised Selection Exception.** The active sidebar connection is the one selection that is not a blue wash: a Raised pill with gloss, the card shadow and a 1px hairline ring, ink at 500 weight, and its database icon in Selection Ink. In dark mode Raised is the lightest surface, so the pill always lifts off the sidebar; never draw it with `bg`.

## Typography

**Sans Font:** Mona Sans (variable, weights 200 to 900, widths 75% to 125%), self-hosted from `public/fonts`, falling back to the system UI stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial).
**Mono Font:** ui-monospace, SFMono-Regular, Menlo, Consolas.

**Character:** The portal's face. Mona Sans at normal width for working text; its wider cut, tightened, for titles, so headings feel built rather than typed. Stylistic set `ss01` is on globally. The app loads no font from another origin.

### Hierarchy
- **Display** (600, 24px, 32px, 108% width, -0.018em): the vault screen heading ("Unlock your vault").
- **Headline** (680, 26px, 32px, 112% width, -0.025em; 22px/28px below 640px): the connection name in the explorer header.
- **Title** (600, 17px, 26px, 108% width, -0.018em): dialog titles and the credential prompt heading; the vault screen product name uses the size at 110% width and -0.015em.
- **Body large** (600, 15px, 22px): the object panel heading (106% width), empty-state headings, the sidebar product name (15.5px, 108%, -0.015em), and large-button text (500).
- **Body** (400 or 500, 14px, 21px): the workhorse. Table and sidebar rows, buttons (500, -0.005em), inputs, field labels (500), dialog descriptions, inline notes. Breadcrumb segments sit at 13.5px.
- **Compact** (500 or 400, 13px, 20px): small buttons, the pill search and filter fields, the vault status title (600).
- **Label** (500 or 400, 12.5px, 18px): column headers, hints, field errors, identity chips, counts and footers. Sentence case, no tracking.
- **Mono** (400, 12.5px, 20px in blocks; 11.5px inside identity chips; inherits the field size in inputs): see the Literal String Rule.

### Named Rules
**The Wide Title Rule.** Every h1 and h2 is set in Mona Sans' wider cut (108%) with -0.018em tracking, from the base stylesheet. The explorer headline pushes it to 112% and -0.025em. Running text, labels and buttons stay at normal width.

**The px Ramp Rule.** The root font size is 16px, so rem utilities resolve at their standard values. The body defaults to 14px. The type scale is declared in explicit px with paired line heights (12.5/18, 14/21, 15/22, 17/26, 20/28, 24/32). Touch-critical sizes stay explicit px: listing rows are exactly 44px.

**The Tabular Figures Rule.** Every number (sizes, dates, counts, percentages, countdowns, ETags) uses tabular figures in the sans face. Metadata is never set in monospace to make it align.

**The Literal String Rule.** Monospace marks strings that must be read or typed exactly: object keys and prefixes (the key block, the drop-target path, the new-folder prefix), the folder name typed to confirm a folder deletion, secret and credential fields, the connection identity fields and the bucket and region identity chips, share URLs, and code or file content. Every other field, including displayed size, type, date, storage class, ETag and the endpoint chip, is sans.

## Layout

A fixed three-column app frame on a 4px rhythm. Column widths are explicit px.

- **Sidebar** (272px by default, resizable from 220px to 420px; Sidebar tone, right hairline): a 64px product row (26px logo with a 7px radius, the product name, a quiet New menu); the pill search field when the Search Threshold Rule allows; the connection tree (34px rows, 1px gaps, 8px side inset) taking the remaining height; and the vault status card, inset 10px at the foot. Below 768px it becomes a 280px drawer over the scrim, with the dialog shadow, and cannot be resized.
- **Sidebar resize:** a 12px invisible handle straddles the right hairline; on hover it shows a 2px Strong Hairline line, and while dragging or focused a 2px Action Blue line. It is a `role="separator"`: arrow keys step 16px (48px with Shift), Home and End jump to the limits, double-click resets to 272px. The width is kept in `localStorage`, never in the vault.
- **Explorer column** (fluid): a header (20px top, 14px bottom padding) with the wide headline, the identity chips beneath it, and Refresh, New folder, Upload at the right (labels hide below 640px); a toolbar with the pill breadcrumb and the pill filter (256px from 640px, full width below) that owns the column's bottom hairline; the scrolling table; and a 48px footer with counts and the pager.
- **Gutters:** 16px on mobile, 28px from 640px, shared by header, toolbar and footer. The table sits in its own narrower gutter (8px, 14px from 640px) so its rounded rows float inside the column; cells carry 14px of inner padding.
- **Rows:** listing rows 44px at every width with 2px between them; sidebar rows 34px.
- **Object panel** (360px, Sidebar tone, left hairline, 64px header) opens inline beside the table from 1024px. Below that it becomes a full-screen layer with a back button.

**The Phantom Column Rule.** The table is `table-fixed` and uses full-width `colSpan` rows (the parent-folder row). The Modified column therefore renders only at 640px and up through a JS media hook. Never hide a column in this table with CSS alone; it leaves a phantom column.

**The Search Threshold Rule.** The sidebar connection search appears only when there are more than 6 connections. Below that the list fits without scrolling and the field is noise.

## Elevation & Depth

Tonal planes and hairlines carry the structure; gloss and shadow mark what is raised or floating. Shadows are tinted blue-black (`rgb(16 24 40)`) so they read soft. The **gloss** utility is a faint top-lit sheen (white at 5.5% fading to 1.2% by 60%): invisible on white, it reads as glass on the dark ink. The sticky table header is canvas at 80% with a backdrop blur (95% without blur support).

### Shadow Vocabulary
- **Hairline lift** (`xs`, `0 1px 2px 0 rgb(16 24 40 / 0.05)`): secondary, danger and outline pills, inputs, empty-state icon tiles.
- **Card** (`card`, `0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)`): the active connection pill and the credential prompt card.
- **Popover** (`popover`, `0 12px 32px -8px rgb(16 24 40 / 0.18), 0 4px 8px -4px rgb(16 24 40 / 0.06)`): menus, select lists, the upload tray, toasts, drag previews.
- **Dialog** (`dialog`, `0 24px 56px -12px rgb(16 24 40 / 0.28), 0 8px 16px -8px rgb(16 24 40 / 0.1)`): dialogs, the mobile drawer, the vault card.
- **CTA** (`--shadow-cta`): the primary pill only; light `inset 0 1px 0 hsl(0 0% 100% / 0.25), 0 1px 2px rgb(16 24 40 / 0.12), 0 4px 12px -4px hsl(221 83% 53% / 0.45)`, dark `inset 0 1px 0 hsl(0 0% 100% / 0.6), 0 8px 24px -10px rgb(0 0 0 / 0.7)`.
- **Preview drop** (`0 20px 40px -24px rgb(0 0 0 / 0.45)`): the object panel's preview frame, so the file sits on the panel like a print.

### Named Rules
**The Shadow-on-Float Rule.** Real shadows (popover, dialog) belong to layers that sit above the page. Resting elements carry at most `xs` or `card`; the preview frame's soft drop and the CTA shadow are the two named exceptions. Panels, tables and the sidebar are never lifted.

**The Gloss Rule.** Gloss goes on Raised surfaces (menus, select lists, the upload tray, the credential and metadata cards, the vault status card, the active connection pill) and on dialogs. Dialogs stay on Canvas under their gloss so the Subtle footer and nested panes read as lighter bands, not as holes.

**The Calm Shell Rule.** The app shell has no glows, colour fields or frosted glass. Translucency there is limited to the sticky table header and the 2px scrim blur. The vault screen is the one place the portal's colour field, glow, frosted card and 3D tiers appear.

## Shapes

Two families. **Pills** (full round) for anything you press or step through: primary, secondary and danger buttons, the vault Lock and pager buttons, breadcrumb segments, the search and filter fields, identity chips, dots, progress tracks and skeleton bars. **Rounded rectangles** for things that hold content: 8px for text inputs, selects, quiet and ghost icon buttons, menu items and inline notes; 10px for menus, select lists, group rows, the key block and icon tiles; 11px for connection rows; 12px for listing rows; 18px for dialogs, the upload tray, the credential prompt card, preview frames, the drop overlay, the empty-sidebar placeholder and empty-state tiles; 24px for the vault card, the vault status card and the metadata card. The 5px step is configured but unused. Listing rows have no dividers: the first and last cells round their outer corners so hover and selection read as one 12px pill. Borders are 1px hairlines; the only 2px border is the dashed drop-target outline in Action Blue.

## Components

### Buttons
Tactile pills; the verb carries the meaning.
- **Shape:** full pill for primary, secondary, danger and danger-outline; 36px by default (14px text, 16px side padding), 32px small (13px, 14px padding), 44px large (15px, 24px padding). Quiet, ghost and icon buttons keep the 8px radius: 36px square, 32px small. 16px icons, 8px gap, 500 weight at -0.005em.
- **Primary:** the CTA tokens: a glossy blue pill in light, a white pill in dark. One per view: Upload, Unlock, Create vault, Download, Save.
- **Secondary (default):** Canvas fill, Strong Hairline border, hairline lift; hover shifts to the Subtle band and warms the border. New folder, Lock, Share link, Cancel, the pager.
- **Quiet / Ghost:** no fill or border; Muted Ink (quiet) or Ink (ghost), Muted fill on hover. Icon buttons, row actions.
- **Danger:** a solid red pill for the final destructive confirm; the danger-outline pill (red text, Strong Hairline border warming to red at 40%, red wash on hover) for the entry point, such as Delete in the object panel.
- **Link:** Selection Ink, underline on hover; secondary routes.
- **States:** background, border, colour, shadow and transform transition at 150ms ease-out; pressed buttons scale to 0.98 (links do not); disabled at 50%; loading swaps in a spinner and sets `aria-busy`.

### Inputs / Fields
- **Style:** 36px, Canvas fill, Strong Hairline border, 8px radius, hairline lift, 14px text with 12px padding; placeholder Muted Ink at 80%; border darkens on hover.
- **Focus:** border turns Action Blue with a soft 4px ring of Action Blue at 15%.
- **Error / Disabled:** red border and a 4px red ring at 15%, a 12.5px red message linked by `aria-describedby`; disabled at 60%.
- **Pill fields:** the sidebar search and the explorer filter are 34px full pills, 13px text, with a leading 16px search icon.
- **Variants:** the in-app Select (see Theme, Controls and Identity) shares the control class and opens a Raised, glossy list with 36px options; the password input is monospace with an attached show/hide segment and a "Caps Lock is on." warning.

### Navigation (sidebar connection tree)
- **Order:** groups first, in the user's order, then ungrouped connections in theirs. Anything without an `order` sorts after, by name.
- **Group row:** 32px, 10px radius, Muted Ink, chevron (rotates 90° when open), 8px colour dot, name in 500 weight, a tabular count that gives way to a 24px "…" menu on hover or focus, and always on touch.
- **Connection row:** 34px, 11px radius, Ink at 90% with a Muted database icon on every row, nested rows included (indented to 32px); Ink at 4% on hover. The active row is the raised glossy pill of the Raised Selection Exception, `aria-current="page"`. An amber 6px dot marks a missing credential.
- **Drag and drop:** drag to reorder connections and groups, into or out of a group. The dragged item lifts as a 32px Raised pill with the popover shadow and a hairline ring; its place holds at 40%; a group header under a dragged connection takes the Selection Wash. Drags start after 4px with a mouse and a 250ms press on touch, and are off while searching. The "…" menus are the keyboard route for every move.

### Vault Status Card
At the foot of the sidebar, inset 10px: a Raised, glossy 24px-radius card with a hairline and no shadow. A 30px countdown ring (Muted track, Success Green arc showing the fraction left of the 15-minute idle window, easing over 700ms) around a Muted lock glyph; "Vault unlocked" (13px, 600) over "Locks in N min" (12.5px, tabular, updated every 10 seconds); a 30px secondary Lock pill; and a 28px quiet Settings button.

### Explorer Header and Breadcrumb
- **Title:** the connection name in the Headline style.
- **Identity chips:** 24px Muted pills, 10px padding, a Muted label ("Bucket", "Region", "Endpoint") then the value in Ink at 85%. Bucket and region values are 11.5px mono; the endpoint host is sans. Region hides below 640px, endpoint below 768px.
- **Breadcrumb:** 30px pill segments at 13.5px separated by a "/" in Muted Ink at 60%; earlier segments are Muted Ink with an Ink-at-5% hover; the current segment is a Muted pill in 600 weight with `aria-current="location"`.

### Object Table
Sortable Name / Size / Modified in a separated table with no row dividers, inset in its gutter. The sticky header is 36px, 12.5px Muted Ink on the translucent blurred Canvas; active sort shows Ink plus an arrow, and `aria-sort` is set. Rows are 44px, 12px-rounded, 2px apart, with 14px cell padding. Hover fills the row with Ink at 4.5%. Selection is the Selection Wash plus a 1px Action Blue outline (32%) drawn per cell as inset shadows so the whole row reads as one outlined pill; fills ease over 100ms. Icons are 18px at stroke 1.75 with a 12px gap: folders in Selection Ink with a 15% blue fill and 500-weight names; files in Muted Ink. Size (right) and date (left) are tabular sans in Muted Ink; folder totals compute in the background (a pulsing 48px Muted bar while pending, a trailing "+" when the scan stopped at 10,000 objects, an em dash only on failure or empty). Every row ends in grey 32px quick actions, visible from 640px: files get Download, Share link, Copy key and Delete; folders get Copy path and Delete folder; delete icons turn red on hover. Below 640px a tap opens the details sheet and only the folder delete stays. Loading shows skeleton bars and a 2px Action Blue shimmer across the top. The footer pager uses 30px secondary pills.

### Object Panel
On the Sidebar tone, a 64px header with a 15px name (106% width) and close; the preview frame (18px radius, hairline, Subtle band, the preview drop shadow, at least 176px tall; checkerboard behind images, native media controls, text in mono capped at 288px); Download (primary) and Share link (secondary) side by side; metadata as a two-column list (112px terms) in a Raised, glossy 24px card with 16px padding; the full key in a 10px Subtle mono block with a copy action; a full-width danger-outline Delete at the foot. Previews are fetched fresh on every open, so the loading frame is a normal state.

### Dialogs
18px radius, Canvas with gloss, hairline, dialog shadow, 448px max width (512px for Share and Connection), over the scrim (`--scrim`: ink at 32% in light, black at 60% in dark) with a 2px blur. The header has the Title-style heading and a 14px Muted description with 24px padding; the body sits on a 20px-gap grid; the footer is a Subtle band with a top hairline holding right-aligned actions 8px apart. Opens over 200ms with a fade and a 0.97 zoom from the centre. Inline errors are red-washed notes in 14px red text.

### Menus and Floating Lists
Radix dropdown menus for row actions, New and Settings: Raised with gloss, hairline, 10px radius, popover shadow, 4px padding, at least 200px wide. Items are 32px, 8px radius, 14px text with a 16px Muted icon and a Muted fill when highlighted; destructive items are Danger Red with a red wash; radio items show a check at the right. Opens with a fade and a 0.98 zoom.

### Upload Tray
A 360px card (18px radius, Raised with gloss, hairline, popover shadow) above the explorer footer at the bottom left, listing uploads with a tabular percentage, a 4px Action Blue progress bar and a cancel control. **The Persistent Failure Rule.** Completed uploads can be dismissed. Failed uploads stay, washed red with the reason in red text, until the user dismisses them. Toasts for other notices appear bottom-right.

### Credential Prompt
A centred 400px column on the Subtle band: an 18px-radius Raised, glossy card with the card shadow and 24px padding, a 36px key tile, the Title-style heading, mono key fields and a full-width large primary pill; a 12.5px Muted reassurance line with a shield icon below.

### Vault Gate (create / unlock)
The one expressive screen. Behind everything, the **colour field**: a WebGL canvas rendered at half resolution, theme-aware (deep ink with blue, violet and cyan light in dark; a pastel wash of the same hues near-white in light), brightest around the card and drifting slowly with the pointer. Before WebGL starts, or without it, a CSS fallback of two radial gradients (Action Blue at 35%, violet `hsl(258 90% 66%)` at 25%) over the Sidebar tone shows instead; the canvas fades in over 900ms. Above the card, the **tiers**: the logo's three storage tiers as a CSS-3D glossy object (96px plates with a 24% radius, 26px apart, blue to indigo to violet, the logo mark on the top plate) that tilts up to 7° sideways and 4° vertically toward the pointer over 800ms and bobs 6px on a 7s cycle. With `prefers-reduced-motion`, the field draws one frame and the tiers hold still. Then the product name (17px, 600, 110% width) and the **frosted card**: 400px max, Raised at 80% with gloss, a 24px backdrop blur, hairline, dialog shadow, 24px radius, 28px padding, 20px gaps. The card opens with a status line (a grey dot with "Vault locked" or "New vault"), the Display heading and one sentence of reassurance; the field and the full-width primary pill are 40px. A wrong password is reported under the field (`aria-invalid`, `role="alert"`), keeps what was typed and selects it. In setup, a Subtle note with an amber warning icon says the password can't be recovered. Below the card, centred 12.5px text holds the "How your vault is protected" disclosure and the reset sentence, whose "reset the vault" link turns red on hover; the reset still goes through the type-RESET confirm dialog. A System / Light / Dark segmented control sits top-right.

### Delete Folder Dialog
The pattern for bulk destructive work. An `alertdialog` that first counts the folder, then states the prefix, object count and total bytes. A mono field asks the user to type the folder name; the solid red Delete folder pill stays disabled until it matches. While deleting (batches of 1,000), a 6px Muted track fills in Danger Solid with a tabular "N of M" count, the dialog cannot be dismissed, and failures appear inline as a red-washed note.

## Do's and Don'ts

### Do:
- **Do** make every button that carries a verb (primary, secondary, danger, outline) a full pill; keep icon-only quiet buttons at 8px.
- **Do** drive the primary button from the `--cta` tokens so it is a glossy blue pill in light and a white pill in dark.
- **Do** put gloss on Raised and floating surfaces, and keep dialogs on Canvas so their Subtle footer reads as a lighter band.
- **Do** colour folder icons Selection Ink with a 15% blue fill, and keep file icons and every action icon in Muted Ink (the One Blue and Grey Actions Rules).
- **Do** set h1 and h2 in the 108% wide cut with -0.018em tracking, and every number in tabular sans figures.
- **Do** draw row hover and selection as inset 12px-rounded fills (selection with its 1px blue outline), not divider lines.
- **Do** keep vault state visible on every unlocked screen, as the countdown-ring card at the sidebar foot.
- **Do** make bulk destructive actions show their scope, require typing the target's name, and report progress and errors inside the dialog.
- **Do** keep app-shell motion to state feedback (100–150ms fills, a 0.98 press, 200ms dialogs, drawer and progress), and reduce the vault screen to one still frame under `prefers-reduced-motion`.

### Don't:
- **Don't** put glows, colour fields, frosted glass or 3D objects in the app shell; they belong to the vault screen (the Calm Shell Rule).
- **Don't** tint file-type icons or action icons, or change the user's group dot colours.
- **Don't** use green, amber or red for anything that is not a state.
- **Don't** lift resting surfaces beyond `xs` or `card`, except the preview frame's soft drop and the CTA shadow.
- **Don't** add uppercase, letter-spaced labels above headings; labels are 12.5px sentence case.
- **Don't** auto-dismiss failed uploads.
- **Don't** load fonts or assets from other origins; Mona Sans is self-hosted.

## Theme, Controls and Identity

**Theme.** Light and dark follow the system by default. A three-way segmented control (System / Light / Dark) sits top-right on the vault screen, and the same choices are radio items in the sidebar Settings menu; a forced choice sets `data-theme` on `<html>` and is remembered in local storage (not the vault, since it is needed before unlock). `public/theme.js` applies it before first paint; it is a file rather than an inline script to satisfy the strict CSP. The scrim, CTA and the vault colour field all follow the theme.

**The No Native Widgets Rule.** Selects and checkboxes are built in-app, never the operating system's. The Select is an ARIA combobox: focus stays on the trigger, options are announced with `aria-activedescendant`, the list floats in a portal (`data-floating`) positioned against the trigger and flips above when space runs out, and it supports arrows, Home/End, Enter/Space, type-ahead and Escape. Dialogs ignore outside presses and Escape that belong to an open floating list. The Checkbox is a button with `role="checkbox"`, an 18px box with a 5px radius that fills Action Blue with a white check.

**Logo.** Three stacked storage tiers stepping into an "S" (light, mid and Action Blue) on a #111827 tile with a 116/512 corner radius: the S and the three in sThree. The source is `public/logo.svg`, and `public/favicon.png` is rendered from it. The app icon is the portal hero's three glossy tiers with that S on the top one: its source is `src-tauri/icons/app-icon.svg`, and the Tauri icon set, `public/logo.png` (the web app's Apple touch icon, 512px) and `public/app-icon.png` (the README image, 256px) are rendered from it. `public/logo-mark.svg` is the bare mark printed on the top plate of the vault screen's tiers.
