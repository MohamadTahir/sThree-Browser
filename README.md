# S3 Browser

A modern, cross-platform desktop and web application for browsing and managing S3 buckets and S3-compatible storage services. Built with Tauri v2, Next.js, React, TypeScript, and Rust.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![React](https://img.shields.io/badge/React-18.2-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black)
![Tauri](https://img.shields.io/badge/Tauri-2.9-blue)

## ✨ Features

- 🪣 **Multi-Bucket Management**: Add and manage multiple S3 accounts/buckets with custom nicknames
- 🔐 **Secure Storage**: Credentials encrypted and stored locally using Tauri's secure store plugin
- 📁 **File Explorer**: Modern grid/list view with intuitive folder navigation
- 🍞 **Breadcrumb Navigation**: Easy path traversal through bucket folders
- 🎨 **Beautiful UI**: Dark mode glassmorphism design with smooth animations
- 🔄 **S3-Compatible**: Works with AWS S3 and other S3-compatible storage services (MinIO, Cloudflare R2, etc.)
- 📥 **Download Files**: Download files directly to your local machine
- 🔗 **Presigned URLs**: Generate temporary shareable links for files
- 🗑️ **Delete Objects**: Delete files and folders with version support
- 👁️ **File Preview**: Preview images, PDFs, and text files directly in the app
- 🌐 **Cross-Platform**: Available as desktop app (Windows, macOS, Linux) and web application
- 🔒 **Privacy-First**: All credentials stored locally, never sent to external servers

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16.1 (App Router)
- **UI Library**: React 18.2 + TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Radix UI primitives)
- **Icons**: Lucide React

### Backend
- **Desktop**: Tauri v2.9 (Rust)
- **Web**: Next.js API Routes
- **S3 SDK**: AWS SDK v3 (JavaScript) / AWS SDK Rust

### Development Tools
- **Package Manager**: pnpm
- **Build Tool**: Next.js / Tauri
- **Language**: TypeScript 5.3

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **pnpm** ([Installation Guide](https://pnpm.io/installation))
- **Rust** latest stable ([Installation Guide](https://www.rust-lang.org/tools/install))
- **System Dependencies** (for Tauri):
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `libwebkit2gtk-4.0-dev`, `build-essential`, `curl`, `wget`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`
  - **Windows**: Microsoft Visual Studio C++ Build Tools

## 🚀 Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd s3-browser
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Install Rust dependencies** (will happen automatically on first build):
   ```bash
   cd src-tauri
   cargo build
   cd ..
   ```

## 💻 Development

### Web Version

Run the Next.js development server:

```bash
pnpm run dev
```

The application will be available at `http://localhost:1420` with:
- Hot module replacement (HMR)
- API routes for S3 operations
- Full development experience

### Desktop App (Tauri)

Run the desktop app in development mode:

```bash
pnpm run tauri:dev
```

This will:
- Start the Next.js dev server for the frontend
- Build and run the Tauri application
- Enable hot-reload for both frontend and backend changes

**Note**: The Tauri desktop app uses the Rust backend for all S3 operations and doesn't use the Next.js API routes.

## 🏗️ Building

### Web Version

Build the Next.js application for production:

```bash
pnpm run build
```

Start the production server:

```bash
pnpm run start
```

The application will be available at `http://localhost:3000` (Next.js default port)

### Desktop App (Tauri)

Build the Tauri desktop application:

```bash
pnpm run tauri:build
```

This will:
- Build Next.js as a static export (no API routes needed since Tauri uses Rust backend)
- Build the Tauri application
- Create installers in `src-tauri/target/release/bundle/`

#### Build Outputs

**macOS**:
- `.app` bundle: Double-click to run or drag to `/Applications`
- `.dmg` file: Double-click to mount and install

**Windows**:
- `.msi` installer: Run to install the application
- `.exe` file: Portable executable

**Linux**:
- `.AppImage`: Portable application
- `.deb` / `.rpm`: Distribution-specific packages

**Note**: On macOS, you may need to allow the app to run:
- Right-click the `.app` → "Open" → Click "Open" in the security dialog
- Or go to System Settings → Privacy & Security → Allow the app

### Development Build (Faster)

For faster builds during development (without code signing):

```bash
pnpm run tauri build -- --debug
```

This creates a debug build in `src-tauri/target/debug/bundle/`.

## 🐳 Docker Deployment

### Building the Docker Image

```bash
docker build -t s3-browser .
```

### Running the Container

```bash
docker run -d -p 3000:3000 --name s3-browser s3-browser
```

The application will be available at `http://localhost:3000`

### Docker Image Details

- **Base Image**: `node:24-alpine` (Node.js runtime for Next.js)
- **Port**: 3000 (Next.js default port)
- **Security**:
  - Runs as `nextjs` user (UID 1001, GID 1001)
  - Multi-stage build for smaller image size
  - Only production dependencies included
- **Build Output**: Next.js standalone build with API routes support

## 📖 Usage

### Adding a Bucket

1. Click the **"+"** button in the sidebar
2. Enter your connection details:
   - **Nickname**: A friendly name for this connection
   - **Access Key**: Your S3 access key ID
   - **Secret Key**: Your S3 secret access key
   - **Region**: AWS region (e.g., `us-east-1`)
   - **Endpoint** (optional): For S3-compatible storage (e.g., `s3.example.com`)
3. Click **"Add Bucket"**

### Browsing Files

- **Select a bucket** from the sidebar
- **Click on folders** to navigate
- **Use breadcrumbs** to navigate back
- **View file metadata** (size, last modified) in the details sidebar
- **Switch between grid and list view** using the view toggle

### File Operations

- **Download**: Click the download button on any file
- **Preview**: Click on images, PDFs, or text files to preview them
- **Delete**: Right-click or use the delete button (supports version deletion)
- **Share**: Generate presigned URLs for temporary file access

### Managing Buckets

- **Edit**: Click the edit icon to modify bucket settings
- **Delete**: Hover over a bucket and click the trash icon
- **Groups**: Organize buckets into groups for better management

## 📁 Project Structure

```
s3-browser/
├── src/                          # Frontend source code
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes (S3 proxy)
│   │   │   └── s3/               # S3 API endpoints
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Home page
│   ├── components/               # React components
│   │   ├── ui/                   # Shadcn UI components
│   │   ├── FileExplorer.tsx      # Main file browser
│   │   ├── Sidebar.tsx           # Bucket list sidebar
│   │   ├── AddBucketModal.tsx    # Add bucket dialog
│   │   ├── EditBucketModal.tsx   # Edit bucket dialog
│   │   └── ...                   # Other components
│   ├── lib/                      # Utility functions
│   │   ├── s3Client.ts           # S3 client utilities
│   │   ├── fileUtils.ts          # File type detection
│   │   └── utils.ts              # General utilities
│   ├── services/                 # Business logic
│   │   ├── s3Service.ts          # S3 API service
│   │   ├── storageService.ts     # Config storage
│   │   └── encryptionService.ts  # Credential encryption
│   └── types.ts                  # TypeScript type definitions
├── src-tauri/                    # Tauri backend (Rust)
│   ├── src/
│   │   ├── main.rs               # Tauri entry point
│   │   ├── commands.rs           # S3 API commands
│   │   └── store.rs             # Configuration persistence
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
├── public/                       # Static assets
├── next.config.js               # Next.js config (web)
├── next.config.tauri.js        # Next.js config (Tauri build)
├── package.json                 # Node.js dependencies
└── README.md                    # This file
```

## 🔒 Security Notes

- **Local Storage**: All credentials are stored locally on your machine
- **Encryption**: Credentials are encrypted at rest using AES-GCM (web) or Tauri's secure store (desktop)
- **No External Servers**: No credentials are sent to external servers except your S3 endpoints
- **Master Password**: Web version uses a master password for additional encryption layer
- **Secure by Default**: Desktop app uses Tauri's secure storage plugin

## 🧪 Development Scripts

| Command | Description |
|--------|-------------|
| `pnpm run dev` | Start Next.js dev server (web) |
| `pnpm run build` | Build Next.js for production |
| `pnpm run start` | Start Next.js production server |
| `pnpm run tauri:dev` | Run Tauri app in development |
| `pnpm run tauri:build` | Build Tauri app for production |
| `pnpm run build:tauri` | Build Next.js static export for Tauri |

## 🌐 Environment Variables

Create a `.env` file in the root directory (optional):

```env
# Next.js Configuration
# For production, API routes are on the same origin (no need to set this)
# For development, the dev server runs on port 1420 (for Tauri compatibility)
NEXT_PUBLIC_API_URL=http://localhost:1420
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - For the amazing desktop framework
- [Next.js](https://nextjs.org/) - For the web framework
- [Shadcn UI](https://ui.shadcn.com/) - For the beautiful UI components
- [AWS SDK](https://aws.amazon.com/sdk-for-javascript/) - For S3 integration

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Include your OS version, Node.js version, and error messages

---

Made with ❤️ using Tauri, Next.js, and React
