# S3 Browser

A modern, slick desktop application for browsing S3 buckets and S3-compatible storage built with Tauri v2, React, TypeScript, and Rust.

## Features

- 🪣 **Multi-Bucket Management**: Add and manage multiple S3 accounts/buckets
- 🔐 **Secure Storage**: Credentials stored locally using Tauri's secure store plugin
- 📁 **File Explorer**: Modern grid/list view with folder navigation
- 🍞 **Breadcrumb Navigation**: Easy path traversal through bucket folders
- 🎨 **Dark Mode UI**: Beautiful glassmorphism design with smooth animations
- 🔄 **S3-Compatible**: Works with AWS S3 and other S3-compatible storage services

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

### Desktop App (Tauri)

Run the desktop app in development mode:

```bash
npm run tauri dev
# or
pnpm tauri dev
```

This will:
- Start the Vite dev server for the frontend
- Build and run the Tauri application
- Enable hot-reload for both frontend and backend changes

### Web Version

For the web version, you need to run both the frontend and the proxy server:

**Option 1: Run both together (recommended)**
```bash
npm run dev:all
# or
pnpm dev:all
```

**Option 2: Run separately**

Terminal 1 (Proxy server):
```bash
npm run dev:proxy
# or
pnpm dev:proxy
```

Terminal 2 (Frontend):
```bash
npm run dev
# or
pnpm dev
```

The proxy server runs on `http://localhost:3001` and handles all S3 API requests server-side to avoid CORS issues. The frontend runs on `http://localhost:1420`.

**Note**: The proxy server is only needed for the web version. The Tauri desktop app uses the Rust backend and doesn't require the proxy server.

#### Proxy Server Configuration

The proxy server can be configured using environment variables (see `.env.example`):
- `PROXY_PORT`: Port for the proxy server (default: 3001)
- `ALLOWED_ORIGIN`: CORS allowed origin (default: http://localhost:1420)
- `VITE_PROXY_URL`: Proxy URL used by frontend (default: http://localhost:3001)

In development, Vite automatically proxies `/api` requests to the proxy server, so you don't need to configure `VITE_PROXY_URL` unless running the proxy on a different port.

## Docker Deployment

### Building and Running with Docker

Build the Docker image:
```bash
docker build -t s3-browser .
```

Run the container:
```bash
docker run -d -p 8888:8888 --name s3-browser s3-browser
```

Or use docker-compose:
```bash
docker-compose up -d
```

The application will be available at `http://localhost:8888`

### Docker Image Details

- **Base Image**: `joseluisq/static-web-server:2-alpine` (lightweight static web server)
- **Port**: 8888 (runs as non-root user for security)
- **Security**:
  - Runs as `nobody` user (UID 65534, GID 65534)
  - No new privileges allowed
  - Minimal attack surface
  - Read-only file system where possible
- **Build Output**: Served from `/public` directory

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
   - Enter your connection name, access key, secret key, and region
   - Optionally provide an endpoint URL for S3-compatible storage
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
