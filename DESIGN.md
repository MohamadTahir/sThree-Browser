---
name: sThree Browser
description: A safe, local S3 browser; the category-standard console, executed with care.
colors:
  accent: "hsl(221 83% 53%)"
  accent-fg: "hsl(0 0% 100%)"
  accent-subtle: "hsl(221 92% 94.5%)"
  accent-text: "hsl(224 76% 46%)"
  ring: "hsl(221 83% 53%)"
  success: "hsl(142 72% 29%)"
  warning: "hsl(30 92% 36%)"
  danger: "hsl(0 72% 42%)"
  danger-solid: "hsl(0 72% 45%)"
  danger-subtle: "hsl(0 86% 97%)"
  bg: "hsl(0 0% 100%)"
  sidebar: "hsl(220 20% 97.5%)"
  subtle: "hsl(220 20% 98.5%)"
  muted: "hsl(220 16% 95%)"
  fg: "hsl(222 16% 12%)"
  fg-muted: "hsl(220 8% 42%)"
  border: "hsl(220 14% 92%)"
  border-strong: "hsl(220 12% 85%)"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-0.015em"
    fontFeature: "\"cv11\", \"ss01\""
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "26px"
    fontFeature: "\"cv11\", \"ss01\""
  body-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "22px"
    fontFeature: "\"cv11\", \"ss01\""
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "21px"
    fontFeature: "\"cv11\", \"ss01\""
  compact:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "20px"
    fontFeature: "\"cv11\", \"ss01\""
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: "18px"
    fontFeature: "\"cv11\", \"ss01\", \"tnum\""
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: "20px"
rounded:
  sm: "5px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  unit: "4px"
  gutter-sm: "16px"
  gutter-lg: "24px"
  table-gutter-sm: "8px"
  table-gutter-lg: "12px"
  control-sm: "32px"
  control: "36px"
  control-lg: "44px"
  row: "40px"
  row-touch: "44px"
  nav-row: "36px"
  bar: "64px"
  footer: "44px"
  sidebar: "272px"
  drawer: "280px"
  panel: "360px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "{spacing.control}"
  button-primary-hover:
    backgroundColor: "hsl(221 83% 53% / 0.9)"
  button-secondary:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "{spacing.control}"
  button-secondary-hover:
    backgroundColor: "{colors.subtle}"
  button-sm:
    typography: "{typography.compact}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "{spacing.control-sm}"
  button-lg:
    rounded: "{rounded.md}"
    padding: "0 20px"
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
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "{spacing.control}"
  button-danger-outline:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "0 14px"
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
  input-compact:
    typography: "{typography.compact}"
    rounded: "{rounded.md}"
    padding: "0 12px 0 36px"
    height: "{spacing.control-sm}"
  connection-row:
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 64px 0 10px"
    height: "{spacing.nav-row}"
  connection-row-active:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.fg}"
  table-row:
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "{spacing.row}"
  table-row-touch:
    padding: "0 12px"
    height: "{spacing.row-touch}"
  table-row-hover:
    backgroundColor: "hsl(220 16% 95% / 0.7)"
  table-row-selected:
    backgroundColor: "{colors.accent-subtle}"
    textColor: "{colors.accent-text}"
  vault-status:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.xl}"
    padding: "10px 14px"
  dialog:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.xl}"
    width: "448px"
  dialog-footer:
    backgroundColor: "{colors.subtle}"
    padding: "16px 24px"
  upload-tray:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.xl}"
    width: "360px"
  object-panel:
    backgroundColor: "{colors.bg}"
    width: "{spacing.panel}"
  preview-frame:
    backgroundColor: "{colors.subtle}"
    rounded: "{rounded.xl}"
---

# Design System: sThree Browser

## Overview

**Creative North Star: "The Quiet Console"**

sThree Browser is the category-standard storage console, built to the polish bar of Linear, Vercel, GitHub and the R2/S3 consoles. Grey-white surfaces, near-black ink, soft hairlines and rounded, inset rows. One blue marks what you can do next and what you have selected. Nothing glows, nothing floats unless it actually sits above the page, and motion is limited to state feedback. It deliberately rejects the dark glassmorphic shadcn look and its habit of animating everything.

The interface is made for repeat work, comfortable rather than cramped. A 16px root with a 14px body and 36px controls reads at a normal desktop size while a long listing still fits on one screen. Figures use tabular alignment so sizes and dates line up in columns. Security state is part of the chrome: the vault status card with its auto-lock countdown sits at the top of the sidebar on every screen. The full light and dark themes follow the system setting (`prefers-color-scheme`), and there is no in-app theme toggle.

