# Icons

Every file here is generated from [`app-icon.svg`](app-icon.svg): the portal
hero's three stacked tiers with the logo's S on the top one.

To regenerate after changing the SVG:

1. Render `app-icon.svg` to a 1024×1024 PNG with a transparent background
   (any browser does it; the rounded tile has transparent corners).
2. Run `pnpm tauri icon <that PNG> -o src-tauri/icons`.
3. iOS icons must be opaque and square-cornered (iOS rounds them itself).
   Render the SVG again without its `clip-path` on a `#0b0b14` background,
   run `tauri icon` on that into a scratch folder, copy its `ios/` PNGs over
   these, and strip their alpha channel.
4. Keep `android/values/ic_launcher_background.xml` as it is; `tauri icon`
   rewrites it.
