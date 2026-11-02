---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

Scope: the whole app shell (vault gate, sidebar, explorer, object panel, dialogs). Mode: Operate. Build path: code-led.

Audience/job: anyone browsing their own S3 buckets on desktop or web; find an object, inspect, upload, download, share, delete, with credentials kept safe.

## Direction contract

THESIS: The category standard, executed at the craft level of Linear, Vercel, GitHub and the R2/S3 consoles; refuses the old dark glassmorphic shadcn look and its everything-animates habit.

OWN-WORLD: Neutral grey-white surfaces (#fff content, #f6f7f9 sidebar), near-black ink #16181d, one blue accent #2563eb only for primary action, selection and focus; green/amber/red only for state. 1px hairlines, 6px radii, system UI stack, tabular figures, monospace only for object keys. Full dark theme following the system setting.

STORY: The user unlocks the vault, sees which connection is open and that the vault is unlocked with its auto-lock countdown, scans the folder as a sortable table, and acts on one object from a details panel without leaving the listing.

FIRST VIEWPORT: 260px sidebar (product name, vault status card with Lock, connection search, colour-dot connection folders, Add connection / Credentials at foot); main column header with connection name and bucket·region·endpoint line, Refresh / New folder / Upload (primary) at right; breadcrumb + filter bar; sortable table Name/Size/Modified; 340px details panel on selection; upload progress toasts bottom-left.

FORM: category standard (canon), chosen by the user over the roll; seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