**Key Characteristics:**
- Neutral surfaces in three tones (white content, blue-grey sidebar, near-white subtle bands) separated by soft 1px hairlines.
- One blue accent, used only for primary action, selection and focus.
- System UI type stack, px ramp from 12.5px to 20px with a 14px body, tabular figures for every number.
- Monospace only for literal strings the user types or copies verbatim.
- Rows are inset rounded fills, not ruled lines.
- Flat at rest, with hairline-scale shadows on controls and cards; real shadows reserved for floating layers.
- Light and dark themes from the same HSL channel tokens.

## Colors

The palette is a cool neutral scale with one blue and three state colours. Every colour is an HSL channel variable on `:root` (`src/index.css`), redefined under `prefers-color-scheme: dark`. The values in the frontmatter are the light theme; dark values live in the sidecar. The dark theme is lifted slightly off black (canvas at 9.5% lightness) so hairlines and fills stay readable.

### Primary
- **Action Blue** (`accent`): fills the primary button (Upload, Unlock, Save), the upload progress bar and the loading shimmer, and is the caret colour. In dark mode it keeps the same value.
- **Selection Wash** (`accent-subtle`): background of the selected table row, the selected share-expiry preset, and the drag-and-drop overlay.
- **Selection Ink** (`accent-text`): text and icon on the selection wash, the active connection's icon, and the link-button colour. Darker than Action Blue in light mode for contrast, lighter in dark mode.
- **Focus Ring** (`ring`): the 2px focus outline (at 70%) on every focusable element, offset 2px.

### State
- **Success Green** (`success`): the vault-unlocked dot and its halo, completed uploads, strong passwords, a passing connection test.
- **Warning Amber** (`warning`): connections missing a credential, insecure (http) endpoints, the share-link caution icon, medium-strength passwords.
- **Danger Red** (`danger`, `danger-solid`, `danger-subtle`): error text and field borders; the solid fill of destructive confirm buttons and of the folder-deletion progress bar; the washed background of inline error notes and failed upload rows.

### Neutral
- **Canvas** (`bg`): content column, dialogs, panels, cards, inputs, and the raised active connection pill.
- **Sidebar Grey** (`sidebar`): a faintly blue grey for the sidebar and the vault unlock screen.
- **Subtle Band** (`subtle`): dialog footers, preview frames, key and code blocks, empty-state icon tiles, and the secondary button hover.
- **Muted Fill** (`muted`): hover fill for rows (at 70% in the table) and quiet buttons, skeleton bars, and progress tracks.
- **Ink** (`fg`) and **Muted Ink** (`fg-muted`): primary text; secondary text, metadata, column headers and icons.
- **Hairline** (`border`) and **Strong Hairline** (`border-strong`): dividers and container borders; control borders (inputs, secondary buttons) and dashed empty-state outlines.

### Named Rules
**The One Blue Rule.** Blue appears only for primary actions, selection and focus. It is never decoration, never a link colour in running text, never an icon tint for folders or file types. A file icon turns Selection Ink only while its row is selected.

**The Meaningful State Rule.** Green, amber and red appear only where they carry a state the user must read. Folder and file icons are neutral (`fg-muted`, folders with a 15% fill of the same colour). User-chosen group colours appear only as the 8px dot beside the group name.

**The Raised Selection Exception.** The active sidebar connection is the one selection that is not a blue wash: it is a raised canvas pill (card shadow plus a 1px hairline ring) in ink at 500 weight, and its database icon in Selection Ink carries the selection. On the grey sidebar a white pill reads as "this one is open" without a second blue surface competing with the table selection.

## Typography

**Body Font:** system UI stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial)
**Mono Font:** ui-monospace, SFMono-Regular, Menlo, Consolas

**Character:** The platform's own face, so the app feels native in Tauri on every OS and in the browser. Stylistic sets `cv11` and `ss01` are on globally. There is no display tier; the largest type is the 20px screen title.

### Hierarchy
- **Headline** (600, 20px, 28px, -0.015em): the connection name in the explorer header; the vault screen heading uses the size without the tracking.
- **Title** (600, 17px, 26px): dialog titles and the product name on the vault screen.
- **Body large** (600, 15px, 22px): object panel heading, empty-state headings, the sidebar product name (with -0.01em), and large-button text (500).
- **Body** (400 or 500, 14px, 21px): the workhorse and the body default. Table rows, sidebar rows, buttons, inputs, field labels (500), breadcrumbs, dialog descriptions, inline notes.
- **Compact** (500 or 400, 13px, 20px): small buttons and the compact search fields (sidebar search, page filter).
- **Label** (500 or 400, 12.5px, 18px): column headers, the sidebar "Connections" heading, hints, field errors, the header's bucket · region · endpoint line, counts and footers. Sentence case, no tracking.
- **Mono** (400, 12.5px, 20px in blocks; inherits the field size in inputs): see the Literal String Rule.

