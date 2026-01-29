# Icons

Place your application icons here. Tauri requires icons in the following formats:

- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

You can generate these icons using tools like:
- [Tauri Icon Generator](https://github.com/tauri-apps/tauri-icon)
- Online icon generators
- Image editing software

**Note**: Placeholder empty files have been created for development. For production builds, you'll need to replace these with actual icon files.

To generate icons from a source image:
```bash
# Install tauri-icon if you haven't already
npm install -g @tauri-apps/cli

# Generate icons from a source image (e.g., icon.png)
tauri icon icon.png
```
