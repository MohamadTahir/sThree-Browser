# S3 Browser

A modern, slick desktop application for browsing S3 buckets and S3-compatible storage (MinIO, Cloudflare R2, etc.) built with Tauri v2, React, TypeScript, and Rust.

## Features

- 🪣 **Multi-Bucket Management**: Add and manage multiple S3 accounts/buckets
- 🔐 **Secure Storage**: Credentials stored locally using Tauri's secure store plugin
- 📁 **File Explorer**: Modern grid/list view with folder navigation
- 🍞 **Breadcrumb Navigation**: Easy path traversal through bucket folders
- 🎨 **Dark Mode UI**: Beautiful glassmorphism design with smooth animations
- 🔄 **S3-Compatible**: Works with AWS S3, MinIO, Cloudflare R2, and other S3-compatible services

## Tech Stack

- **Backend**: Rust with `aws-sdk-s3`, `serde`, `tauri-plugin-store`
- **Frontend**: React + TypeScript + Tailwind CSS + Lucide Icons
- **UI Components**: Shadcn UI (Radix UI primitives)
- **Desktop Framework**: Tauri v2

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) or npm

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd s3-browser
```

2. Install frontend dependencies:
```bash
npm install
# or
pnpm install
```

3. Install Rust dependencies (will happen automatically on first build):
```bash
cd src-tauri
cargo build
```

## Development

Run the app in development mode:

```bash
npm run tauri dev
# or
pnpm tauri dev
```

This will:
- Start the Vite dev server for the frontend
- Build and run the Tauri application
- Enable hot-reload for both frontend and backend changes

## Building

Build the application for production:

```bash
npm run tauri build
# or
pnpm tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

### macOS Installation

After building, you'll find the following in `src-tauri/target/release/bundle/`:

1. **`.app` bundle** (e.g., `S3 Browser.app`):
   - Double-click to run directly, or
   - Drag to `/Applications` folder to install system-wide

2. **`.dmg` file** (Disk Image):
   - Double-click to mount
   - Drag the app to Applications folder
   - Eject the disk image when done

**Note**: On macOS, you may need to allow the app to run:
- Right-click the `.app` → "Open" → Click "Open" in the security dialog
- Or go to System Settings → Privacy & Security → Allow the app

### Development Build (Faster)

For faster builds during development (without code signing):

```bash
npm run tauri build -- --debug
```

This creates a debug build in `src-tauri/target/debug/bundle/`.

## Usage

1. **Add a Bucket**:
   - Click the "+" button in the sidebar
   - Enter your account nickname, access key, secret key, and region
   - Optionally provide an endpoint URL for S3-compatible storage (e.g., MinIO, R2)
   - Click "Add Bucket"

2. **Browse Files**:
   - Select a bucket from the sidebar
   - Click on folders to navigate
   - Use breadcrumbs to navigate back
   - View file metadata (size, last modified)

3. **Manage Buckets**:
   - Hover over a bucket in the sidebar to see the delete button
   - Click the trash icon to remove a bucket configuration

## Project Structure

```
s3-browser/
├── src/                    # React frontend
│   ├── components/         # React components
│   │   ├── ui/            # Shadcn UI components
│   │   ├── Sidebar.tsx    # Bucket list sidebar
│   │   ├── FileExplorer.tsx # Main file browser
│   │   ├── AddBucketModal.tsx # Add bucket dialog
│   │   └── Breadcrumb.tsx # Navigation breadcrumbs
│   ├── lib/               # Utility functions
│   ├── types.ts           # TypeScript type definitions
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs        # Tauri entry point
│   │   ├── commands.rs    # S3 API commands
│   │   └── store.rs        # Configuration persistence
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
└── package.json           # Node.js dependencies
```

## Security Notes

- Credentials are stored locally using Tauri's secure store plugin
- No credentials are sent to external servers
- All S3 operations happen directly from your machine
- Credentials are encrypted at rest by Tauri's store plugin

## License

MIT