The scale also defines 11px/16px and 24px/32px steps; neither is in use, and new screens should not need them.

### Named Rules
**The px Ramp Rule.** The root font size is 16px, so rem utilities resolve at their standard values (a 0.25rem step is 4px; `h-9` is 36px). The body defaults to 14px. The type scale is declared in explicit px with paired line heights (12.5/18, 14/21, 15/22, 17/26, 20/28). Touch-critical sizes stay explicit px: mobile list rows are exactly 44px.

**The Tabular Figures Rule.** Every number (sizes, dates, counts, percentages, countdowns, ETags) uses tabular figures in the sans face. Metadata is never set in monospace to make it align.

**The Literal String Rule.** Monospace marks strings that must be read or typed exactly: object keys and prefixes (the key block, the drop-target path, the new-folder prefix), the folder name typed to confirm a folder deletion, secret and credential fields (password inputs, access keys, masked key previews), the connection identity fields (bucket, region, endpoint inputs), share URLs, and code or file content (the CORS rule, text previews, raw error detail). Every other field, including displayed size, type, date, storage class and ETag, is sans.

## Layout

A fixed three-column app frame on a 4px rhythm. Column widths are explicit px.

- **Sidebar** (272px, sidebar grey, right hairline): a 64px product row (28px icon, name), then the vault status card, a "Connections" heading with an add button, the connection list (36px rows with 2px gaps, 12px side inset), and a footer of 36px quiet rows (Add connection, Credentials with count, New group, Change master password) above a top hairline. Below 768px it becomes a 280px drawer over a 40% black scrim, with the dialog shadow.
- **Explorer column** (fluid): a 64px header with no bottom border (menu button on mobile, connection name and identity line, then Refresh, New folder, Upload at right; button labels hide below 640px); a toolbar carrying the breadcrumb and filter (256px from 640px, full width below) that owns the column's bottom hairline; the scrolling table; and a 44px footer with counts and pagination.
- **Gutters:** 16px on mobile, 24px from 640px, shared by header, toolbar and footer. The table sits in its own narrower gutter (8px, 12px from 640px) so its rounded row fills float inside the column, and cells carry 12px of inner padding.
- **Rows:** table rows 40px from 640px and an explicit 44px below; sidebar rows 36px.
- **Object panel** (360px, left hairline, 64px header) opens inline beside the table from 1024px. Below that it becomes a full-screen layer with a back button.

**The Phantom Column Rule.** The table is `table-fixed` and uses full-width `colSpan` rows (the parent-folder row). The Modified column therefore renders only at 640px and up through a JS media hook. Never hide a column in this table with CSS alone; it leaves a phantom column.

**The Search Threshold Rule.** The sidebar connection search appears only when there are more than 6 connections. Below that the list fits without scrolling and the field is noise.

## Elevation & Depth

Flat by default, separated by tone and soft hairlines. The sidebar, subtle bands and canvas create the planes; 1px borders draw the edges. Shadows are tinted with a blue-black (`rgb(16 24 40)`) rather than pure black, so they read as soft rather than grey. The sticky table header is the one translucent surface: canvas at 80% with a backdrop blur (95% where blur is unsupported), so scrolled rows soften beneath it without a hard line.

### Shadow Vocabulary
- **Hairline lift** (`xs`, `0 1px 2px 0 rgb(16 24 40 / 0.05)`): resting buttons (except quiet, ghost and link), inputs, the product icon, empty-state icon tiles.
- **Card** (`card`, `0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)`): the vault status card and the active connection pill.
- **Popover** (`popover`, `0 12px 32px -8px rgb(16 24 40 / 0.18), 0 4px 8px -4px rgb(16 24 40 / 0.06)`): the upload tray.
- **Dialog** (`dialog`, `0 24px 56px -12px rgb(16 24 40 / 0.28), 0 8px 16px -8px rgb(16 24 40 / 0.1)`): dialogs and the mobile sidebar drawer.

**The Shadow-on-Float Rule.** Only layers that actually sit above the page (tray, toasts, dialogs, drawer) get a real shadow (popover or dialog). Resting elements carry at most the hairline-scale `xs` or `card` lift. Panels, tables and the sidebar are never lifted.

## Shapes

Soft, consistent corners in four steps: 8px on controls (buttons, inputs, selects, share presets, sort-header buttons, breadcrumb buttons) and inline notes; 10px on rows (table rows, sidebar rows, footer rows), the key block and icon tiles; 14px on dialogs, cards (the vault status card, the unlock card, the upload tray), preview frames, the empty-sidebar placeholder and the drop overlay; full rounds for dots, progress tracks, strength bars and skeleton bars. The 5px step is configured but unused. Table rows have no dividers: the first and last cells round their outer corners so hover and selection read as one 10px pill. Borders are 1px hairlines everywhere; the only 2px border is the dashed drop-target outline in Action Blue.

## Components

### Buttons
Quiet and tactile. The verb carries the meaning, not the chrome.
- **Shape:** gently rounded (8px); 36px tall by default (14px text, 14px side padding), 32px small (13px), 44px large (15px, 20px padding); icon buttons 36px square (32px small); 16px icons with an 8px gap.
- **Primary:** Action Blue fill, white text, hairline lift. One per view: Upload, Unlock, Save.
- **Secondary (default):** canvas fill, strong-hairline border, hairline lift; hover shifts to the subtle band and darkens the border slightly. New folder, Lock, Cancel.
- **Quiet / Ghost:** no fill or border; muted ink (quiet) or ink (ghost), muted fill on hover. Icon buttons, row actions, pagination.
- **Danger:** solid red fill for the final destructive confirm; danger-outline (red text, strong-hairline border that warms to red at 40% on hover, red wash) for the entry point, such as Delete in the object panel.
- **Link:** selection ink, underline on hover; secondary routes like Reset vault.
- **States:** background, border, colour, shadow and transform transition at 150ms ease-out; 90% fill on hover for solid variants; pressed buttons scale to 0.98 (links do not); disabled at 50% opacity; loading swaps in a spinner and sets `aria-busy`.

### Inputs / Fields
- **Style:** 36px, canvas fill, strong-hairline border, 8px radius, hairline lift, 14px text with 12px padding; placeholder in muted ink at 80%; border darkens on hover.
- **Focus:** border turns Action Blue with a soft 4px ring of Action Blue at 15%.
- **Error / Disabled:** red border and a 4px red ring at 15%, a 12.5px red message below linked by `aria-describedby`; disabled at 60% opacity.
- **Field:** 14px 500 label, 6px gap, 12.5px muted hint.
- **Variants:** native select with a chevron overlay, sharing the same control class; password input with a show/hide toggle and monospace text; 32px compact search fields (13px, leading search icon) in the sidebar and the explorer toolbar.

### Navigation (sidebar connection list)
- **Group row:** 36px, muted ink, chevron (rotates 90° when open), 8px colour dot, name in 500 weight, tabular count that gives way to Edit and Delete on hover or focus.
- **Connection row:** 36px, 10px radius, ink at 90% with a muted database icon, muted fill on hover. The active row is the raised pill described in the Raised Selection Exception: canvas fill, card shadow, 1px hairline ring, ink in 500 weight, Selection Ink icon, `aria-current="page"`. An amber 6px dot marks a missing credential. Nested rows indent to 40px and drop the icon.

### Vault Status Card
The signature of the product's security posture. A canvas card (14px radius, hairline, card shadow, 10px by 14px padding) inset 12px in the sidebar: a green dot with a soft green halo, "Vault unlocked", a tabular countdown ("Locks in N min") updated every 10 seconds, and a small secondary Lock button.

### Object Table
Sortable Name / Size / Modified in a separated table with no row dividers, inset in its 8–12px gutter. The sticky header is 40px, 12.5px muted ink on the translucent blurred canvas; active sort shows ink plus an arrow, and `aria-sort` is set. Rows are 40px (44px below 640px) with 12px cell padding; hover fills the row with muted at 70% and selection with the Selection Wash, both as a single 10px-rounded pill, with fills easing over 100ms. Icons are 18px at stroke 1.75 with a 12px gap; folder names are 500 weight. Size (right-aligned) and date (left-aligned) are tabular sans in muted ink; folders show their total size and newest modified date, computed in the background three at a time (a pulsing 48px muted bar while pending, a trailing "+" when the scan stopped at 10,000 objects, and an em dash only when it fails or the folder is empty). Every row ends in quiet 32px quick actions, always visible from 640px up: files get Download, Share link, Copy key and Delete; folders get Copy path and Delete folder. Delete icons turn red on hover. Below 640px, file actions are hidden because a tap opens the details sheet, and only the folder delete stays visible. Loading shows skeleton bars and a 2px shimmer bar in Action Blue across the top.

### Object Panel
A 64px header with a 15px name and close; a preview frame (14px radius, hairline, subtle band, at least 176px tall; checkerboard behind images, native media controls, text in mono capped at 288px tall); a two-column definition list (112px term column) of metadata; the full key in a 10px-rounded subtle mono block with a copy action; full-width danger-outline Delete at the foot. Previews are fetched fresh on every open (web requests bypass the browser cache), so the loading frame is a normal state, not an edge case.

### Dialogs
14px radius, dialog shadow, 448px max width (512px for Share), a 30% black scrim with a 2px blur (60% in dark mode). The header has a 17px title and a 14px muted description with 24px padding; the body sits on a 20px-gap grid; the footer is a subtle band with a top hairline holding right-aligned actions 8px apart. Opens over 200ms with a fade and a 0.98 zoom. Inline errors appear in the body as a red-washed note in 14px red text.

### Delete Folder Dialog
The pattern for bulk destructive work. An `alertdialog` that first counts the folder (a spinner with "Counting objects in …"), then states the prefix, the object count and the total bytes in the description. A mono field asks the user to type the folder name; the solid red Delete folder button stays disabled until it matches. While deleting (in batches of 1,000), a 6px muted track fills in Danger Solid with a tabular "N of M" count, the dialog cannot be dismissed, and any failure appears inline as a red-washed note rather than a toast.

### Upload Tray
A 360px popover card (14px radius, hairline, popover shadow) above the explorer footer at the bottom left, listing uploads with a tabular percentage, a 4px progress bar and a cancel control. **The Persistent Failure Rule.** Completed uploads can be dismissed. Failed uploads stay, washed red with the reason in red text, until the user dismisses them. Toasts for other notices appear bottom-right.

## Do's and Don'ts

### Do:
- **Do** keep blue to primary action, selection and focus (the One Blue Rule); the only non-wash selection is the raised active connection pill.
- **Do** set every number in tabular sans figures, and monospace only for literal strings (the Literal String Rule).
- **Do** write touch-critical and column sizes in explicit px (44px mobile rows, 272px sidebar, 360px panel).
- **Do** render conditional table columns in JS when the table is `table-fixed` with `colSpan` rows.
- **Do** draw row hover and selection as inset 10px-rounded fills, not as divider lines.
- **Do** make bulk destructive actions show their scope, require typing the target's name, and report progress and errors inside the dialog.
- **Do** keep vault state visible on every unlocked screen.
- **Do** keep motion to state feedback: 100–150ms fills, a 0.98 press, 200ms for dialogs, the drawer and progress, and nothing under `prefers-reduced-motion`.

### Don't:
- **Don't** colour folder or file-type icons; they stay in muted ink.
- **Don't** use green, amber or red for anything that is not a state.
- **Don't** lift resting surfaces beyond the `xs` or `card` shadow; only floating layers get the popover or dialog shadow.
- **Don't** add uppercase, letter-spaced labels above headings; section labels are 12.5px sentence case.
- **Don't** auto-dismiss failed uploads.
- **Don't** bring back the dark glassmorphic look: no translucent blurred panels or cards and no glows. Translucency is limited to the sticky table header and the 2px dialog-scrim blur.

## Theme, Controls and Identity

**Theme.** Light and dark follow the system by default. A three-way segmented control (System / Light / Dark) sits at the sidebar foot and in the top-right of the unlock screen; a forced choice sets `data-theme` on `<html>` and is remembered in local storage (not the vault, since it is needed before unlock). `public/theme.js` applies it before first paint so the page never flashes the wrong theme; it is a file rather than an inline script to satisfy the strict CSP. The dialog scrim is a token (`--scrim`) so it follows the theme too.

**The No Native Widgets Rule.** Selects and checkboxes are built in-app, never the operating system's. The Select is an ARIA combobox: focus stays on the trigger, options are announced with `aria-activedescendant`, the list floats in a portal (`data-floating`) positioned against the trigger and flips above when space runs out, and it supports arrows, Home/End, Enter/Space, type-ahead and Escape. Dialogs ignore outside presses and Escape that belong to an open floating list. The Checkbox is a button with `role="checkbox"`, an 18px box with a 5px radius that fills Action Blue with a white check.

**Dialog motion.** Dialogs are centred with `inset: 0` and auto margins, not a -50% translate, so the 200ms fade-and-scale (0.97) runs from the centre.

**Logo.** Three stacked storage tiers stepping into an "S" (light, mid and Action Blue) on a #111827 tile with a 116/512 corner radius: the S and the three in sThree. The source is `public/logo.svg`; `public/logo.png` (1024px), `public/favicon.png` (64px) and the Tauri icon set are rendered from it.

